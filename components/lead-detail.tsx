"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuditEvent, Lead } from "@/lib/domain/types";
import { BrowserLocalStorageLeadStorage, type LeadStorage } from "@/lib/storage/lead-storage";

export function LeadDetail({ leadId, storage }: { leadId: string; storage?: LeadStorage }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLoaded(true);
      return;
    }

    const leadStorage = storage ?? new BrowserLocalStorageLeadStorage();
    Promise.all([leadStorage.getLead(leadId), leadStorage.listAuditEvents(leadId)]).then(([savedLead, events]) => {
      setLead(savedLead);
      setAuditEvents(events);
      setLoaded(true);
    });
  }, [leadId, storage]);

  if (!loaded) {
    return <p className="text-slate-700">Loading fictional lead…</p>;
  }

  if (!leadId || !lead) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Missing lead</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Lead not found</h1>
        <p className="mt-4 max-w-2xl text-slate-700">No fictional/demo lead was found for this ID in browser storage.</p>
        <Link className="mt-6 inline-flex rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white" href="/leads">
          Back to leads
        </Link>
      </section>
    );
  }

  const scoringResult = lead.scoringResult;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Fictional lead detail</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{lead.borrower.firstName} {lead.borrower.lastName}</h1>
        <p className="mt-4 max-w-3xl text-slate-700">
          Preliminary estimate requiring broker review. This page does not approve loans, determine eligibility, or provide broker decision controls.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Lead priority" value={scoringResult?.priority ?? "Not scored"} />
        <SummaryCard label="Score" value={scoringResult ? String(scoringResult.score) : "Unavailable"} />
        <SummaryCard label="Preliminary DTI" value={formatPercent(scoringResult?.metrics.preliminaryBackendDtiPercent)} />
        <SummaryCard label="Down payment" value={formatPercent(scoringResult?.metrics.downPaymentPercent)} />
      </section>

      {scoringResult ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Score explanation</h2>
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Metric label="Scoring-rule version" value={scoringResult.ruleVersion} />
            <Metric label="Recurring monthly debt" value={formatCurrency(scoringResult.metrics.totalRecurringMonthlyDebt)} />
            <Metric label="Proposed monthly housing expense" value={formatCurrency(scoringResult.metrics.totalProposedMonthlyHousingExpense)} />
            <Metric label="Recommended broker action" value={scoringResult.recommendedNextAction} />
          </dl>
          <h3 className="mt-6 font-semibold text-slate-950">Reasons</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {scoringResult.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
          {scoringResult.validationIssues.length > 0 ? (
            <>
              <h3 className="mt-6 font-semibold text-slate-950">Validation issues</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {scoringResult.validationIssues.map((issue) => <li key={`${issue.field}-${issue.code}`}>{issue.message}</li>)}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <DetailCard title="Borrower" rows={[
          ["Name", `${lead.borrower.firstName} ${lead.borrower.lastName}`],
          ["Email", lead.borrower.email ?? "Not provided"],
          ["Phone", lead.borrower.phone ?? "Not provided"],
        ]} />
        <DetailCard title="Property and income" rows={[
          ["Purchase price", formatCurrency(lead.property.estimatedPurchasePrice)],
          ["Property use", lead.property.propertyUse],
          ["Gross monthly income", formatCurrency(lead.income.grossMonthlyIncome)],
          ["Other monthly income", formatCurrency(lead.income.otherMonthlyIncome ?? null)],
        ]} />
        <DetailCard title="Housing expense" rows={[
          ["Stated total", formatCurrency(lead.housingExpense.statedTotalMonthlyHousingExpense ?? null)],
          ["Principal and interest", formatCurrency(lead.housingExpense.principalAndInterest ?? null)],
          ["Property taxes", formatCurrency(lead.housingExpense.propertyTaxes ?? null)],
          ["Homeowners insurance", formatCurrency(lead.housingExpense.homeownersInsurance ?? null)],
          ["HOA dues", formatCurrency(lead.housingExpense.hoaDues ?? null)],
          ["Mortgage insurance", formatCurrency(lead.housingExpense.mortgageInsurance ?? null)],
          ["Other housing costs", formatCurrency(lead.housingExpense.otherHousingCosts ?? null)],
        ]} />
        <DetailCard title="Debt and notes" rows={[
          ["Down payment", formatCurrency(lead.downPayment.amount)],
          ["Debts", lead.debts.liabilities.length ? lead.debts.liabilities.map((debt) => `${debt.label}: ${formatCurrency(debt.monthlyPayment)}`).join(", ") : "None entered"],
          ["Notes", lead.notes ?? "None"],
        ]} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Audit history</h2>
        {auditEvents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">No audit events found for this lead.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {auditEvents.map((event) => (
              <li key={event.id} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">{event.type}</p>
                <p>{event.summary}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(event.occurredAt)} · {event.actor}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </article>
  );
}

function DetailCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(([label, value]) => <Metric key={label} label={label} value={value} />)}
      </dl>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-950">{value}</dd>
    </div>
  );
}

function formatCurrency(value: number | null): string {
  return typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value) : "Unavailable";
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "Unavailable";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
