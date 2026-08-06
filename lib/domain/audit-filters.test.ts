import { describe, expect, it } from "vitest";
import { filterAuditEvents, sortAuditEventsChronologically } from "@/lib/domain/audit-filters";
import type { AuditEvent } from "@/lib/domain/types";

function event(id: string, leadId: string, type: AuditEvent["type"], occurredAt: string): AuditEvent {
  return {
    id,
    leadId,
    type,
    occurredAt,
    actor: "demo-broker",
    summary: "Fictional audit event.",
  };
}

describe("audit event filtering", () => {
  const events = [
    event("late", "lead_b", "recommendation_approved", "2026-01-03T00:00:00.000Z"),
    event("early", "lead_a", "lead.created", "2026-01-01T00:00:00.000Z"),
    event("middle", "lead_a", "scoring.calculated", "2026-01-02T00:00:00.000Z"),
  ];

  it("sorts audit events chronologically", () => {
    expect(sortAuditEventsChronologically(events).map((item) => item.id)).toEqual(["early", "middle", "late"]);
  });

  it("filters audit events by type and lead", () => {
    expect(filterAuditEvents(events, { type: "all", leadId: "lead_a" }).map((item) => item.id)).toEqual(["early", "middle"]);
    expect(filterAuditEvents(events, { type: "recommendation_approved", leadId: "" }).map((item) => item.id)).toEqual(["late"]);
    expect(filterAuditEvents(events, { type: "scoring.calculated", leadId: "lead_b" })).toEqual([]);
  });
});
