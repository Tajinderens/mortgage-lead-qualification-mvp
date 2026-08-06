import { describe, expect, it } from "vitest";
import { fictionalSampleLeads, loadFictionalDemoData } from "@/lib/domain/demo-data";
import type { AuditEvent, Lead } from "@/lib/domain/types";
import type { LeadStorage } from "@/lib/storage/lead-storage";

class MemoryLeadStorage implements LeadStorage {
  private leads = new Map<string, Lead>();
  private auditEvents: AuditEvent[] = [];

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

describe("fictional demo data loading", () => {
  it("loads fictional sample leads with scoring and audit events", async () => {
    const storage = new MemoryLeadStorage();

    const result = await loadFictionalDemoData(storage);

    expect(result).toEqual({ addedCount: fictionalSampleLeads.length, skippedCount: 0 });
    const leads = await storage.listLeads();
    expect(leads).toHaveLength(fictionalSampleLeads.length);
    expect(leads.every((lead) => lead.notes?.includes("Fictional demo lead only"))).toBe(true);
    expect(leads.map((lead) => lead.scoringResult?.priority).sort()).toEqual(["Cold", "Hot", "Manual Review", "Not Ready", "Warm"].sort());
    expect(await storage.listAuditEvents()).toHaveLength(fictionalSampleLeads.length * 2);
  });

  it("does not add duplicate fictional demo records", async () => {
    const storage = new MemoryLeadStorage();

    await loadFictionalDemoData(storage);
    const secondResult = await loadFictionalDemoData(storage);

    expect(secondResult).toEqual({ addedCount: 0, skippedCount: fictionalSampleLeads.length });
    expect(await storage.listLeads()).toHaveLength(fictionalSampleLeads.length);
    expect(await storage.listAuditEvents()).toHaveLength(fictionalSampleLeads.length * 2);
  });
});
