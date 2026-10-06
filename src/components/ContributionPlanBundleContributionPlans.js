import React, { Fragment } from "react";
import { injectIntl } from 'react-intl';
import { withModulesManager, FormattedMessage, formatMessage, formatMessageWithValues, formatDateFromISO, Table,
    PublishedComponent, withTooltip, coreConfirm, journalize, PagedDataHandler, decodeId } from "@openimis/fe-core";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { fetchContributionPlanBundleContributionPlans, deleteContributionPlanBundleContributionPlan } from "../actions"
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { Paper, IconButton, Grid, Typography, Divider } from "@material-ui/core";
import DeleteIcon from '@material-ui/icons/Delete';
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";
import CreateContributionPlanBundleDetailsDialog from "../dialogs/CreateContributionPlanBundleDetailsDialog";
import UpdateContributionPlanBundleDetailsDialog from "../dialogs/UpdateContributionPlanBundleDetailsDialog";

const styles = theme => ({
    tableTitle: theme.table.title,
    paper: theme.paper.paper,
    paperHeader: theme.paper.paperHeader,
    paperHeaderAction: theme.paper.action,
    item: theme.paper.item
});

class ContributionPlanBundleContributionPlans extends PagedDataHandler {
    constructor(props) {
        super(props);
        this.state = {
            toDelete: null,
            deleted: []
        }
    }

    componentDidMount() {
        this.refetchContributionPlanBundleContributionPlans();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.submittingMutation && !this.props.submittingMutation) {
            this.setState(state => ({ deleted: state.deleted.concat(state.toDelete) }));
            this.refetchContributionPlanBundleContributionPlans();
        } else if (prevProps.confirmed !== this.props.confirmed && !!this.props.confirmed && !!this.state.confirmedAction) {
            this.state.confirmedAction();
        }
    }

    refetchContributionPlanBundleContributionPlans = () => this.onChangeRowsPerPage(DEFAULT_PAGE_SIZE);

    queryPrms = () => {
        let params = [];
        if (!!this.props.contributionPlanBundleId) {
            params.push("isDeleted: false");
            params.push(`contributionPlanBundle_Id: "${this.props.contributionPlanBundleId}"`);
            return params;
        }
        return null;
    }

    headers = [
        "contributionPlan.code",
        "contributionPlan.name",
        "contributionPlan.benefitPlan",
        "contributionPlan.dateValidFrom",
        "contributionPlan.dateValidTo",
        "contributionPlan.emptyLabel",
        "contributionPlan.emptyLabel",
        "contributionPlan.emptyLabel"
    ];

    itemFormatters = [
        contributionPlanBundleContributionPlan =>
            !!contributionPlanBundleContributionPlan.contributionPlan && !!contributionPlanBundleContributionPlan.contributionPlan.code
                ? contributionPlanBundleContributionPlan.contributionPlan.code
                : "",
        contributionPlanBundleContributionPlan =>
            !!contributionPlanBundleContributionPlan.contributionPlan && !!contributionPlanBundleContributionPlan.contributionPlan.name
                ? contributionPlanBundleContributionPlan.contributionPlan.name
                : "",
        contributionPlanBundleContributionPlan =>
            <PublishedComponent
                pubRef="product.ProductPicker"
                withNull={true}
                withLabel={false}
                value={
                    !!contributionPlanBundleContributionPlan.contributionPlan 
                        ? contributionPlanBundleContributionPlan.contributionPlan.benefitPlan 
                        : null
                }
                readOnly
            />,
        contributionPlanBundleContributionPlan => !!contributionPlanBundleContributionPlan.dateValidFrom
            ? formatDateFromISO(this.props.modulesManager, this.props.intl, contributionPlanBundleContributionPlan.dateValidFrom)
            : "",
        contributionPlanBundleContributionPlan => !!contributionPlanBundleContributionPlan.dateValidTo
            ? formatDateFromISO(this.props.modulesManager, this.props.intl, contributionPlanBundleContributionPlan.dateValidTo)
            : "",
        contributionPlanBundleContributionPlan => 
            <UpdateContributionPlanBundleDetailsDialog
                contributionPlanBundleContributionPlan={contributionPlanBundleContributionPlan}
                isReplacing={true}
                disabled={this.isReplaced(contributionPlanBundleContributionPlan)}
            />,
        contributionPlanBundleContributionPlan => 
            <UpdateContributionPlanBundleDetailsDialog
                contributionPlanBundleContributionPlan={contributionPlanBundleContributionPlan}
                disabled={this.isReplaced(contributionPlanBundleContributionPlan)}
            />,
        contributionPlanBundleContributionPlan => withTooltip(
            <IconButton
                onClick={() => this.onDelete(contributionPlanBundleContributionPlan)}
                disabled={this.state.deleted.includes(contributionPlanBundleContributionPlan.id)}>
                <DeleteIcon />
            </IconButton>,
            formatMessage(this.props.intl, "contributionPlan", "deleteButton.tooltip")
        )
    ];

    onDelete = contributionPlanBundleContributionPlan => {
        const { intl, coreConfirm, deleteContributionPlanBundleContributionPlan } = this.props;
        let confirm = () => coreConfirm(
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlan.confirm.title", { label: contributionPlanBundleContributionPlan.contributionPlan.name }),
            formatMessageWithValues(intl, "contributionPlan", "deleteContributionPlan.confirm.message", { label: contributionPlanBundleContributionPlan.contributionPlan.name }),
            null,
            "warning"
        );
        let confirmedAction = () => {
            deleteContributionPlanBundleContributionPlan(
                contributionPlanBundleContributionPlan,
                formatMessageWithValues(
                    intl,
                    "contributionPlan",
                    "DeleteContributionPlanBundleDetails.mutationLabel",
                    { 
                        contributionPlan: contributionPlanBundleContributionPlan.contributionPlan.name,
                        contributionPlanBundle: contributionPlanBundleContributionPlan.contributionPlanBundle.name
                    }
                )
            );
            this.setState({ toDelete: contributionPlanBundleContributionPlan.id });
        }
        this.setState(
            { confirmedAction },
            confirm
        )
    }

    isReplaced = contributionPlanBundleContributionPlan => !!contributionPlanBundleContributionPlan.replacementUuid;

    isRowDeleted = contributionPlanBundleContributionPlan => this.state.deleted.includes(contributionPlanBundleContributionPlan.id);

    renderActions = isNew => {
        const { classes, edited, contributionPlanBundleId } = this.props;
        return (
            <Fragment>
                <Grid item xs={8}>
                    {isNew && (
                        <Grid item className={classes.item}>
                            <Typography>
                                <FormattedMessage module="contributionPlan" id="contributionPlanBundle.contributionPlansAttachedPanel.error" />
                            </Typography>
                        </Grid>
                    )}
                </Grid>
                <Grid item xs={4}>
                    <Grid container justify="flex-end" alignItems="center">
                        <Grid item>
                            <Typography>
                                <FormattedMessage module="contributionPlan" id="contributionPlanBundle.contributionPlansAttachedPanel.createContributionPlan" />
                            </Typography>
                        </Grid>
                        <Grid item className={classes.paperHeaderAction}>
                            <CreateContributionPlanBundleDetailsDialog
                                disabled={isNew}
                                contributionPlanBundle={edited}
                                contributionPlanBundleId={contributionPlanBundleId}
                            />
                        </Grid>
                    </Grid>
                </Grid>
            </Fragment>
        )
    }

    render() {
        const { classes, contributionPlanBundleId, fetchingContributionPlanBundleContributionPlans, errorContributionPlanBundleContributionPlans,
            contributionPlanBundleContributionPlans, contributionPlanBundleContributionPlansPageInfo, contributionPlanBundleContributionPlansTotalCount } = this.props;
        const isNew = !contributionPlanBundleId;
        return (
            <Paper className={classes.paper}>
                <Grid container alignItems="center" direction="row" className={classes.paperHeader}>
                    <Grid item xs={12}>
                        <Typography className={classes.tableTitle}>
                            <FormattedMessage module="contributionPlan" id="contributionPlanBundle.contributionPlansAttachedPanel.title" values={{ count: isNew ? 0 : contributionPlanBundleContributionPlansTotalCount }} />
                        </Typography>
                    </Grid>
                    {this.renderActions(isNew)}
                    <Grid item xs={12}>
                        <Divider />
                    </Grid>
                </Grid>
                <Table
                    module="contributionPlan"
                    headers={this.headers}
                    itemFormatters={this.itemFormatters}
                    items={isNew ? [] : contributionPlanBundleContributionPlans}
                    fetching={isNew ? false : fetchingContributionPlanBundleContributionPlans}
                    error={isNew ? null : errorContributionPlanBundleContributionPlans}
                    withPagination={true}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                    page={this.currentPage()}
                    pageSize={this.currentPageSize()}
                    pageInfo={isNew ? {} : contributionPlanBundleContributionPlansPageInfo}
                    count={isNew ? 0 : contributionPlanBundleContributionPlansTotalCount}
                    onChangePage={this.onChangePage}
                    onChangeRowsPerPage={this.onChangeRowsPerPage}
                    rowLocked={this.isRowDeleted}
                    rowDisabled={this.isRowDeleted}
                />
            </Paper>
        )
    }    
}

const mapStateToProps = state => ({
    fetchingContributionPlanBundleContributionPlans: state.contributionPlan.fetchingContributionPlanBundleContributionPlans,
    fetchedContributionPlanBundleContributionPlans: state.contributionPlan.fetchedContributionPlanBundleContributionPlans,
    errorContributionPlanBundleContributionPlans: state.contributionPlan.errorContributionPlanBundleContributionPlans,
    contributionPlanBundleContributionPlans: state.contributionPlan.contributionPlanBundleContributionPlans,
    contributionPlanBundleContributionPlansPageInfo: state.contributionPlan.contributionPlanBundleContributionPlansPageInfo,
    contributionPlanBundleContributionPlansTotalCount: state.contributionPlan.contributionPlanBundleContributionPlansTotalCount,
    confirmed: state.core.confirmed,
    submittingMutation: state.contributionPlan.submittingMutation,
    mutation: state.contributionPlan.mutation
});

const mapDispatchToProps = dispatch => {
    return bindActionCreators({ fetch: fetchContributionPlanBundleContributionPlans, deleteContributionPlanBundleContributionPlan, coreConfirm, journalize }, dispatch);
};

export default withModulesManager(injectIntl(withTheme(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(ContributionPlanBundleContributionPlans)))));
