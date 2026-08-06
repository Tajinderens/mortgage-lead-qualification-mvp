import { describe, expect, it } from "vitest";
import { createLeadCreatedAuditEvent, createScoreGeneratedAuditEvent } from "@/lib/domain/audit";
import { scoreLeadPriority } from "@/lib/domain/scoring";
import type { Lead } from "@/lib/domain/types";
import { validateLeadFormValues, type LeadFormValues } from "@/lib/forms/lead-form";
import { submitLeadForm } from "@/lib/forms/submit-lead";
import { BrowserLocalStorageLeadStorage } from "@/lib/storage/lead-storage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const validValues: LeadFormValues = {
  firstName: "Fictional",
  lastName: "Borrower",
  email: "fictional.borrower@example.test",
  phone: "555-0100",
  estimatedPurchasePrice: "400000",
  propertyUse: "primaryResidence",
  grossMonthlyIncome: "10000",
  otherMonthlyIncome: "0",
  principalAndInterest: "1800",
  propertyTaxes: "400",
  homeownersInsurance: "150",
  hoaDues: "50",
  mortgageInsurance: "0",
  otherHousingCosts: "0",
  statedTotalMonthlyHousingExpense: "",
  debtLabel: "Fictional auto loan",
  debtMonthlyPayment: "300",
  downPaymentAmount: "80000",
  notes: "Fictional/demo data only.",
};

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead_test_001",
    borrower: { firstName: "Fictional", lastName: "Borrower" },
    property: { estimatedPurchasePrice: 400000, propertyUse: "primaryResidence" },
    income: { grossMonthlyIncome: 10000 },
    debts: { liabilities: [{ label: "Fictional debt", monthlyPayment: 300 }] },
    housingExpense: { statedTotalMonthlyHousingExpense: 2400 },
    downPayment: { amount: 80000 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("browser lead storage", () => {
  it("saves and loads leads", async () => {
    const storage = new BrowserLocalStorageLeadStorage(new MemoryStorage());
    const lead = makeLead({ scoringResult: scoreLeadPriority(makeLead()) });

    await storage.saveLead(lead);

    await expect(storage.getLead(lead.id)).resolves.toEqual(lead);
    await expect(storage.listLeads()).resolves.toEqual([lead]);
  });

  it("returns null for missing lead IDs", async () => {
    const storage = new BrowserLocalStorageLeadStorage(new MemoryStorage());

    await expect(storage.getLead("missing-lead-id")).resolves.toBeNull();
  });
});

describe("audit events", () => {
  it("creates and stores lead-created and score-generated audit events", async () => {
    const storage = new BrowserLocalStorageLeadStorage(new MemoryStorage());
    const lead = makeLead();
    const score = scoreLeadPriority(lead);

    await storage.saveAuditEvent(createLeadCreatedAuditEvent(lead, "2026-01-01T00:00:00.000Z"));
    await storage.saveAuditEvent(createScoreGeneratedAuditEvent(lead, score, "2026-01-01T00:01:00.000Z"));

    const events = await storage.listAuditEvents(lead.id);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual(["lead.created", "scoring.calculated"]);
    expect(events[1].metadata).toEqual(expect.objectContaining({ ruleVersion: score.ruleVersion, priority: score.priority }));
  });
});

describe("lead form validation", () => {
  it("rejects required, zero, negative, and conflicting inputs", () => {
    const errors = validateLeadFormValues({
      ...validValues,
      firstName: "",
      estimatedPurchasePrice: "0",
      grossMonthlyIncome: "-1",
      statedTotalMonthlyHousingExpense: "2400",
      principalAndInterest: "1800",
    });

    expect(errors.firstName).toContain("required");
    expect(errors.estimatedPurchasePrice).toContain("greater than zero");
    expect(errors.grossMonthlyIncome).toContain("negative");
    expect(errors.housingExpense).toContain("either stated total housing expense or component expenses");
  });
});

describe("lead form submission", () => {
  it("saves a successfully submitted lead with score and audit history", async () => {
    const storage = new BrowserLocalStorageLeadStorage(new MemoryStorage());

    const result = await submitLeadForm(validValues, storage, "2026-01-01T00:00:00.000Z");

    expect(result.errors).toEqual({});
    expect(result.leadId).toBeTruthy();
    const lead = await storage.getLead(result.leadId ?? "");
    expect(lead?.scoringResult?.metrics.preliminaryBackendDtiPercent).toBe(27);
    expect(lead?.scoringResult?.metrics.downPaymentPercent).toBe(20);
    const events = await storage.listAuditEvents(result.leadId);
    expect(events.map((event) => event.type)).toEqual(["lead.created", "scoring.calculated"]);
  });

  it("does not save invalid form inputs", async () => {
    const storage = new BrowserLocalStorageLeadStorage(new MemoryStorage());

    const result = await submitLeadForm({ ...validValues, lastName: "", downPaymentAmount: "-10" }, storage);

    expect(result.leadId).toBeUndefined();
    expect(result.errors.lastName).toContain("required");
    expect(result.errors.downPaymentAmount).toContain("negative");
    await expect(storage.listLeads()).resolves.toEqual([]);
  });
});
