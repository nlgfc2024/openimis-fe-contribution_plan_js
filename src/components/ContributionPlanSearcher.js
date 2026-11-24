import React, { Component, Fragment } from "react";
import { injectIntl } from "react-intl";
import {
    withModulesManager,
    formatMessage,
    formatMessageWithValues,
    formatDateFromISO,
    Searcher,
    withTooltip,
    coreConfirm,
    journalize,
    Contributions
} from "@openimis/fe-core";
import { fetchContributionPlans, deleteContributionPlan } from "../actions";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import ContributionPlanFilter from "./ContributionPlanFilter";
import { Button } from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import {
    RIGHT_CONTRIBUTION_PLAN_UPDATE,
    RIGHT_CONTRIBUTION_PLAN_DELETE,
    ROWS_PER_PAGE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    CONTRIBUTIONPLAN_CALCULATIONRULE_CONTRIBUTION_KEY
} from "../constants";

class ContributionPlanSearcher extends Component {
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

    fetch = params => this.props.fetchContributionPlans(this.props.modulesManager, params);

    headers = () => {
        const { rights } = this.props;
        let result = [
            "contributionPlan.code",
            "contributionPlan.name",
            "contributionPlan.calculation",
            "contributionPlan.benefitPlan",
            "contributionPlan.periodicity",
            "contributionPlan.dateValidFrom",
            "contributionPlan.dateValidTo"
        ];
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_UPDATE)) {
            result.push("contributionPlan.emptyLabel");
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_DELETE)) {
            result.push("contributionPlan.emptyLabel");
        }
        return result;
    }

    itemFormatters = () => {
        const { intl, modulesManager, rights, contributionPlanPageLink } = this.props;
        let result = [
            contributionPlan => !!contributionPlan.code ? contributionPlan.code : "",
            contributionPlan => !!contributionPlan.name ? contributionPlan.name : "",
            contributionPlan => !!contributionPlan.calculation 
                ? <Contributions
                    contributionKey={CONTRIBUTIONPLAN_CALCULATIONRULE_CONTRIBUTION_KEY}
                    value={contributionPlan.calculation}
                    readOnly
                /> : "",
            contributionPlan => !!contributionPlan.benefitPlan
                ? `${contributionPlan.benefitPlan.code} ${contributionPlan.benefitPlan.name}` : "",
            contributionPlan => !!contributionPlan.periodicity ? contributionPlan.periodicity : "",
            contributionPlan => !!contributionPlan.dateValidFrom
                ? formatDateFromISO(modulesManager, intl, contributionPlan.dateValidFrom)
                : "",
            contributionPlan => !!contributionPlan.dateValidTo
                ? formatDateFromISO(modulesManager, intl, contributionPlan.dateValidTo)
                : ""
        ];
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_UPDATE)) {
            result.push(
                contributionPlan => !this.isDeletedFilterEnabled(contributionPlan) && withTooltip(
                    <Button
                        href={contributionPlanPageLink(contributionPlan)}
                        onClick={e => e.stopPropagation() && onDoubleClick(contributionPlan)}
                        disabled={this.state.deleted.includes(contributionPlan.id)}
                        startIcon={<EditIcon />}
                    >
                        {formatMessage(intl, "contributionPlan", "editButton.buttonText")}
                    </Button>
                )
            );
        }
        if (rights.includes(RIGHT_CONTRIBUTION_PLAN_DELETE)) {
            result.push(
                contributionPlan => !this.isDeletedFilterEnabled(contributionPlan) && withTooltip(
                    <Button
                        onClick={() => this.onDelete(contributionPlan)}
                        disabled={this.state.deleted.includes(contributionPlan.id)}
                        startIcon={<DeleteIcon />}
                    >
                        {formatMessage(this.props.intl, "contributionPlan", "deleteButton.buttonText")}
                    </Button>,
                    formatMessage(this.props.intl, "contributionPlan", "deleteButton.tooltip")
                )
            );
        }
        return result;
    }

    onDelete = contributionPlan => {
        const { intl, coreConfirm, deleteContributionPlan } = this.props;
        let confirm = () => coreConfirm(
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlan.confirm.title", { label: contributionPlan.name }),
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlan.confirm.message", { label: contributionPlan.name }),
            null,
            "warning"
        );
        let confirmedAction = () => {
            deleteContributionPlan(
                contributionPlan,
                formatMessageWithValues(
                    intl,
                    "contributionPlan",
                    "DeleteContributionPlan.mutationLabel",
                    { label: contributionPlan.name }
                )
            );
            this.setState({ toDelete: contributionPlan.id });
        }
        this.setState(
            { confirmedAction },
            confirm
        )
    }

    isDeletedFilterEnabled = contributionPlan => contributionPlan.isDeleted;

    isRowDisabled = (_, contributionPlan) => this.state.deleted.includes(contributionPlan.id) && !this.isDeletedFilterEnabled(contributionPlan);

    isOnDoubleClickEnabled = contributionPlan => !this.state.deleted.includes(contributionPlan.id) && !this.isDeletedFilterEnabled(contributionPlan);
    
    sorts = () => [
        ['code', true],
        ['name', true],
        ['calculation', true],
        ['benefitPlan', true],
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
        const { intl, fetchingContributionPlans, fetchedContributionPlans, errorContributionPlans,
            contributionPlans, contributionPlansPageInfo, contributionPlansTotalCount, onDoubleClick } = this.props;
        return (
            <Fragment>
                <Searcher
                    module="contributionPlan"
                    FilterPane={ContributionPlanFilter}
                    fetch={this.fetch}
                    items={contributionPlans}
                    itemsPageInfo={contributionPlansPageInfo}
                    fetchingItems={fetchingContributionPlans}
                    fetchedItems={fetchedContributionPlans}
                    errorItems={errorContributionPlans}
                    tableTitle={formatMessageWithValues(intl, "contributionPlan", "contributionPlans.searcher.results.title", { contributionPlansTotalCount })}
                    headers={this.headers}
                    itemFormatters={this.itemFormatters}
                    sorts={this.sorts}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                    defaultOrderBy="code"
                    onDoubleClick={contributionPlan => this.isOnDoubleClickEnabled(contributionPlan) && onDoubleClick(contributionPlan)}
                    rowDisabled={this.isRowDisabled}
                    rowLocked={this.isRowDisabled}
                    defaultFilters={this.defaultFilters()}
                />
            </Fragment>
        )
    }
}

const mapStateToProps = state => ({
    fetchingContributionPlans: state.contributionPlan.fetchingContributionPlans,
    fetchedContributionPlans: state.contributionPlan.fetchedContributionPlans,
    errorContributionPlans: state.contributionPlan.errorContributionPlans,
    contributionPlans: state.contributionPlan.contributionPlans,
    contributionPlansPageInfo: state.contributionPlan.contributionPlansPageInfo,
    contributionPlansTotalCount: state.contributionPlan.contributionPlansTotalCount,
    confirmed: state.core.confirmed,
    submittingMutation: state.contributionPlan.submittingMutation,
    mutation: state.contributionPlan.mutation
});

const mapDispatchToProps = dispatch => {
    return bindActionCreators({ fetchContributionPlans, coreConfirm, deleteContributionPlan, journalize }, dispatch);
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(ContributionPlanSearcher)));
