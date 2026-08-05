export const requiredLeadFormFields = [
  "firstName",
  "lastName",
  "estimatedPurchasePrice",
  "grossMonthlyIncome",
  "downPaymentAmount",
] as const;

export type LeadFormField =
  | (typeof requiredLeadFormFields)[number]
  | "otherMonthlyIncome"
  | "principalAndInterest"
  | "propertyTaxes"
  | "homeownersInsurance"
  | "hoaDues"
  | "mortgageInsurance"
  | "otherHousingCosts"
  | "statedTotalMonthlyHousingExpense"
  | "debtLabel"
  | "debtMonthlyPayment";

export type LeadFormErrors = Partial<Record<LeadFormField | "housingExpense", string>>;

export interface LeadFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  estimatedPurchasePrice: string;
  propertyUse: "primaryResidence" | "secondHome" | "investment";
  grossMonthlyIncome: string;
  otherMonthlyIncome: string;
  principalAndInterest: string;
  propertyTaxes: string;
  homeownersInsurance: string;
  hoaDues: string;
  mortgageInsurance: string;
  otherHousingCosts: string;
  statedTotalMonthlyHousingExpense: string;
  debtLabel: string;
  debtMonthlyPayment: string;
  downPaymentAmount: string;
  notes: string;
}

const optionalNumericFields: LeadFormField[] = [
  "otherMonthlyIncome",
  "principalAndInterest",
  "propertyTaxes",
  "homeownersInsurance",
  "hoaDues",
  "mortgageInsurance",
  "otherHousingCosts",
  "statedTotalMonthlyHousingExpense",
  "debtMonthlyPayment",
];

const housingComponentFields: LeadFormField[] = [
  "principalAndInterest",
  "propertyTaxes",
  "homeownersInsurance",
  "hoaDues",
  "mortgageInsurance",
  "otherHousingCosts",
];

export function validateLeadFormValues(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  addRequiredPositiveNumberError(errors, "estimatedPurchasePrice", values.estimatedPurchasePrice, "Estimated purchase price");
  addRequiredPositiveNumberError(errors, "grossMonthlyIncome", values.grossMonthlyIncome, "Gross monthly income");
  addRequiredNonNegativeNumberError(errors, "downPaymentAmount", values.downPaymentAmount, "Down payment");

  optionalNumericFields.forEach((field) => addOptionalNonNegativeNumberError(errors, field, values[field], labelForField(field)));

  if (values.debtMonthlyPayment.trim() && !values.debtLabel.trim()) {
    errors.debtLabel = "Debt label is required when a debt payment is entered.";
  }

  const hasStatedHousingTotal = values.statedTotalMonthlyHousingExpense.trim().length > 0;
  const suppliedHousingComponents = housingComponentFields.filter((field) => values[field].trim().length > 0);
  if (hasStatedHousingTotal && suppliedHousingComponents.length > 0) {
    errors.housingExpense = "Use either stated total housing expense or component expenses, not both.";
  } else if (!hasStatedHousingTotal && suppliedHousingComponents.length > 0 && suppliedHousingComponents.length < housingComponentFields.length) {
    errors.housingExpense = "Enter all housing components or use stated total housing expense.";
  } else if (!hasStatedHousingTotal && suppliedHousingComponents.length === 0) {
    errors.housingExpense = "A stated total housing expense or complete component expenses are required.";
  }

  const purchasePrice = parseCurrencyNumber(values.estimatedPurchasePrice);
  const downPayment = parseCurrencyNumber(values.downPaymentAmount);
  if (purchasePrice !== undefined && downPayment !== undefined && downPayment > purchasePrice) {
    errors.downPaymentAmount = "Down payment cannot exceed the purchase price.";
  }

  return errors;
}

export function parseCurrencyNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function addRequiredPositiveNumberError(errors: LeadFormErrors, field: LeadFormField, value: string, label: string) {
  const parsed = parseCurrencyNumber(value);
  if (parsed === undefined) errors[field] = `${label} is required.`;
  else if (!Number.isFinite(parsed)) errors[field] = `${label} must be a valid number.`;
  else if (parsed < 0) errors[field] = `${label} cannot be negative.`;
  else if (parsed === 0) errors[field] = `${label} must be greater than zero.`;
}

function addRequiredNonNegativeNumberError(errors: LeadFormErrors, field: LeadFormField, value: string, label: string) {
  const parsed = parseCurrencyNumber(value);
  if (parsed === undefined) errors[field] = `${label} is required.`;
  else if (!Number.isFinite(parsed)) errors[field] = `${label} must be a valid number.`;
  else if (parsed < 0) errors[field] = `${label} cannot be negative.`;
}

function addOptionalNonNegativeNumberError(errors: LeadFormErrors, field: LeadFormField, value: string, label: string) {
  const parsed = parseCurrencyNumber(value);
  if (parsed === undefined) return;
  if (!Number.isFinite(parsed)) errors[field] = `${label} must be a valid number.`;
  else if (parsed < 0) errors[field] = `${label} cannot be negative.`;
}

function labelForField(field: LeadFormField): string {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
