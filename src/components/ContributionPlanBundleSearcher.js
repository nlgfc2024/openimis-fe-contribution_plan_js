import React, { Component, Fragment } from "react"
import { injectIntl } from 'react-intl';
import { withModulesManager, formatMessage, formatMessageWithValues, formatDateFromISO, Searcher, withTooltip,
    coreConfirm, journalize } from "@openimis/fe-core";
import { fetchContributionPlanBundles, deleteContributionPlanBundle } from "../actions"
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import ContributionPlanBundleFilter from "./ContributionPlanBundleFilter"
import { RIGHT_CONTRIBUTION_PLAN_BUNDLE_UPDATE, RIGHT_CONTRIBUTION_PLAN_BUNDLE_DELETE, RIGHT_CONTRIBUTION_PLAN_BUNDLE_REPLACE, 
    DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants"
import { IconButton } from "@material-ui/core";
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';

class ContributionPlanBundleSearcher extends Component {
    constructor(props) {
        super(props);
        this.state = {
            toDelete: null,
            deleted: []
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.submittingMutation && !this.props.submittingMutation) {
            this.props.journalize(this.props.mutation);
            this.setState(state => ({ deleted: state.deleted.concat(state.toDelete) }));
        } else if (prevProps.confirmed !== this.props.confirmed && !!this.props.confirmed && !!this.state.confirmedAction) {
            this.state.confirmedAction();
        }
    }

    fetch = (params) => this.props.fetchContributionPlanBundles(params);

    headers = () => {
        const { rights } = this.props;
        let result = [
            "contributionPlan.code",
            "contributionPlan.name",
            "contributionPlan.periodicity",
            "contributionPlan.dateValidFrom",
            "contributionPlan.dateValidTo"
        ];
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_REPLACE)) {
            result.push("contributionPlan.emptyLabel");
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_UPDATE)) {
            result.push("contributionPlan.emptyLabel");
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_DELETE)) {
            result.push("contributionPlan.emptyLabel");
        }
        return result;
    }

    itemFormatters = () => {
        const { intl, modulesManager, rights, contributionPlanBundlePageLink, onReplace } = this.props;
        let result = [
            contributionPlanBundle => !!contributionPlanBundle.code ? contributionPlanBundle.code : "",
            contributionPlanBundle => !!contributionPlanBundle.name ? contributionPlanBundle.name : "",
            contributionPlanBundle => !!contributionPlanBundle.periodicity ? contributionPlanBundle.periodicity : "",
            contributionPlanBundle => !!contributionPlanBundle.dateValidFrom
                ? formatDateFromISO(modulesManager, intl, contributionPlanBundle.dateValidFrom)
                : "",
                contributionPlanBundle => !!contributionPlanBundle.dateValidTo
                ? formatDateFromISO(modulesManager, intl, contributionPlanBundle.dateValidTo)
                : ""
        ];
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_REPLACE)) {
            result.push(
                contributionPlanBundle => !this.isDeletedFilterEnabled(contributionPlanBundle) && withTooltip(
                    <div>
                        <IconButton
                            onClick={() => onReplace(contributionPlanBundle)}
                            disabled={this.state.deleted.includes(contributionPlanBundle.id) || this.isReplaced(contributionPlanBundle)}>
                            <NoteAddIcon />
                        </IconButton>
                    </div>,
                    formatMessage(intl, "contributionPlan", "replaceButton.tooltip")
                )
            );
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_UPDATE)) {
            result.push(
                contributionPlanBundle => !this.isDeletedFilterEnabled(contributionPlanBundle) && withTooltip(
                    <div>
                        <IconButton
                            href={contributionPlanBundlePageLink(contributionPlanBundle)}
                            onClick={e => e.stopPropagation() && onDoubleClick(contributionPlanBundle)}
                            disabled={this.state.deleted.includes(contributionPlanBundle.id) || this.isReplaced(contributionPlanBundle)}>
                            <EditIcon />
                        </IconButton>
                    </div>,
                    formatMessage(intl, "contributionPlan", "editButton.tooltip")
                )
            );
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_DELETE)) {
            result.push(
                contributionPlanBundle => !this.isDeletedFilterEnabled(contributionPlanBundle) && withTooltip(
                    <div>
                        <IconButton
                            onClick={() => this.onDelete(contributionPlanBundle)}
                            disabled={this.state.deleted.includes(contributionPlanBundle.id)}>
                            <DeleteIcon />
                        </IconButton>
                    </div>,
                    formatMessage(this.props.intl, "contributionPlan", "deleteButton.tooltip")
                )
            );
        }
        return result;
    }

    onDelete = contributionPlanBundle => {
        const { intl, coreConfirm, deleteContributionPlanBundle } = this.props;
        let confirm = () => coreConfirm(
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlanBundle.confirm.title", { label: contributionPlanBundle.name }),
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlan.confirm.message", { label: contributionPlanBundle.name }),
            null,
            "warning"
        );
        let confirmedAction = () => {
            deleteContributionPlanBundle(
                contributionPlanBundle,
                formatMessageWithValues(
                    intl,
                    "contributionPlan",
                    "DeleteContributionPlanBundle.mutationLabel",
                    { label: contributionPlanBundle.name }
                )
            );
            this.setState({ toDelete: contributionPlanBundle.id });
        }
        this.setState(
            { confirmedAction },
            confirm
        )
    }

    isReplaced = contributionPlanBundle => !!contributionPlanBundle.replacementUuid;

    isDeletedFilterEnabled = contributionPlanBundle => contributionPlanBundle.isDeleted;

    isRowDisabled = (_, contributionPlanBundle) => this.state.deleted.includes(contributionPlanBundle.id)
        && !this.isDeletedFilterEnabled(contributionPlanBundle);

    isOnDoubleClickEnabled = contributionPlanBundle => !this.state.deleted.includes(contributionPlanBundle.id)
        && !this.isDeletedFilterEnabled(contributionPlanBundle)
        && !this.isReplaced(contributionPlanBundle);

    sorts = () => [
        ['code', true],
        ['name', true],
        ['periodicity', true],
        ['dateValidFrom', true],
        ['dateValidTo', true]
    ];

    defaultFilters = () => {
        return {
            isDeleted: {
                value: false,
                filter: "isDeleted: false"
            },
            showHistory: {
                value: false,
                filter: "showHistory: false"
            },
            applyDefaultValidityFilter: {
                value: true,
                filter: "applyDefaultValidityFilter: true"
            }
        };
    }

    render() {
        const { intl, fetchingContributionPlanBundles, fetchedContributionPlanBundles, errorContributionPlanBundles,
            contributionPlanBundles, contributionPlanBundlesPageInfo, contributionPlanBundlesTotalCount, onDoubleClick } = this.props;
        return (
            <Fragment>
                <Searcher
                    module="contributionPlan"
                    FilterPane={ContributionPlanBundleFilter}
                    fetch={this.fetch}
                    items={contributionPlanBundles}
                    itemsPageInfo={contributionPlanBundlesPageInfo}
                    fetchingItems={fetchingContributionPlanBundles}
                    fetchedItems={fetchedContributionPlanBundles}
                    errorItems={errorContributionPlanBundles}
                    tableTitle={formatMessageWithValues(intl, "contributionPlan", "contributionPlanBundles.searcher.results.title", { contributionPlanBundlesTotalCount })}
                    headers={this.headers}
                    itemFormatters={this.itemFormatters}
                    sorts={this.sorts}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                    defaultOrderBy="code"
                    onDoubleClick={contributionPlanBundle => this.isOnDoubleClickEnabled(contributionPlanBundle) && onDoubleClick(contributionPlanBundle)}
                    rowDisabled={this.isRowDisabled}
                    rowLocked={this.isRowDisabled}
                    defaultFilters={this.defaultFilters()}
                />
            </Fragment>
        )
    }
}

const mapStateToProps = state => ({
    fetchingContributionPlanBundles: state.contributionPlan.fetchingContributionPlanBundles,
    fetchedContributionPlanBundles: state.contributionPlan.fetchedContributionPlanBundles,
    errorContributionPlanBundles: state.contributionPlan.errorContributionPlanBundles,
    contributionPlanBundles: state.contributionPlan.contributionPlanBundles,
    contributionPlanBundlesPageInfo: state.contributionPlan.contributionPlanBundlesPageInfo,
    contributionPlanBundlesTotalCount: state.contributionPlan.contributionPlanBundlesTotalCount,
    confirmed: state.core.confirmed,
    submittingMutation: state.contributionPlan.submittingMutation,
    mutation: state.contributionPlan.mutation
});

const mapDispatchToProps = dispatch => {
    return bindActionCreators({ fetchContributionPlanBundles, deleteContributionPlanBundle, coreConfirm, journalize }, dispatch);
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(ContributionPlanBundleSearcher)));
