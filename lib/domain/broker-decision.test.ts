import { describe, expect, it } from "vitest";
import { recordBrokerDecision } from "@/lib/domain/broker-decision";
import { scoreLeadPriority } from "@/lib/domain/scoring";
import type { AuditEvent, Lead } from "@/lib/domain/types";
import type { LeadStorage } from "@/lib/storage/lead-storage";

class MemoryLeadStorage implements LeadStorage {
  private leads = new Map<string, Lead>();
  private auditEvents: AuditEvent[] = [];

  constructor(leads: Lead[] = [], auditEvents: AuditEvent[] = []) {
    leads.forEach((lead) => this.leads.set(lead.id, lead));
    this.auditEvents = [...auditEvents];
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async getLead(id: string): Promise<Lead | null> {
    return this.leads.get(id) ?? null;
  }

  async saveLead(lead: Lead): Promise<void> {
    this.leads.set(lead.id, lead);
  }

  async listAuditEvents(leadId?: string): Promise<AuditEvent[]> {
    return this.auditEvents.filter((event) => !leadId || event.leadId === leadId);
  }

  async saveAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.push(event);
  }
}

function makeLead(): Lead {
  const lead: Lead = {
    id: "lead_test_001",
    borrower: { firstName: "Fictional", lastName: "Borrower" },
    property: { estimatedPurchasePrice: 400000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [{ label: "Fictional auto loan", monthlyPayment: 300 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2400 },
    downPayment: { amount: 80000 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return { ...lead, scoringResult: scoreLeadPriority(lead) };
}

function existingAuditEvent(leadId: string): AuditEvent {
  return {
    id: "audit_existing",
    leadId,
    type: "lead.created",
    occurredAt: "2026-01-01T00:00:00.000Z",
    actor: "demo-broker",
    summary: "Existing lead-created event.",
  };
}

describe("broker decision controls", () => {
  it("approves a recommendation and preserves the original system recommendation", async () => {
    const lead = makeLead();
    const storage = new MemoryLeadStorage([lead]);

    const result = await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_approved",
      decidedAt: "2026-01-01T00:10:00.000Z",
    });

    expect(result.error).toBeUndefined();
    expect(result.decision).toEqual(expect.objectContaining({
      originalRecommendation: "Hot",
      brokerDecision: "recommendation_approved",
      finalLeadPriorityStatus: "Hot",
      scoringRuleVersion: "lead-priority-v1.0.0",
    }));
    const savedLead = await storage.getLead(lead.id);
    expect(savedLead?.scoringResult).toEqual(lead.scoringResult);
    expect(savedLead?.currentBrokerDecision?.originalRecommendation).toBe("Hot");
  });

  it("rejects a recommendation", async () => {
    const lead = makeLead();
    const storage = new MemoryLeadStorage([lead]);

    const result = await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_rejected",
      decidedAt: "2026-01-01T00:10:00.000Z",
    });

    expect(result.error).toBeUndefined();
    expect(result.decision?.brokerDecision).toBe("recommendation_rejected");
    expect(result.decision?.finalLeadPriorityStatus).toBe("Rejected");
  });

  it("overrides a recommendation with a reason", async () => {
    const lead = makeLead();
    const storage = new MemoryLeadStorage([lead]);

    const result = await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_overridden",
      overridePriority: "Warm",
      overrideReason: "Fictional broker noted missing documentation.",
      decidedAt: "2026-01-01T00:10:00.000Z",
    });

    expect(result.error).toBeUndefined();
    expect(result.decision).toEqual(expect.objectContaining({
      originalRecommendation: "Hot",
      finalLeadPriorityStatus: "Warm",
      overrideReason: "Fictional broker noted missing documentation.",
    }));
  });

  it("blocks an override without a reason", async () => {
    const lead = makeLead();
    const storage = new MemoryLeadStorage([lead]);

    const result = await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_overridden",
      overridePriority: "Warm",
      overrideReason: " ",
    });

    expect(result.error).toContain("Override reason is required");
    expect(await storage.listAuditEvents(lead.id)).toHaveLength(0);
    const savedLead = await storage.getLead(lead.id);
    expect(savedLead?.brokerDecisionHistory).toBeUndefined();
  });

  it("appends audit events without replacing earlier events", async () => {
    const lead = makeLead();
    const storage = new MemoryLeadStorage([lead], [existingAuditEvent(lead.id)]);

    await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_approved",
      decidedAt: "2026-01-01T00:10:00.000Z",
    });
    await recordBrokerDecision(storage, {
      leadId: lead.id,
      action: "recommendation_rejected",
      decidedAt: "2026-01-01T00:20:00.000Z",
    });

    const events = await storage.listAuditEvents(lead.id);
    expect(events.map((event) => event.type)).toEqual(["lead.created", "recommendation_approved", "recommendation_rejected"]);
    const savedLead = await storage.getLead(lead.id);
    expect(savedLead?.brokerDecisionHistory?.map((decision) => decision.brokerDecision)).toEqual(["recommendation_approved", "recommendation_rejected"]);
  });
});
