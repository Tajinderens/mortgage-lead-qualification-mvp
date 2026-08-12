import { describe, expect, it } from "vitest";
import { createDashboardSummary } from "@/lib/domain/dashboard";
import type { Lead, LeadPriority } from "@/lib/domain/types";

function makeLead(id: string, priority: LeadPriority, createdAt: string, reviewed = false): Lead {
  return {
    id,
    borrower: { firstName: "Fictional", lastName: id },
    property: { estimatedPurchasePrice: 400000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2500 },
    downPayment: { amount: 80000 },
    createdAt,
    updatedAt: createdAt,
    scoringResult: {
      ruleVersion: "test-rule",
      priority,
      metrics: {
        totalRecurringMonthlyDebt: 0,
        totalProposedMonthlyHousingExpense: 2500,
        preliminaryBackendDtiPercent: 25,
        downPaymentPercent: 20,
      },
      validationIssues: [],
      reasons: [],
      recommendedNextAction: "Fictional broker review.",
    },
    currentBrokerDecision: reviewed ? {
      id: `decision_${id}`,
      leadId: id,
      originalRecommendation: priority,
      brokerDecision: "recommendation_approved",
      finalLeadPriorityStatus: priority,
      decidedAt: createdAt,
      scoringRuleVersion: "test-rule",
    } : undefined,
  };
}

describe("dashboard summary", () => {
  it("counts leads by priority, pending broker review, and recent leads", () => {
    const leads = [
      makeLead("old-hot", "Hot", "2026-01-01T00:00:00.000Z", true),
      makeLead("warm", "Warm", "2026-01-02T00:00:00.000Z"),
      makeLead("cold", "Cold", "2026-01-03T00:00:00.000Z"),
      makeLead("not-ready", "Not Ready", "2026-01-04T00:00:00.000Z"),
      makeLead("manual", "Manual Review", "2026-01-05T00:00:00.000Z"),
      makeLead("new-hot", "Hot", "2026-01-06T00:00:00.000Z"),
    ];

    const summary = createDashboardSummary(leads, 3);

    expect(summary.totalLeadCount).toBe(6);
    expect(summary.countsByPriority).toEqual({
      Hot: 2,
      Warm: 1,
      Cold: 1,
      "Not Ready": 1,
      "Manual Review": 1,
    });
    expect(summary.pendingBrokerReviewCount).toBe(5);
    expect(summary.recentLeads.map((lead) => lead.id)).toEqual(["new-hot", "manual", "not-ready"]);
  });
});
