import type {
  DebtInfo,
  DownPaymentInfo,
  HousingExpenseInfo,
  IncomeInfo,
  Lead,
  LeadPriority,
  PropertyInfo,
  ScoringMetrics,
  ScoringResult,
  ValidationIssue,
} from "./types";

export const SCORING_RULE_VERSION = "lead-priority-v1.0.0";

export interface ScoringThresholds {
  hotMaxDtiPercent: number;
  warmMaxDtiPercent: number;
  coldMaxDtiPercent: number;
  readyMinDownPaymentPercent: number;
  strongDownPaymentPercent: number;
}

export const DEFAULT_SCORING_THRESHOLDS: ScoringThresholds = {
  hotMaxDtiPercent: 36,
  warmMaxDtiPercent: 43,
  coldMaxDtiPercent: 50,
  readyMinDownPaymentPercent: 3,
  strongDownPaymentPercent: 20,
};

const DTI_PRECISION_DECIMAL_PLACES = 4;

const HOUSING_COMPONENT_FIELDS: Array<keyof HousingExpenseInfo> = [
  "principalAndInterest",
  "propertyTaxes",
  "homeownersInsurance",
  "hoaDues",
  "mortgageInsurance",
  "otherHousingCosts",
];

export function calculateTotalRecurringMonthlyDebt(debtInfo: DebtInfo): number {
  return debtInfo.liabilities.reduce((total, liability) => total + liability.monthlyPayment, 0);
}

export function calculateTotalProposedMonthlyHousingExpense(housingExpense: HousingExpenseInfo): number | null {
  if (typeof housingExpense.statedTotalMonthlyHousingExpense === "number") {
    return housingExpense.statedTotalMonthlyHousingExpense;
  }

  const componentValues = HOUSING_COMPONENT_FIELDS.map((field) => housingExpense[field]);
  if (componentValues.some((value) => typeof value !== "number")) {
    return null;
  }

  return componentValues.reduce<number>((total, value) => total + Number(value), 0);
}

export function calculatePreliminaryBackendDtiPercent(params: {
  income: IncomeInfo;
  debtInfo: DebtInfo;
  housingExpense: HousingExpenseInfo;
}): number | null {
  const grossMonthlyIncome = calculateTotalGrossMonthlyIncome(params.income);
  const housingExpense = calculateTotalProposedMonthlyHousingExpense(params.housingExpense);

  if (grossMonthlyIncome <= 0 || housingExpense === null) {
    return null;
  }

  const totalDebt = calculateTotalRecurringMonthlyDebt(params.debtInfo);
  return roundToDecimalPlaces(((totalDebt + housingExpense) / grossMonthlyIncome) * 100, DTI_PRECISION_DECIMAL_PLACES);
}

export function calculateDownPaymentPercent(params: {
  property: PropertyInfo;
  downPayment: DownPaymentInfo;
}): number | null {
  if (params.property.estimatedPurchasePrice <= 0) {
    return null;
  }

  return (params.downPayment.amount / params.property.estimatedPurchasePrice) * 100;
}

export function validateLeadForScoring(lead: Lead): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  addNumberIssue(issues, "property.estimatedPurchasePrice", lead.property.estimatedPurchasePrice, { required: true, zeroIsError: true });
  addNumberIssue(issues, "income.grossMonthlyIncome", lead.income.grossMonthlyIncome, { required: true, zeroIsError: true });
  addNumberIssue(issues, "income.otherMonthlyIncome", lead.income.otherMonthlyIncome, { required: false, zeroIsError: false });
  addNumberIssue(issues, "downPayment.amount", lead.downPayment.amount, { required: true, zeroIsError: false });

  lead.debts.liabilities.forEach((liability, index) => {
    addNumberIssue(issues, `debts.liabilities.${index}.monthlyPayment`, liability.monthlyPayment, {
      required: true,
      zeroIsError: false,
    });
  });

  HOUSING_COMPONENT_FIELDS.forEach((field) => {
    addNumberIssue(issues, `housingExpense.${field}`, lead.housingExpense[field], { required: false, zeroIsError: false });
  });
  addNumberIssue(issues, "housingExpense.statedTotalMonthlyHousingExpense", lead.housingExpense.statedTotalMonthlyHousingExpense, {
    required: false,
    zeroIsError: true,
  });

  if (lead.downPayment.amount > lead.property.estimatedPurchasePrice) {
    issues.push({
      field: "downPayment.amount",
      code: "greaterThanPropertyPrice",
      message: "Down payment cannot be greater than the estimated purchase price.",
      severity: "error",
    });
  }

  const hasStatedHousingTotal = typeof lead.housingExpense.statedTotalMonthlyHousingExpense === "number";
  const suppliedHousingComponents = HOUSING_COMPONENT_FIELDS.filter((field) => typeof lead.housingExpense[field] === "number");
  if (!hasStatedHousingTotal && suppliedHousingComponents.length > 0 && suppliedHousingComponents.length < HOUSING_COMPONENT_FIELDS.length) {
    issues.push({
      field: "housingExpense",
      code: "missing",
      message: "Housing expense components are incomplete and no stated total housing expense was provided.",
      severity: "error",
    });
  }

  if (hasStatedHousingTotal && suppliedHousingComponents.length > 0) {
    issues.push({
      field: "housingExpense",
      code: "conflicting",
      message: "Provide either a stated total housing expense or all component expenses, not both.",
      severity: "error",
    });
  }

  return issues;
}

export function scoreLeadPriority(lead: Lead, thresholds: ScoringThresholds = DEFAULT_SCORING_THRESHOLDS): ScoringResult {
  const validationIssues = validateLeadForScoring(lead);
  const metrics = calculateScoringMetrics(lead);
  const blockingIssues = validationIssues.filter((issue) => issue.severity === "error");

  if (blockingIssues.some((issue) => issue.code === "conflicting")) {
    return result("Manual Review", metrics, validationIssues, ["Conflicting inputs must be reviewed by a broker before a lead-priority recommendation is made."], "Resolve conflicting inputs and manually review the lead before prioritization.");
  }

  if (blockingIssues.length > 0 || metrics.preliminaryBackendDtiPercent === null || metrics.downPaymentPercent === null) {
    return result("Manual Review", metrics, validationIssues, ["Required calculation inputs are missing or invalid."], "Collect or correct the missing borrower, property, income, debt, housing expense, and down-payment details.");
  }

  const dti = metrics.preliminaryBackendDtiPercent;
  const downPaymentPercent = metrics.downPaymentPercent;

  if (downPaymentPercent < thresholds.readyMinDownPaymentPercent) {
    return result("Not Ready", metrics, validationIssues, ["Down payment is below the configured readiness threshold."], "Ask the borrower whether additional down-payment funds or assistance are available before broker review.");
  }

  if (dti <= thresholds.hotMaxDtiPercent && downPaymentPercent >= thresholds.strongDownPaymentPercent) {
    return result("Hot", metrics, validationIssues, ["Preliminary back-end DTI is within the Hot threshold.", "Down payment meets or exceeds the strong down-payment threshold."], "Prioritize broker review and confirm documentation before any borrower-facing next step.");
  }

  if (dti <= thresholds.warmMaxDtiPercent) {
    return result("Warm", metrics, validationIssues, ["Preliminary back-end DTI is within the Warm threshold."], "Review with a broker and request supporting income, debt, asset, and housing-expense documentation.");
  }

  if (dti <= thresholds.coldMaxDtiPercent) {
    return result("Cold", metrics, validationIssues, ["Preliminary back-end DTI is elevated but within the Cold threshold."], "Broker should review constraints and discuss whether borrower timing or debt reduction could improve readiness.");
  }

  return result("Not Ready", metrics, validationIssues, ["Preliminary back-end DTI is above the configured lead-priority threshold."], "Do not treat this as eligibility denial; route to broker review for education and potential future readiness steps.");
}

function calculateScoringMetrics(lead: Lead): ScoringMetrics {
  return {
    totalRecurringMonthlyDebt: calculateTotalRecurringMonthlyDebt(lead.debts),
    totalProposedMonthlyHousingExpense: calculateTotalProposedMonthlyHousingExpense(lead.housingExpense),
    preliminaryBackendDtiPercent: calculatePreliminaryBackendDtiPercent({
      income: lead.income,
      debtInfo: lead.debts,
      housingExpense: lead.housingExpense,
    }),
    downPaymentPercent: calculateDownPaymentPercent({ property: lead.property, downPayment: lead.downPayment }),
  };
}

function calculateTotalGrossMonthlyIncome(income: IncomeInfo): number {
  return income.grossMonthlyIncome + (income.otherMonthlyIncome ?? 0);
}

function roundToDecimalPlaces(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function addNumberIssue(
  issues: ValidationIssue[],
  field: string,
  value: number | undefined,
  options: { required: boolean; zeroIsError: boolean },
) {
  if (typeof value !== "number") {
    if (options.required) {
      issues.push({ field, code: "missing", message: `${field} is required.`, severity: "error" });
    }
    return;
  }

  if (!Number.isFinite(value)) {
    issues.push({ field, code: "notFinite", message: `${field} must be a finite number.`, severity: "error" });
    return;
  }

  if (value < 0) {
    issues.push({ field, code: "negative", message: `${field} cannot be negative.`, severity: "error" });
    return;
  }

  if (value === 0 && options.zeroIsError) {
    issues.push({ field, code: "zero", message: `${field} must be greater than zero.`, severity: "error" });
  }
}

function result(
  priority: LeadPriority,
  metrics: ScoringMetrics,
  validationIssues: ValidationIssue[],
  reasons: string[],
  recommendedNextAction: string,
): ScoringResult {
  return {
    ruleVersion: SCORING_RULE_VERSION,
    priority,
    metrics,
    validationIssues,
    reasons,
    recommendedNextAction,
  };
}
