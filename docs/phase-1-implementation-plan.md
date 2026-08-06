# Phase 1 Implementation Plan

## Goal

Build a Vercel-deployable web MVP for mortgage broker Pooja to manually enter and prioritize fictional borrower leads. The app will calculate a clearly labeled preliminary back-end debt-to-income estimate, apply configurable lead-priority rules, recommend a next broker action, and preserve an audit trail for broker review and decisions.

## Non-goals and compliance guardrails

The application must not:

- Approve loans.
- Make final mortgage eligibility decisions.
- Issue pre-approvals.
- Automatically contact leads.
- Use real borrower data in the initial demo.
- Present lead-priority rules as underwriting, lending, or eligibility standards.

Required UI language:

- "Preliminary estimate requiring broker review."
- "Lead priority" instead of "loan eligibility."
- "Recommended broker action" instead of automated outreach.

Avoid language such as:

- Approved for a loan.
- Eligible.
- Guaranteed.
- Pre-approved.

## Proposed stack

- Next.js
- TypeScript
- Tailwind CSS
- Browser local storage for initial fictional/demo data
- Storage interface abstraction so local storage can later be replaced by a real database
- No unnecessary packages
- No paid services or external purchases

## Proposed pages

### `/`

Dashboard showing:

- MVP purpose and compliance disclaimer
- Lead counts by priority score
- Recent fictional leads
- Link to create a new lead

### `/leads/new`

Manual lead entry form with sections for:

1. Borrower contact information
2. Property information
3. Proposed monthly housing expense
4. Income information
5. Recurring monthly debt obligations
6. Down payment information
7. Purchase timeline
8. Optional broker notes
9. Optional explicit broker-selected manual review flag

The app will not interpret free-text broker notes to alter the score. Broker notes may only affect scoring when the broker explicitly selects a manual-review option.

### `/leads`

Lead list showing:

- Borrower name
- Lead priority score
- Preliminary back-end DTI estimate
- Timeline
- Recommendation
- Broker decision status
- Created timestamp

Suggested filters:

- Score
- Decision status
- Timeline

### `/leads/[id]`

Lead detail page showing:

- Complete source data
- Preliminary calculation details
- Scoring-rule version
- Score explanation
- Recommended broker action
- Broker decision controls:
  - Approve recommendation
  - Reject recommendation
  - Override recommendation
- Required override reason when overriding
- Lead-specific audit history

### `/audit`

Chronological audit trail showing:

- Event type
- Lead ID
- Complete input snapshot
- Scoring-rule version
- Calculation result
- Recommendation
- Broker decision
- Override reason, if any
- Timestamp

## Data model proposal

### Lead

```ts
type Lead = {
  id: string;
  borrower: BorrowerInfo;
  property: PropertyInfo;
  housingExpense: ProposedMonthlyHousingExpense;
  income: IncomeInfo;
  debts: DebtInfo;
  downPayment: DownPaymentInfo;
  timeline: PurchaseTimeline;
  notes?: string;
  manualReviewRequested: boolean;
  scoringResult: ScoringResult;
  brokerDecision?: BrokerDecision;
  createdAt: string;
  updatedAt: string;
};
```

### BorrowerInfo

```ts
type BorrowerInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContactMethod: "email" | "phone" | "text";
};
```

### PropertyInfo

```ts
type PropertyInfo = {
  estimatedPurchasePrice: number;
  propertyType: "single_family" | "condo" | "townhome" | "multi_family" | "other";
  intendedUse: "primary_residence" | "second_home" | "investment";
  city: string;
  state: string;
};
```

### ProposedMonthlyHousingExpense

```ts
type ProposedMonthlyHousingExpense = {
  estimatedPrincipalAndInterest: number;
  estimatedPropertyTaxes: number;
  estimatedHomeownersInsurance: number;
  estimatedMortgageInsurance: number;
  estimatedHoaDues: number;
};
```

### IncomeInfo

```ts
type IncomeInfo = {
  grossMonthlyIncome: number;
  employmentType: "w2" | "self_employed" | "contractor" | "retired" | "other";
  employmentDurationMonths: number;
};
```

### DebtInfo

```ts
type DebtInfo = {
  creditCardMonthlyPayment: number;
  autoLoanMonthlyPayment: number;
  studentLoanMonthlyPayment: number;
  otherMonthlyDebtPayment: number;
};
```

### DownPaymentInfo

```ts
type DownPaymentInfo = {
  amount: number;
  source: "savings" | "gift" | "sale_of_property" | "retirement" | "other";
};
```

### ScoringResult

```ts
type ScoringResult = {
  ruleVersion: string;
  proposedMonthlyHousingExpenseTotal: number;
  recurringMonthlyDebtTotal: number;
  preliminaryBackEndDtiRatio: number;
  downPaymentPercent: number;
  score: "Hot" | "Warm" | "Cold" | "Not Ready" | "Manual Review";
  explanation: string[];
  recommendedAction: string;
  createdAt: string;
};
```

### BrokerDecision

```ts
type BrokerDecision = {
  decision: "approved_recommendation" | "rejected_recommendation" | "overridden";
  finalLeadPriority?: "Hot" | "Warm" | "Cold" | "Not Ready" | "Manual Review";
  overrideReason?: string;
  decidedAt: string;
};
```

### AuditEvent

```ts
type AuditEvent = {
  id: string;
  leadId: string;
  eventType:
    | "lead_created"
    | "score_generated"
    | "recommendation_approved"
    | "recommendation_rejected"
    | "recommendation_overridden";
  completeInputSnapshot: LeadInputSnapshot;
  scoringRuleVersion: string;
  calculationResult?: {
    proposedMonthlyHousingExpenseTotal: number;
    recurringMonthlyDebtTotal: number;
    preliminaryBackEndDtiRatio: number;
    downPaymentPercent: number;
  };
  recommendation?: string;
  scoringResult?: ScoringResult;
  brokerDecision?: BrokerDecision;
  overrideReason?: string;
  timestamp: string;
};
```

## Preliminary calculation

Rule version: `lead-priority-v1.0.0`

```ts
proposedMonthlyHousingExpenseTotal =
  estimatedPrincipalAndInterest +
  estimatedPropertyTaxes +
  estimatedHomeownersInsurance +
  estimatedMortgageInsurance +
  estimatedHoaDues;

recurringMonthlyDebtTotal =
  creditCardMonthlyPayment +
  autoLoanMonthlyPayment +
  studentLoanMonthlyPayment +
  otherMonthlyDebtPayment;

preliminaryBackEndDtiRatio =
  (proposedMonthlyHousingExpenseTotal + recurringMonthlyDebtTotal) /
  grossMonthlyIncome;

downPaymentPercent = downPaymentAmount / estimatedPurchasePrice;
```

The UI must label this as a preliminary back-end DTI estimate requiring broker review.

## Configurable lead-priority rules

The thresholds below are initial configurable lead-priority rules, not underwriting or loan-eligibility standards.

### Manual Review

Assign Manual Review if:

- Broker explicitly selects manual review.
- Gross monthly income is missing or zero.
- Property price is missing or zero.
- Preliminary back-end DTI cannot be calculated.
- Down payment exceeds property price.
- Any key numeric field is negative.
- Required fields are incomplete.

### Hot

Suggested conditions:

- Preliminary back-end DTI <= 36%.
- Down payment >= 10%.
- Timeline is 0-30 days or 31-90 days.
- Required data is complete.

Recommended action:

- Prioritize follow-up and schedule a broker consultation.

### Warm

Suggested conditions:

- Preliminary back-end DTI > 36% and <= 45%, or
- Down payment is 5%-10%, or
- Timeline is 3-6 months.

Recommended action:

- Follow up, clarify goals, and discuss readiness steps.

### Cold

Suggested conditions:

- Preliminary back-end DTI > 45% and <= 55%, or
- Down payment < 5%, or
- Timeline is 6+ months.

Recommended action:

- Add to nurture list and revisit when financial profile or timeline improves.

### Not Ready

Suggested conditions:

- Preliminary back-end DTI > 55%, or
- Timeline is Just Browsing, or
- Down payment is unavailable and purchase timeline is not urgent.

Recommended action:

- Provide general readiness guidance and do not treat as an active mortgage opportunity yet.

## Persistence approach

Initial MVP:

- Browser local storage only.
- Fictional/demo data only.

Persistence must be isolated behind a storage interface, for example:

```ts
interface LeadStorage {
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  saveLead(lead: Lead): Promise<void>;
  listAuditEvents(): Promise<AuditEvent[]>;
  saveAuditEvent(event: AuditEvent): Promise<void>;
}
```

This keeps the app ready for later replacement with a real database.

## Testing approach

### Unit tests

Test:

- Proposed monthly housing expense total.
- Recurring debt total.
- Preliminary back-end DTI calculation.
- Down-payment percentage.
- Manual review conditions.
- Hot/Warm/Cold/Not Ready configurable priority rules.
- Explanation generation.
- Recommendation generation.
- Audit event creation.

### Manual QA

Verify:

- Lead form validation.
- Score and calculation appear after submission.
- Calculation is labeled preliminary and requiring broker review.
- Audit record includes complete input snapshot.
- Broker can approve recommendation.
- Broker can reject recommendation.
- Broker can override with a required reason.
- Free-text notes do not automatically affect score.
- Manual-review checkbox can explicitly trigger Manual Review.

### Safety checks

Verify:

- No page says a lead is approved for a loan.
- No page makes eligibility or underwriting claims.
- No automated contact behavior exists.
- Fictional/demo-data disclaimer is visible.
- Scoring-rule version is recorded with every score.

## Build order

1. Scaffold Next.js, TypeScript, and Tailwind CSS.
2. Add global layout and compliance disclaimer.
3. Define domain types.
4. Define configurable lead-priority rule constants.
5. Implement preliminary calculation and scoring engine.
6. Add unit tests for calculations and scoring.
7. Implement local-storage-backed storage interface.
8. Build lead entry page.
9. Build lead list page.
10. Build lead detail page and broker decision controls.
11. Build audit trail page.
12. Add fictional sample data.
13. Run final tests and build.
14. Prepare Vercel deployment notes.

## Current instruction boundary

Application code must not be written until the user explicitly approves starting implementation after reviewing this plan and repository setup.
