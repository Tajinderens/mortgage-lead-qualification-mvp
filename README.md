# Mortgage Lead Qualification MVP

Private Phase 1 MVP for a web-based mortgage lead generation and qualification tool for mortgage broker Pooja.

## Purpose

The application will help a mortgage broker manually capture fictional borrower lead data, calculate a clearly labeled preliminary back-end debt-to-income estimate, assign a configurable lead-priority score, recommend a next broker action, and record broker decisions in an audit trail.

## Important guardrails

- Fictional/demo data only for the initial MVP.
- This tool does **not** approve loans.
- This tool does **not** make final eligibility, underwriting, or pre-approval decisions.
- This tool does **not** automatically contact leads.
- Lead scores are configurable lead-priority rules, not lending or underwriting standards.
- Every calculated result is a preliminary estimate requiring broker review.

## Approved planning document

See [docs/phase-1-implementation-plan.md](docs/phase-1-implementation-plan.md).

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Browser local storage for the initial fictional demo
- Storage isolated behind an interface for later replacement with a real database

## Current status

Planning only. Application code has not been written yet.
