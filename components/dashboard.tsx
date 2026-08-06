"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createDashboardSummary, dashboardPriorityOrder, type DashboardSummary } from "@/lib/domain/dashboard";
import { loadFictionalDemoData } from "@/lib/domain/demo-data";
import type { Lead } from "@/lib/domain/types";
import { BrowserLocalStorageLeadStorage, type LeadStorage } from "@/lib/storage/lead-storage";

export function Dashboard({ storage }: { storage?: LeadStorage }) {
  const leadStorage = useMemo(() => storage ?? new BrowserLocalStorageLeadStorage(), [storage]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const leads = await leadStorage.listLeads();
    setSummary(createDashboardSummary(leads));
    setLoaded(true);
  }, [leadStorage]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLoadDemoData() {
    const result = await loadFictionalDemoData(leadStorage);
    setDemoMessage(
      result.addedCount > 0
        ? `Loaded ${result.addedCount} fictional demo leads. ${result.skippedCount} existing demo records were skipped.`
        : "Fictional demo leads are already loaded; no duplicates were added.",
    );
    await loadDashboard();
  }

  if (!loaded || !summary) {
    return <p className="text-slate-700">Loading fictional dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Fictional demo dashboard</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Mortgage lead qualification dashboard</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              Browser-local dashboard for fictional mortgage lead-priority records. Counts are demo-only and require broker review before any real-world action.
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:max-w-xs">
            <p className="text-sm font-semibold text-blue-950">Demo data only</p>
            <p className="mt-1 text-sm text-blue-900">Load fictional records for walkthroughs. This never adds real borrower data.</p>
            <button type="button" className="mt-4 w-full rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" onClick={handleLoadDemoData}>
              Load Demo Data
            </button>
            {demoMessage ? <p className="mt-3 text-sm text-blue-950">{demoMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total leads" value={String(summary.totalLeadCount)} />
        <SummaryCard label="Pending broker review" value={String(summary.pendingBrokerReviewCount)} />
        {dashboardPriorityOrder.map((priority) => (
          <SummaryCard key={priority} label={priority} value={String(summary.countsByPriority[priority])} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Recent fictional leads</h2>
            <p className="mt-1 text-sm text-slate-700">Most recently created browser-local demo records.</p>
          </div>
          <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/leads">
            View all leads
          </Link>
        </div>
        {summary.recentLeads.length === 0 ? (
          <EmptyState message="No fictional leads are saved yet. Create a lead or load demo data to populate the dashboard." />
        ) : (
          <div className="mt-4 grid gap-3">
            {summary.recentLeads.map((lead) => <RecentLeadCard key={lead.id} lead={lead} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function RecentLeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{lead.borrower.firstName} {lead.borrower.lastName}</h3>
          <p className="text-sm text-slate-600">Fictional/demo lead · created {formatDate(lead.createdAt)}</p>
        </div>
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 sm:text-right">
          <Metric label="Priority" value={lead.scoringResult?.priority ?? "Not scored"} />
          <Metric label="Broker review" value={lead.currentBrokerDecision ? "Completed" : "Pending"} />
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">{message}</p>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
