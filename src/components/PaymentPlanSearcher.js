import React, { Component, Fragment } from "react";
import { injectIntl } from "react-intl";
import {
    withModulesManager,
    formatMessage,
    formatMessageWithValues,
    formatDateFromISO,
    historyPush,
    Searcher,
    withTooltip,
    coreConfirm,
    journalize,
    PublishedComponent,
    Contributions
} from "@openimis/fe-core";
import { fetchPaymentPlans, deletePaymentPlan } from "../actions";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import PaymentPlanFilter from "./PaymentPlanFilter";
import { IconButton } from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from "@material-ui/icons/Delete";
import { isEmptyObject } from "../utils";
import {
    ROWS_PER_PAGE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    RIGHT_PAYMENT_PLAN_CREATE,
    RIGHT_PAYMENT_PLAN_DELETE,
    RIGHT_PAYMENT_PLAN_UPDATE,
    RIGHT_PAYMENT_PLAN_REPLACE,
    PAYMENT_PLAN_TYPE,
    CONTRIBUTIONPLAN_CALCULATIONRULE_CONTRIBUTION_KEY
} from "../constants";

class PaymentPlanSearcher extends Component {
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

    fetch = params => this.props.fetchPaymentPlans(this.props.modulesManager, params);

    onCreate = () => historyPush(this.props.modulesManager, this.props.history, "contributionPlan.route.paymentPlan");

    searcherActions = () => {
        const { intl, rights } = this.props;
        return [
            {
                label: formatMessage(intl, "paymentPlan", "paymentPlan.createButton.label"),
                icon: <AddIcon />,
                authorized: rights.includes(RIGHT_PAYMENT_PLAN_CREATE),
                onClick: this.onCreate,
                variant: "contained",
            },
        ];
    }

    headers = () => {
        const { rights } = this.props;
        let result = [
            "paymentPlan.code",
            "paymentPlan.name",
            "paymentPlan.calculation",
            "paymentPlan.benefitPlan",
            "paymentPlan.periodicity",
            "paymentPlan.dateValidFrom",
            "paymentPlan.dateValidTo"
        ];
        if (rights.includes(RIGHT_PAYMENT_PLAN_REPLACE)) {
            result.push("paymentPlan.emptyLabel");
        }
        if (rights.includes(RIGHT_PAYMENT_PLAN_UPDATE)) {
            result.push("paymentPlan.emptyLabel");
        }
        if (rights.includes(RIGHT_PAYMENT_PLAN_DELETE)) {
            result.push("paymentPlan.emptyLabel");
        }
        return result;
    }

    itemFormatters = () => {
        const { intl, rights, modulesManager, paymentPlanPageLink, onReplace } = this.props;
        let result = [
            paymentPlan => !!paymentPlan.code ? paymentPlan.code : "",
            paymentPlan => !!paymentPlan.name ? paymentPlan.name : "",
            paymentPlan => !!paymentPlan.calculation 
                ? <Contributions
                    contributionKey={CONTRIBUTIONPLAN_CALCULATIONRULE_CONTRIBUTION_KEY}
                    value={paymentPlan.calculation}
                    readOnly
                /> : "",
            paymentPlan => {
                const objectBenefitPlan = typeof paymentPlan.benefitPlan === 'object' ? 
                  paymentPlan.benefitPlan : JSON.parse(paymentPlan.benefitPlan || '{}');
                paymentPlan.benefitPlan = objectBenefitPlan;
                return (
                  !!paymentPlan.benefitPlan
                    ? <PublishedComponent
                    pubRef={paymentPlan.benefitPlanTypeName === PAYMENT_PLAN_TYPE.PRODUCT
                      ? "product.ProductPicker"
                      : "socialProtection.BenefitPlanPicker"}
                    withNull={true}
                    label={formatMessage(intl, "paymentPlan", "benefitPlan")}
                    required
                    value={
                      paymentPlan.benefitPlan !== undefined 
                      && paymentPlan.benefitPlan !== null ? (isEmptyObject(paymentPlan.benefitPlan) 
                      ? null : paymentPlan.benefitPlan) : null
                    }
                    readOnly
                  />: "")
                },
            paymentPlan => !!paymentPlan.periodicity ? paymentPlan.periodicity : "",
            paymentPlan => !!paymentPlan.dateValidFrom
                ? formatDateFromISO(modulesManager, intl, paymentPlan.dateValidFrom)
                : "",
            paymentPlan => !!paymentPlan.dateValidTo
                ? formatDateFromISO(modulesManager, intl, paymentPlan.dateValidTo)
                : ""
        ];
        if (rights.includes(RIGHT_PAYMENT_PLAN_REPLACE)) {
            result.push(
                paymentPlan => !this.isDeletedFilterEnabled(paymentPlan) && withTooltip(
                    <div>
                        <IconButton
                            onClick={() => onReplace(paymentPlan)}
                            disabled={this.state.deleted.includes(paymentPlan.id) || this.isReplaced(paymentPlan)}>
                            <NoteAddIcon />
                        </IconButton>
                    </div>,
                    formatMessage(intl, "paymentPlan", "replaceButton.tooltip")
                )
            );
        }
        if (rights.includes(RIGHT_PAYMENT_PLAN_UPDATE)) {
            result.push(
                paymentPlan => !this.isDeletedFilterEnabled(paymentPlan) && withTooltip(
                    <div>
                        <IconButton
                            href={paymentPlanPageLink(paymentPlan)}
                            onClick={e => e.stopPropagation() && onDoubleClick(paymentPlan)}
                            disabled={this.state.deleted.includes(paymentPlan.id) || this.isReplaced(paymentPlan)}>
                            <EditIcon />
                        </IconButton>
                    </div>,
                    formatMessage(intl, "paymentPlan", "editButton.tooltip")
                )
            );
        }
        if (rights.includes(RIGHT_PAYMENT_PLAN_DELETE)) {
            result.push(
                paymentPlan => !this.isDeletedFilterEnabled(paymentPlan) && withTooltip(
                    <div>
                        <IconButton
                            onClick={() => this.onDelete(paymentPlan)}
                            disabled={this.state.deleted.includes(paymentPlan.id)}>
                            <DeleteIcon />
                        </IconButton>
                    </div>,
                    formatMessage(this.props.intl, "paymentPlan", "deleteButton.tooltip")
                )
            );
        }
        return result;
    }

    onDelete = paymentPlan => {
        const { intl, coreConfirm, deletePaymentPlan } = this.props;
        let confirm = () => coreConfirm(
            formatMessageWithValues(intl, "paymentPlan", "deletePaymentPlan.confirm.title", { label: paymentPlan.name }),
            formatMessageWithValues(intl, "paymentPlan", "deletePaymentPlan.confirm.message", { label: paymentPlan.name })
        );
        let confirmedAction = () => {
            deletePaymentPlan(
                paymentPlan,
                formatMessageWithValues(
                    intl,
                    "paymentPlan",
                    "deletePaymentPlan.mutationLabel",
                    { label: paymentPlan.name }
                )
            );
            this.setState({ toDelete: paymentPlan.id });
        }
        this.setState(
            { confirmedAction },
            confirm
        )
    }

    isReplaced = paymentPlan => !!paymentPlan.replacementUuid;

    isDeletedFilterEnabled = paymentPlan => paymentPlan.isDeleted;

    isRowDisabled = (_, paymentPlan) => this.state.deleted.includes(paymentPlan.id) && !this.isDeletedFilterEnabled(paymentPlan);

    isOnDoubleClickEnabled = paymentPlan => !this.state.deleted.includes(paymentPlan.id) 
        && !this.isDeletedFilterEnabled(paymentPlan)
        && !this.isReplaced(paymentPlan);
    
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
        const { intl, fetchingPaymentPlans, fetchedPaymentPlans, errorPaymentPlans,
            paymentPlans, paymentPlansPageInfo, paymentPlansTotalCount, onDoubleClick } = this.props;
        return (
            <Fragment>
                <Searcher
                    module="contributionPlan"
                    FilterPane={PaymentPlanFilter}
                    fetch={this.fetch}
                    items={paymentPlans}
                    itemsPageInfo={paymentPlansPageInfo}
                    fetchingItems={fetchingPaymentPlans}
                    fetchedItems={fetchedPaymentPlans}
                    errorItems={errorPaymentPlans}
                    tableTitle={formatMessageWithValues(intl, "contributionPlan", "paymentPlans.searcher.results.title", { paymentPlansTotalCount })}
                    headers={this.headers}
                    itemFormatters={this.itemFormatters}
                    sorts={this.sorts}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    defaultPageSize={DEFAULT_PAGE_SIZE}
                    defaultOrderBy="code"
                    onDoubleClick={paymentPlan => this.isOnDoubleClickEnabled(paymentPlan) && onDoubleClick(paymentPlan)}
                    rowDisabled={this.isRowDisabled}
                    rowLocked={this.isRowDisabled}
                    defaultFilters={this.defaultFilters()}
                    enableActionButtons
                    searcherActionsPosition="header-right"
                    searcherActions={this.searcherActions()}
                />
            </Fragment>
        )
    }
}

const mapStateToProps = state => ({
    fetchingPaymentPlans: state.contributionPlan.fetchingPaymentPlans,
    fetchedPaymentPlans: state.contributionPlan.fetchedPaymentPlans,
    errorPaymentPlans: state.contributionPlan.errorPaymentPlans,
    paymentPlans: state.contributionPlan.paymentPlans,
    paymentPlansPageInfo: state.contributionPlan.paymentPlansPageInfo,
    paymentPlansTotalCount: state.contributionPlan.paymentPlansTotalCount,
    confirmed: state.core.confirmed,
    submittingMutation: state.contributionPlan.submittingMutation,
    mutation: state.contributionPlan.mutation
});

const mapDispatchToProps = dispatch => {
    return bindActionCreators({ fetchPaymentPlans, coreConfirm, deletePaymentPlan, journalize }, dispatch);
};

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PaymentPlanSearcher)));
