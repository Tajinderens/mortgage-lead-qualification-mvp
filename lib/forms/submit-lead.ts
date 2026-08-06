import { createLeadCreatedAuditEvent, createScoreGeneratedAuditEvent, createUniqueId } from "@/lib/domain/audit";
import { scoreLeadPriority } from "@/lib/domain/scoring";
import type { Lead } from "@/lib/domain/types";
import { parseCurrencyNumber, validateLeadFormValues, type LeadFormErrors, type LeadFormValues } from "@/lib/forms/lead-form";
import type { LeadStorage } from "@/lib/storage/lead-storage";

export interface SubmitLeadFormResult {
  leadId?: string;
  errors: LeadFormErrors;
}

export async function submitLeadForm(values: LeadFormValues, storage: LeadStorage, now: string = new Date().toISOString()): Promise<SubmitLeadFormResult> {
  const errors = validateLeadFormValues(values);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const lead: Lead = {
    id: createUniqueId("lead"),
    borrower: {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone),
    },
    property: {
      estimatedPurchasePrice: requiredNumber(values.estimatedPurchasePrice),
      propertyUse: values.propertyUse,
    },
    income: {
      grossMonthlyIncome: requiredNumber(values.grossMonthlyIncome),
      otherMonthlyIncome: optionalNumber(values.otherMonthlyIncome),
    },
    debts: {
      liabilities: values.debtMonthlyPayment.trim()
        ? [{ label: values.debtLabel.trim(), monthlyPayment: requiredNumber(values.debtMonthlyPayment) }]
        : [],
    },
    housingExpense: {
      principalAndInterest: optionalNumber(values.principalAndInterest),
      propertyTaxes: optionalNumber(values.propertyTaxes),
      homeownersInsurance: optionalNumber(values.homeownersInsurance),
      hoaDues: optionalNumber(values.hoaDues),
      mortgageInsurance: optionalNumber(values.mortgageInsurance),
      otherHousingCosts: optionalNumber(values.otherHousingCosts),
      statedTotalMonthlyHousingExpense: optionalNumber(values.statedTotalMonthlyHousingExpense),
    },
    downPayment: {
      amount: requiredNumber(values.downPaymentAmount),
    },
    notes: emptyToUndefined(values.notes),
    createdAt: now,
    updatedAt: now,
  };

  const scoringResult = scoreLeadPriority(lead);
  const leadWithScore = { ...lead, scoringResult };

  await storage.saveLead(leadWithScore);
  await storage.saveAuditEvent(createLeadCreatedAuditEvent(leadWithScore, now));
  await storage.saveAuditEvent(createScoreGeneratedAuditEvent(leadWithScore, scoringResult, now));

  return { leadId: lead.id, errors: {} };
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim() || undefined;
}

function requiredNumber(value: string): number {
  const parsed = parseCurrencyNumber(value);
  if (parsed === undefined || !Number.isFinite(parsed)) {
    throw new Error("Expected validated number.");
  }
  return parsed;
}

function optionalNumber(value: string): number | undefined {
  const parsed = parseCurrencyNumber(value);
  return parsed === undefined || !Number.isFinite(parsed) ? undefined : parsed;
}
