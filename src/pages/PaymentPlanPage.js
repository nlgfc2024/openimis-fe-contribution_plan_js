import React, { Component } from "react"
import { withModulesManager, withHistory, historyPush, formatMessage, formatMessageWithValues, coreAlert } from "@openimis/fe-core";
import { injectIntl } from "react-intl";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { createPaymentPlan, updatePaymentPlan } from "../actions"
import PaymentPlanForm from "../components/PaymentPlanForm"
import { RIGHT_PAYMENT_PLAN_CREATE, RIGHT_PAYMENT_PLAN_UPDATE } from "../constants"

const styles = theme => ({
    page: theme.page,
});

class PaymentPlanPage extends Component {
    back = () => {
        historyPush(this.props.modulesManager, this.props.history, "contributionPlan.route.paymentPlans")
    }

    save = paymentPlan => {
        if (!!paymentPlan.id) {
            this.props.updatePaymentPlan(
                paymentPlan,
                formatMessageWithValues(
                    this.props.intl,
                    "paymentPlan",
                    "UpdatePaymentPlan.mutationLabel",
                    this.titleParams(paymentPlan)
                )
            );
        } else {
            this.props.createPaymentPlan(
                paymentPlan,
                formatMessageWithValues(
                    this.props.intl,
                    "paymentPlan",
                    "CreatePaymentPlan.mutationLabel",
                    this.titleParams(paymentPlan)
                )
            );
        }
    }

    componentDidUpdate = prevProps => {
        const {
            paymentPlanId,
            submittingMutation,
            mutation,
            coreAlert,
            intl,
        } = this.props;
        if (
            !paymentPlanId &&
            prevProps.submittingMutation &&
            !submittingMutation &&
            mutation?.id
        ) {
            coreAlert(
                formatMessage(intl, "paymentPlan", "alert.success"),
                formatMessage(intl, "paymentPlan", "create.success"),
            );
            this.back();
        }
    }

    titleParams = paymentPlan => ({ label: !!paymentPlan.name ? paymentPlan.name : null });

    render() {
        const { classes, rights, paymentPlanId } = this.props;
        return (
            rights.includes(RIGHT_PAYMENT_PLAN_CREATE) && rights.includes(RIGHT_PAYMENT_PLAN_UPDATE) && (
                <div className={classes.page}>
                    <PaymentPlanForm
                        paymentPlanId={paymentPlanId}
                        back={this.back}
                        save={this.save}
                        titleParams={this.titleParams}
                    />
                </div>
            )
        )
    }
}

const mapStateToProps = (state, props) => ({
    rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
    paymentPlanId: props.match.params.paymentplan_id,
    submittingMutation: state.contributionPlan.submittingMutation,
    mutation: state.contributionPlan.mutation,
});

const mapDispatchToProps = dispatch => {
    return bindActionCreators({ createPaymentPlan, updatePaymentPlan, coreAlert }, dispatch);
};

export default withHistory(withModulesManager(injectIntl(withTheme(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(PaymentPlanPage))))));
