"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lead } from "@/lib/domain/types";
import { BrowserLocalStorageLeadStorage, type LeadStorage } from "@/lib/storage/lead-storage";

export function LeadList({ storage }: { storage?: LeadStorage }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const leadStorage = storage ?? new BrowserLocalStorageLeadStorage();
    leadStorage.listLeads().then((items) => {
      setLeads(items);
      setLoaded(true);
    });
  }, [storage]);

  if (!loaded) {
    return <p className="text-slate-700">Loading fictional leads from browser storage…</p>;
  }

  if (leads.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">No saved leads</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Leads</h1>
        <p className="mt-4 max-w-2xl text-slate-700">No fictional/demo leads are saved in this browser yet.</p>
        <Link className="mt-6 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white" href="/leads/new">
          Create fictional lead
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Browser local storage</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Saved fictional leads</h1>
        <p className="mt-4 max-w-2xl text-slate-700">These records are demo-only and stored in this browser behind a replaceable storage interface.</p>
      </div>

      <div className="grid gap-4">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/leads/${lead.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{lead.borrower.firstName} {lead.borrower.lastName}</h2>
                <p className="mt-1 text-sm text-slate-600">Created {formatDate(lead.createdAt)}</p>
              </div>
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3 sm:text-right">
                <Metric label="Priority" value={lead.scoringResult?.priority ?? "Not scored"} />
                <Metric label="Broker decision" value={formatBrokerDecision(lead.currentBrokerDecision?.brokerDecision)} />
                <Metric label="Final status" value={lead.currentBrokerDecision?.finalLeadPriorityStatus ?? "Pending review"} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBrokerDecision(value: string | undefined): string {
  if (value === "recommendation_approved") {
    return "Approved";
  }
  if (value === "recommendation_rejected") {
    return "Rejected";
  }
  if (value === "recommendation_overridden") {
    return "Overridden";
  }
  return "Pending review";
}
