import { createLeadCreatedAuditEvent, createScoreGeneratedAuditEvent } from "@/lib/domain/audit";
import { scoreLeadPriority } from "@/lib/domain/scoring";
import type { Lead } from "@/lib/domain/types";
import type { LeadStorage } from "@/lib/storage/lead-storage";

const DEMO_LEAD_SOURCE = "fictional-step-5-demo";

export const fictionalSampleLeads: Lead[] = [
  {
    id: "demo_fictional_hot",
    borrower: { firstName: "Avery", lastName: "Fictional-Hot", email: "avery.hot@example.test", phone: "555-0101" },
    property: { estimatedPurchasePrice: 400000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [{ label: "Fictional auto loan", monthlyPayment: 300 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2400 },
    downPayment: { amount: 80000 },
    notes: "Fictional demo lead only. Not real borrower data.",
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: "demo_fictional_warm",
    borrower: { firstName: "Blair", lastName: "Fictional-Warm", email: "blair.warm@example.test", phone: "555-0102" },
    property: { estimatedPurchasePrice: 450000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [{ label: "Fictional installment debt", monthlyPayment: 400 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 3600 },
    downPayment: { amount: 45000 },
    notes: "Fictional demo lead only. Not real borrower data.",
    createdAt: "2026-01-02T10:05:00.000Z",
    updatedAt: "2026-01-02T10:05:00.000Z",
  },
  {
    id: "demo_fictional_cold",
    borrower: { firstName: "Casey", lastName: "Fictional-Cold", email: "casey.cold@example.test", phone: "555-0103" },
    property: { estimatedPurchasePrice: 425000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [{ label: "Fictional revolving debt", monthlyPayment: 300 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 4600 },
    downPayment: { amount: 42500 },
    notes: "Fictional demo lead only. Not real borrower data.",
    createdAt: "2026-01-02T10:10:00.000Z",
    updatedAt: "2026-01-02T10:10:00.000Z",
  },
  {
    id: "demo_fictional_not_ready",
    borrower: { firstName: "Dakota", lastName: "Fictional-NotReady", email: "dakota.notready@example.test", phone: "555-0104" },
    property: { estimatedPurchasePrice: 350000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 9000 },
    debts: { liabilities: [{ label: "Fictional personal loan", monthlyPayment: 250 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2100 },
    downPayment: { amount: 5000 },
    notes: "Fictional demo lead only. Not real borrower data.",
    createdAt: "2026-01-02T10:15:00.000Z",
    updatedAt: "2026-01-02T10:15:00.000Z",
  },
  {
    id: "demo_fictional_manual_review",
    borrower: { firstName: "Emery", lastName: "Fictional-ManualReview", email: "emery.manual@example.test", phone: "555-0105" },
    property: { estimatedPurchasePrice: 390000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 0 },
    debts: { liabilities: [{ label: "Fictional student loan", monthlyPayment: 150 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2200 },
    downPayment: { amount: 39000 },
    notes: "Fictional demo lead only. Not real borrower data.",
    createdAt: "2026-01-02T10:20:00.000Z",
    updatedAt: "2026-01-02T10:20:00.000Z",
  },
];

export interface LoadDemoDataResult {
  addedCount: number;
  skippedCount: number;
}

export async function loadFictionalDemoData(storage: LeadStorage): Promise<LoadDemoDataResult> {
  const existingLeads = await storage.listLeads();
  const existingIds = new Set(existingLeads.map((lead) => lead.id));
  let addedCount = 0;

  for (const sampleLead of fictionalSampleLeads) {
    if (existingIds.has(sampleLead.id)) {
      continue;
    }

    const scoringResult = scoreLeadPriority(sampleLead);
    const leadWithScore: Lead = {
      ...sampleLead,
      scoringResult,
      notes: `${sampleLead.notes} Source: ${DEMO_LEAD_SOURCE}.`,
    };

    await storage.saveLead(leadWithScore);
    await storage.saveAuditEvent(createLeadCreatedAuditEvent(leadWithScore, leadWithScore.createdAt));
    await storage.saveAuditEvent(createScoreGeneratedAuditEvent(leadWithScore, scoringResult, leadWithScore.createdAt));
    existingIds.add(sampleLead.id);
    addedCount += 1;
  }

  return { addedCount, skippedCount: fictionalSampleLeads.length - addedCount };
}
