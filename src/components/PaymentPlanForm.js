import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Form,
  withModulesManager,
  withHistory,
  formatMessage,
  formatMessageWithValues,
  Helmet,
  journalize,
  parseData,
} from "@openimis/fe-core";
import { injectIntl } from "react-intl";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import PaymentPlanHeadPanel from "./PaymentPlanHeadPanel";
import { fetchPaymentPlan, clearPaymentPlan, fetchPaymentPlanMutation } from "../actions";
import { MAX_PERIODICITY_VALUE, MIN_PERIODICITY_VALUE } from "../constants";
import _ from "lodash";

const styles = theme => ({
  paper: theme.paper.paper,
  paperHeader: theme.paper.header,
  paperHeaderAction: theme.paper.action,
  item: theme.paper.item,
  lockedPage: theme.page.locked,
});

const PaymentPlanForm = ({
  intl,
  back,
  paymentPlanId,
  save,
  isReplacing = false,
  classes,
  modulesManager,
  fetchPaymentPlan,
  clearPaymentPlan,
  fetchPaymentPlanMutation,
  fetchedPaymentPlan,
  paymentPlan: propsPaymentPlan,
  submittingMutation,
  mutation,
  journalize,
  titleParams: propsTitleParams,
}) => {
  const [paymentPlan, setPaymentPlan] = useState({});
  const [jsonExtValid, setJsonExtValidState] = useState(true);
  const [requiredValid, setRequiredValidState] = useState(false);
  const [clientMutationId, setClientMutationId] = useState(null);

  const prevSubmittingMutationRef = useRef();

  useEffect(() => {
    if (!!paymentPlanId) {
      fetchPaymentPlan(modulesManager, paymentPlanId);
    } else {
      clearPaymentPlan();
      setPaymentPlan({});
    }
  }, [paymentPlanId, modulesManager, fetchPaymentPlan, clearPaymentPlan]);

  useEffect(() => {
    if (!!fetchedPaymentPlan && !!paymentPlanId && propsPaymentPlan) {
      setPaymentPlan(propsPaymentPlan);
    }
  }, [fetchedPaymentPlan, propsPaymentPlan, paymentPlanId]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      if (mutation?.id) {
        setClientMutationId(mutation.clientMutationId);
      }
    }
    prevSubmittingMutationRef.current = submittingMutation;
  }, [submittingMutation, mutation, journalize]);

  useEffect(() => {
    if (paymentPlanId || !clientMutationId) return undefined;

    let cancelled = false;

    const waitForSuccessfulCreation = async () => {
      for (let attempt = 0; attempt < 60 && !cancelled; attempt += 1) {
        const response = await fetchPaymentPlanMutation(clientMutationId);
        const result = parseData(response?.payload?.data?.mutationLogs)?.[0];

        if (cancelled) return;
        if (result?.status === 2) {
          back();
          return;
        }
        if (result?.status === 1) {
          setClientMutationId(null);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    waitForSuccessfulCreation();
    return () => { cancelled = true; };
  }, [paymentPlanId, clientMutationId, fetchPaymentPlanMutation, back]);

  const isMandatoryFieldsEmpty = useCallback(() =>
    !(
      !!paymentPlan.name &&
      !!paymentPlan.benefitPlanTypeName &&
      !!paymentPlan.calculation &&
      !!paymentPlan.benefitPlan &&
      !!paymentPlan.periodicity &&
      !!paymentPlan.dateValidFrom
    ),
    [paymentPlan]
  );

  const isPeriodicityValid = useCallback(() => {
    let periodicityInt = parseInt(paymentPlan.periodicity);
    return !!periodicityInt ? periodicityInt >= MIN_PERIODICITY_VALUE && periodicityInt <= MAX_PERIODICITY_VALUE : false;
  }, [paymentPlan.periodicity]);

  const doesPaymentPlanChange = useCallback(() => {
    if (_.isEqual(propsPaymentPlan, paymentPlan)) {
      return false;
    }
    return true;
  }, [propsPaymentPlan, paymentPlan]);

  const canSave = useCallback(() =>
    !isMandatoryFieldsEmpty() &&
    isPeriodicityValid() &&
    !!jsonExtValid &&
    doesPaymentPlanChange(),
    [isMandatoryFieldsEmpty, isPeriodicityValid, jsonExtValid, doesPaymentPlanChange]
  );

  const handleSave = useCallback((paymentPlan) => save(paymentPlan), [save]);

  const onEditedChanged = useCallback((paymentPlan) => setPaymentPlan(paymentPlan), []);

  const titleParams = useCallback(() => propsTitleParams(paymentPlan), [propsTitleParams, paymentPlan]);

  const setJsonExtValid = useCallback((valid) => setJsonExtValidState(!!valid), []);
  const setRequiredValid = useCallback((valid) => setRequiredValidState(!!valid), []);

  const shouldBeLocked = Boolean(clientMutationId);

  return (
    <div className={shouldBeLocked ? classes.lockedPage : null}>
    <Helmet title={formatMessageWithValues(intl, "paymentPlan", "paymentPlan.page.title", titleParams())} />
    <Form
      module="paymentPlan"
      title="paymentPlan.page.title"
      titleParams={titleParams()}
      edited={paymentPlan}
      back={back}
      canSave={canSave}
      save={handleSave}
      onEditedChanged={onEditedChanged}
      HeadPanel={PaymentPlanHeadPanel}
      mandatoryFieldsEmpty={isMandatoryFieldsEmpty()}
      saveTooltip={formatMessage(intl, "paymentPlan", `saveButton.tooltip.${canSave() ? 'enabled' : 'disabled'}`)}
      setJsonExtValid={setJsonExtValid}
      setRequiredValid={setRequiredValid}
      paymentPlanId={paymentPlanId}
      isReplacing={isReplacing}
      openDirty={save}
      readOnly={shouldBeLocked}
    />
    </div>
  );
};

const mapStateToProps = state => ({
  fetchingPaymentPlan: state.contributionPlan.fetchingPaymentPlan,
  fetchedPaymentPlan: state.contributionPlan.fetchedPaymentPlan,
  paymentPlan: state.contributionPlan.paymentPlan,
  errorPaymentPlan: state.contributionPlan.errorPaymentPlan,
  submittingMutation: state.contributionPlan.submittingMutation,
  mutation: state.contributionPlan.mutation,
  isCodeValid: state.contributionPlan?.validationFields?.paymentPlanCode?.isValid,
});

const mapDispatchToProps = dispatch => {
  return bindActionCreators({
    fetchPaymentPlan, clearPaymentPlan, fetchPaymentPlanMutation, journalize
  }, dispatch);
};

export default withHistory(
  withModulesManager(
    injectIntl(
      withTheme(withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(PaymentPlanForm))
      )
    )
  )
);
