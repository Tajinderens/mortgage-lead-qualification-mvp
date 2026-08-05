import { describe, expect, it } from "vitest";
import {
  SCORING_RULE_VERSION,
  calculateDownPaymentPercent,
  calculatePreliminaryBackendDtiPercent,
  calculateTotalProposedMonthlyHousingExpense,
  calculateTotalRecurringMonthlyDebt,
  scoreLeadPriority,
  validateLeadForScoring,
} from "./scoring";
import type { Lead } from "./types";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  const lead: Lead = {
    id: "fictional-lead-001",
    borrower: {
      firstName: "Fictional",
      lastName: "Borrower",
      email: "fictional.borrower@example.test",
    },
    property: {
      estimatedPurchasePrice: 400000,
      propertyUse: "primaryResidence",
    },
    income: {
      grossMonthlyIncome: 10000,
    },
    debts: {
      liabilities: [
        { label: "Fictional auto loan", monthlyPayment: 300 },
        { label: "Fictional credit card", monthlyPayment: 100 },
      ],
    },
    housingExpense: {
      principalAndInterest: 1800,
      propertyTaxes: 400,
      homeownersInsurance: 150,
      hoaDues: 50,
      mortgageInsurance: 0,
      otherHousingCosts: 0,
    },
    downPayment: {
      amount: 80000,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  return {
    ...lead,
    ...overrides,
    borrower: { ...lead.borrower, ...overrides.borrower },
    property: { ...lead.property, ...overrides.property },
    income: { ...lead.income, ...overrides.income },
    debts: { ...lead.debts, ...overrides.debts },
    housingExpense: { ...lead.housingExpense, ...overrides.housingExpense },
    downPayment: { ...lead.downPayment, ...overrides.downPayment },
  };
}

describe("scoring calculations", () => {
  it("calculates total recurring monthly debt", () => {
    expect(calculateTotalRecurringMonthlyDebt(makeLead().debts)).toBe(400);
  });

  it("calculates total proposed monthly housing expense from components", () => {
    expect(calculateTotalProposedMonthlyHousingExpense(makeLead().housingExpense)).toBe(2400);
  });

  it("uses stated total housing expense when provided", () => {
    const lead = makeLead({ housingExpense: { statedTotalMonthlyHousingExpense: 2750 } });
    expect(calculateTotalProposedMonthlyHousingExpense(lead.housingExpense)).toBe(2750);
  });

  it("calculates preliminary back-end DTI", () => {
    const dti = calculatePreliminaryBackendDtiPercent({
      income: makeLead().income,
      debtInfo: makeLead().debts,
      housingExpense: makeLead().housingExpense,
    });
    expect(dti).toBe(28);
  });

  it("calculates down-payment percentage", () => {
    expect(calculateDownPaymentPercent({ property: makeLead().property, downPayment: makeLead().downPayment })).toBe(20);
  });
});

describe("validation", () => {
  it("flags zero income", () => {
    const result = scoreLeadPriority(makeLead({ income: { grossMonthlyIncome: 0 } }));
    expect(result.priority).toBe("Manual Review");
    expect(result.validationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ field: "income.grossMonthlyIncome", code: "zero" })]));
  });

  it("flags negative values", () => {
    const issues = validateLeadForScoring(makeLead({ debts: { liabilities: [{ label: "Fictional debt", monthlyPayment: -25 }] } }));
    expect(issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: "debts.liabilities.0.monthlyPayment", code: "negative" })]));
  });

  it("flags down payment greater than property price", () => {
    const result = scoreLeadPriority(makeLead({ downPayment: { amount: 450000 } }));
    expect(result.priority).toBe("Manual Review");
    expect(result.validationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "greaterThanPropertyPrice" })]));
  });

  it("flags incomplete housing-expense data", () => {
    const result = scoreLeadPriority(
      makeLead({
        housingExpense: {
          principalAndInterest: 1800,
          propertyTaxes: 400,
        },
      }),
    );
    expect(result.priority).toBe("Manual Review");
    expect(result.validationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ field: "housingExpense", code: "missing" })]));
  });

  it("flags conflicting housing inputs for manual review", () => {
    const result = scoreLeadPriority(makeLead({ housingExpense: { statedTotalMonthlyHousingExpense: 2400 } }));
    expect(result.priority).toBe("Manual Review");
    expect(result.validationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ field: "housingExpense", code: "conflicting" })]));
  });
});

describe("lead-priority scoring", () => {
  it("returns Hot for low DTI with strong down payment", () => {
    const result = scoreLeadPriority(makeLead());
    expect(result.ruleVersion).toBe(SCORING_RULE_VERSION);
    expect(result.priority).toBe("Hot");
    expect(result.recommendedNextAction).toContain("broker review");
  });

  it("returns Warm for moderate DTI", () => {
    const result = scoreLeadPriority(makeLead({ housingExpense: { statedTotalMonthlyHousingExpense: 3600 }, downPayment: { amount: 40000 } }));
    expect(result.priority).toBe("Warm");
  });

  it("returns Cold for elevated DTI", () => {
    const result = scoreLeadPriority(makeLead({ housingExpense: { statedTotalMonthlyHousingExpense: 4600 }, downPayment: { amount: 40000 } }));
    expect(result.priority).toBe("Cold");
  });

  it("returns Not Ready for low down payment", () => {
    const result = scoreLeadPriority(makeLead({ downPayment: { amount: 5000 } }));
    expect(result.priority).toBe("Not Ready");
  });

  it("returns Not Ready for DTI above configured threshold without treating it as eligibility", () => {
    const result = scoreLeadPriority(makeLead({ housingExpense: { statedTotalMonthlyHousingExpense: 5200 }, downPayment: { amount: 40000 } }));
    expect(result.priority).toBe("Not Ready");
    expect(result.recommendedNextAction).toContain("Do not treat this as eligibility denial");
  });
});
