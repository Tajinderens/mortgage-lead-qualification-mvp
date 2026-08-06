import type { AuditEvent, Lead } from "@/lib/domain/types";

export interface LeadStorage {
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  saveLead(lead: Lead): Promise<void>;
  listAuditEvents(leadId?: string): Promise<AuditEvent[]>;
  saveAuditEvent(event: AuditEvent): Promise<void>;
}

export const LEADS_STORAGE_KEY = "mortgage-lead-qualification-mvp.leads.v1";
export const AUDIT_EVENTS_STORAGE_KEY = "mortgage-lead-qualification-mvp.audit-events.v1";

export class BrowserLocalStorageLeadStorage implements LeadStorage {
  constructor(private readonly storage?: Storage) {}

  async listLeads(): Promise<Lead[]> {
    return this.read<Lead[]>(LEADS_STORAGE_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLead(id: string): Promise<Lead | null> {
    const leads = await this.listLeads();
    return leads.find((lead) => lead.id === id) ?? null;
  }

  async saveLead(lead: Lead): Promise<void> {
    const leads = await this.listLeads();
    const nextLeads = leads.some((item) => item.id === lead.id)
      ? leads.map((item) => (item.id === lead.id ? lead : item))
      : [...leads, lead];
    this.write(LEADS_STORAGE_KEY, nextLeads);
  }

  async listAuditEvents(leadId?: string): Promise<AuditEvent[]> {
    const events = this.read<AuditEvent[]>(AUDIT_EVENTS_STORAGE_KEY, []);
    return events.filter((event) => !leadId || event.leadId === leadId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async saveAuditEvent(event: AuditEvent): Promise<void> {
    this.write(AUDIT_EVENTS_STORAGE_KEY, [...(await this.listAuditEvents()), event]);
  }

  private read<T>(key: string, fallback: T): T {
    const value = this.getStorage().getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private write<T>(key: string, value: T) {
    this.getStorage().setItem(key, JSON.stringify(value));
  }

  private getStorage(): Storage {
    const storage = this.storage ?? globalThis.localStorage;
    if (!storage) throw new Error("Browser localStorage is unavailable.");
    return storage;
  }
}
