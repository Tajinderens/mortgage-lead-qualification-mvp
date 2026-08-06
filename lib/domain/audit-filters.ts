import type { AuditEvent } from "@/lib/domain/types";

export type AuditEventTypeFilter = AuditEvent["type"] | "all";

export interface AuditFilters {
  type: AuditEventTypeFilter;
  leadId: string;
}

export function sortAuditEventsChronologically(events: AuditEvent[]): AuditEvent[] {
  return [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function filterAuditEvents(events: AuditEvent[], filters: AuditFilters): AuditEvent[] {
  return sortAuditEventsChronologically(events).filter((event) => {
    const matchesType = filters.type === "all" || event.type === filters.type;
    const matchesLead = !filters.leadId || event.leadId === filters.leadId;
    return matchesType && matchesLead;
  });
}
