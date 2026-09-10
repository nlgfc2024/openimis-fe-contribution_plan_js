import React, { Component } from "react";
import { bindActionCreators } from "redux";
import {
  withModulesManager,
  formatMessage,
  historyPush,
  decodeId,
  Helmet,
  clearCurrentPaginationPage,
} from "@openimis/fe-core";
import { injectIntl } from "react-intl";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { connect } from "react-redux";
import {
  RIGHT_PAYMENT_PLAN_SEARCH,
  RIGHT_PAYMENT_PLAN_UPDATE,
  RIGHT_PAYMENT_PLAN_REPLACE,
  MODULE_NAME,
} from "../constants";
import PaymentPlanSearcher from "../components/PaymentPlanSearcher";

const styles = (theme) => ({
  page: theme.page,
});

class PaymentPlansPage extends Component {
  paymentPlanPageLink = (paymentPlan) =>
    `${this.props.modulesManager.getRef("contributionPlan.route.paymentPlan")}${
      "/" + decodeId(paymentPlan.id)
    }`;

  onDoubleClick = (paymentPlan, newTab = false) => {
    const { rights, modulesManager, history } = this.props;
    if (rights.includes(RIGHT_PAYMENT_PLAN_UPDATE)) {
      historyPush(
        modulesManager,
        history,
        "contributionPlan.route.paymentPlan",
        [decodeId(paymentPlan.id)],
        newTab
      );
    }
  };

  onReplace = (paymentPlan) => {
    const { rights, modulesManager, history } = this.props;
    if (rights.includes(RIGHT_PAYMENT_PLAN_REPLACE)) {
      historyPush(
        modulesManager,
        history,
        "contributionPlan.route.replacePaymentPlan",
        [decodeId(paymentPlan.id)]
      );
    }
  };

  componentDidMount = () => {
    const { module } = this.props;
    if (module !== MODULE_NAME) this.props.clearCurrentPaginationPage();
  };

  componentWillUnmount = () => {
    const { location, history } = this.props;
    const {
      location: { pathname },
    } = history;
    const urlPath = location.pathname;
    if (!pathname.includes(urlPath)) this.props.clearCurrentPaginationPage();
  };

  render() {
    const { intl, classes, rights } = this.props;
    return (
      rights.includes(RIGHT_PAYMENT_PLAN_SEARCH) && (
        <div className={classes.page}>
          <Helmet
            title={formatMessage(
              this.props.intl,
              "paymentPlan",
              "paymentPlans.page.title"
            )}
          />
          <PaymentPlanSearcher
            history={this.props.history}
            onDoubleClick={this.onDoubleClick}
            onReplace={this.onReplace}
            paymentPlanPageLink={this.paymentPlanPageLink}
            rights={rights}
          />
        </div>
      )
    );
  }
}

const mapStateToProps = (state) => ({
  rights:
    !!state.core && !!state.core.user && !!state.core.user.i_user
      ? state.core.user.i_user.rights
      : [],
  module: state.core?.savedPagination?.module,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ clearCurrentPaginationPage }, dispatch);

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(PaymentPlansPage)
      )
    )
  )
);
