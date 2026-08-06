"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitLeadForm } from "@/lib/forms/submit-lead";
import { validateLeadFormValues, type LeadFormErrors, type LeadFormValues } from "@/lib/forms/lead-form";
import { BrowserLocalStorageLeadStorage, type LeadStorage } from "@/lib/storage/lead-storage";

const initialValues: LeadFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  estimatedPurchasePrice: "",
  propertyUse: "primaryResidence",
  grossMonthlyIncome: "",
  otherMonthlyIncome: "",
  principalAndInterest: "",
  propertyTaxes: "",
  homeownersInsurance: "",
  hoaDues: "",
  mortgageInsurance: "",
  otherHousingCosts: "",
  statedTotalMonthlyHousingExpense: "",
  debtLabel: "Fictional monthly debt",
  debtMonthlyPayment: "",
  downPaymentAmount: "",
  notes: "Fictional/demo lead only.",
};

export function NewLeadForm({ storage }: { storage?: LeadStorage }) {
  const router = useRouter();
  const leadStorage = useMemo(() => storage ?? new BrowserLocalStorageLeadStorage(), [storage]);
  const [values, setValues] = useState<LeadFormValues>(initialValues);
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(null);

    const nextErrors = validateLeadFormValues(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const result = await submitLeadForm(values, leadStorage);
      if (result.leadId) {
        router.push(`/leads/${result.leadId}`);
      }
    } catch {
      setSubmissionError("Unable to save this fictional lead in browser storage. Please try again.");
    }
  }

  function updateValue(field: keyof LeadFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Fictional/demo lead entry</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">New Lead</h1>
        <p className="mt-4 max-w-3xl text-slate-700">
          Enter fictional borrower information only. This workflow calculates preliminary lead-priority estimates requiring broker review and never approves loans or contacts leads.
        </p>
      </section>

      {submissionError ? <ErrorBanner message={submissionError} /> : null}
      {errors.housingExpense ? <ErrorBanner message={errors.housingExpense} /> : null}

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-slate-950">Borrower</legend>
        <TextField label="First name" value={values.firstName} error={errors.firstName} onChange={(value) => updateValue("firstName", value)} required />
        <TextField label="Last name" value={values.lastName} error={errors.lastName} onChange={(value) => updateValue("lastName", value)} required />
        <TextField label="Email" value={values.email} onChange={(value) => updateValue("email", value)} />
        <TextField label="Phone" value={values.phone} onChange={(value) => updateValue("phone", value)} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-slate-950">Property and income</legend>
        <TextField label="Estimated purchase price" type="number" value={values.estimatedPurchasePrice} error={errors.estimatedPurchasePrice} onChange={(value) => updateValue("estimatedPurchasePrice", value)} required />
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Property use
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950" value={values.propertyUse} onChange={(event) => updateValue("propertyUse", event.target.value)}>
            <option value="primaryResidence">Primary residence</option>
            <option value="secondHome">Second home</option>
            <option value="investment">Investment</option>
          </select>
        </label>
        <TextField label="Gross monthly income" type="number" value={values.grossMonthlyIncome} error={errors.grossMonthlyIncome} onChange={(value) => updateValue("grossMonthlyIncome", value)} required />
        <TextField label="Other monthly income" type="number" value={values.otherMonthlyIncome} error={errors.otherMonthlyIncome} onChange={(value) => updateValue("otherMonthlyIncome", value)} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-slate-950">Housing expense</legend>
        <div className="md:col-span-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          Use either stated total housing expense or all component fields. Do not enter both.
        </div>
        <TextField label="Stated total monthly housing expense" type="number" value={values.statedTotalMonthlyHousingExpense} error={errors.statedTotalMonthlyHousingExpense} onChange={(value) => updateValue("statedTotalMonthlyHousingExpense", value)} />
        <div className="hidden md:block" />
        <TextField label="Principal and interest" type="number" value={values.principalAndInterest} error={errors.principalAndInterest} onChange={(value) => updateValue("principalAndInterest", value)} />
        <TextField label="Property taxes" type="number" value={values.propertyTaxes} error={errors.propertyTaxes} onChange={(value) => updateValue("propertyTaxes", value)} />
        <TextField label="Homeowners insurance" type="number" value={values.homeownersInsurance} error={errors.homeownersInsurance} onChange={(value) => updateValue("homeownersInsurance", value)} />
        <TextField label="HOA dues" type="number" value={values.hoaDues} error={errors.hoaDues} onChange={(value) => updateValue("hoaDues", value)} />
        <TextField label="Mortgage insurance" type="number" value={values.mortgageInsurance} error={errors.mortgageInsurance} onChange={(value) => updateValue("mortgageInsurance", value)} />
        <TextField label="Other housing costs" type="number" value={values.otherHousingCosts} error={errors.otherHousingCosts} onChange={(value) => updateValue("otherHousingCosts", value)} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <legend className="px-2 text-lg font-semibold text-slate-950">Debt and down payment</legend>
        <TextField label="Debt label" value={values.debtLabel} error={errors.debtLabel} onChange={(value) => updateValue("debtLabel", value)} />
        <TextField label="Debt monthly payment" type="number" value={values.debtMonthlyPayment} error={errors.debtMonthlyPayment} onChange={(value) => updateValue("debtMonthlyPayment", value)} />
        <TextField label="Down payment amount" type="number" value={values.downPaymentAmount} error={errors.downPaymentAmount} onChange={(value) => updateValue("downPaymentAmount", value)} required />
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
          Notes
          <textarea className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950" value={values.notes} onChange={(event) => updateValue("notes", event.target.value)} />
        </label>
      </fieldset>

      <button type="submit" className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">
        Save fictional lead and calculate score
      </button>
    </form>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      {props.label} {props.required ? <span className="text-red-700">*</span> : null}
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950"
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-invalid={Boolean(props.error)}
      />
      {props.error ? <span className="block text-sm text-red-700">{props.error}</span> : null}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{message}</div>;
}
