"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { filterAuditEvents, type AuditEventTypeFilter } from "@/lib/domain/audit-filters";
import type { AuditEvent, Lead } from "@/lib/domain/types";
import { BrowserLocalStorageLeadStorage, type LeadStorage } from "@/lib/storage/lead-storage";

const auditEventTypeOptions: Array<{ value: AuditEventTypeFilter; label: string }> = [
  { value: "all", label: "All event types" },
  { value: "lead.created", label: "Lead created" },
  { value: "lead.updated", label: "Lead updated" },
  { value: "scoring.calculated", label: "Scoring calculated" },
  { value: "recommendation_approved", label: "Recommendation approved" },
  { value: "recommendation_rejected", label: "Recommendation rejected" },
  { value: "recommendation_overridden", label: "Recommendation overridden" },
];

export function AuditTrail({ storage }: { storage?: LeadStorage }) {
  const leadStorage = useMemo(() => storage ?? new BrowserLocalStorageLeadStorage(), [storage]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AuditEventTypeFilter>("all");
  const [leadFilter, setLeadFilter] = useState("");

  const loadAudit = useCallback(async () => {
    const [savedLeads, auditEvents] = await Promise.all([leadStorage.listLeads(), leadStorage.listAuditEvents()]);
    setLeads(savedLeads);
    setEvents(auditEvents);
    setLoaded(true);
  }, [leadStorage]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const filteredEvents = filterAuditEvents(events, { type: typeFilter, leadId: leadFilter });
  const leadNames = new Map(leads.map((lead) => [lead.id, `${lead.borrower.firstName} ${lead.borrower.lastName}`]));

  if (!loaded) {
    return <p className="text-slate-700">Loading fictional audit trail…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Chronological audit trail</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Audit Trail</h1>
        <p className="mt-4 max-w-3xl text-slate-700">
          Complete chronological record of fictional lead creation, scoring, and broker-review events stored in browser local storage.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Filter by audit-event type
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as AuditEventTypeFilter)}>
              {auditEventTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Filter by lead
            <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}>
              <option value="">All fictional leads</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.borrower.firstName} {lead.borrower.lastName}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm text-slate-600">Showing {filteredEvents.length} of {events.length} audit events.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {events.length === 0 ? (
          <EmptyState message="No audit events found. Create a fictional lead or load demo data from the dashboard to populate this page." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState message="No audit events match the selected filters. Clear or change the filters to see more fictional audit records." />
        ) : (
          <ol className="space-y-3">
            {filteredEvents.map((event) => (
              <li key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{formatEventType(event.type)}</p>
                    <p className="mt-1">{event.summary}</p>
                    <p className="mt-1 text-xs text-slate-500">Fictional/demo audit record · {event.actor}</p>
                  </div>
                  <time className="text-xs font-medium text-slate-500" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50" href={`/leads/${event.leadId}`}>
                    {leadNames.get(event.leadId) ?? event.leadId}
                  </Link>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200">{event.type}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">{message}</p>;
}

function formatEventType(value: string): string {
  return value.split(/[._]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
