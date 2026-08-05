export type LeadPriority = "Hot" | "Warm" | "Cold" | "Not Ready" | "Manual Review";

export interface BorrowerInfo {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface PropertyInfo {
  estimatedPurchasePrice: number;
  propertyUse: "primaryResidence" | "secondHome" | "investment";
}

export interface IncomeInfo {
  grossMonthlyIncome: number;
  otherMonthlyIncome?: number;
}

export interface DebtLiability {
  label: string;
  monthlyPayment: number;
}

export interface DebtInfo {
  liabilities: DebtLiability[];
}

export interface HousingExpenseInfo {
  principalAndInterest?: number;
  propertyTaxes?: number;
  homeownersInsurance?: number;
  hoaDues?: number;
  mortgageInsurance?: number;
  otherHousingCosts?: number;
  statedTotalMonthlyHousingExpense?: number;
}

export interface DownPaymentInfo {
  amount: number;
}

export interface Lead {
  id: string;
  borrower: BorrowerInfo;
  property: PropertyInfo;
  income: IncomeInfo;
  debts: DebtInfo;
  housingExpense: HousingExpenseInfo;
  downPayment: DownPaymentInfo;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ValidationSeverity = "warning" | "error";

export interface ValidationIssue {
  field: string;
  code:
    | "missing"
    | "zero"
    | "negative"
    | "conflicting"
    | "greaterThanPropertyPrice"
    | "notFinite";
  message: string;
  severity: ValidationSeverity;
}

export interface ScoringMetrics {
  totalRecurringMonthlyDebt: number | null;
  totalProposedMonthlyHousingExpense: number | null;
  preliminaryBackendDtiPercent: number | null;
  downPaymentPercent: number | null;
}

export interface ScoringResult {
  ruleVersion: string;
  priority: LeadPriority;
  score: number;
  metrics: ScoringMetrics;
  validationIssues: ValidationIssue[];
  reasons: string[];
  recommendedNextAction: string;
}

export type BrokerDecisionStatus = "approvedForContact" | "rejected" | "override" | "needsMoreInformation";

export interface BrokerDecision {
  leadId: string;
  status: BrokerDecisionStatus;
  decidedBy: string;
  decidedAt: string;
  rationale: string;
}

export type AuditEventType =
  | "lead.created"
  | "lead.updated"
  | "scoring.calculated"
  | "brokerDecision.recorded";

export interface AuditEvent {
  id: string;
  leadId: string;
  type: AuditEventType;
  occurredAt: string;
  actor: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}
