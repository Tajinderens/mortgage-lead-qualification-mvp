# Phase 2 Implementation Plan

## Phase 2A — Backend + Security Foundation

### Planned database foundation

- Move lead, qualification, audit, integration, and agent-event data into a managed relational database suitable for production use.
- Define explicit tables for leads, lead intake events, qualification snapshots, agent decisions, enrichment requests, webhook deliveries, users, organizations, and audit records.
- Add stable primary keys, foreign keys, timestamps, and status fields so every lead can be traced from intake through qualification and handoff.
- Store structured qualification data separately from raw intake payloads to support reporting, filtering, and future automation.
- Add database indexes for common access paths: lead status, assigned owner, source, created date, phone/email lookup, and organization/tenant scope.

### Authentication and authorization

- Introduce a production auth provider for administrative users and internal operators.
- Define roles for owner/admin, processor, reviewer, read-only viewer, and service accounts.
- Require authenticated access for dashboards, lead management, exports, audit views, and manual override actions.
- Separate human user sessions from machine/service credentials used by webhooks, enrichment providers, and IronClaw workflows.
- Enforce least-privilege access for every API route and background job.

### Row Level Security and tenant isolation

- Enable Row Level Security on production tables that contain lead, user, organization, audit, and integration data.
- Scope every lead and related record to an organization or tenant identifier.
- Add RLS policies for read, insert, update, and service-role access.
- Verify that users can only access records for organizations they belong to.
- Keep service-role usage narrowly limited to trusted backend paths and never expose service credentials to client-side code.

### API validation and contracts

- Add schema validation for every inbound API route, webhook, and internal mutation.
- Validate required fields, types, string lengths, enums, phone/email formats, source identifiers, and metadata shape.
- Normalize external provider payloads before persistence.
- Reject malformed requests with safe error messages that do not leak internal details.
- Version public or integration-facing API contracts where breaking changes are possible.

### Secrets and configuration management

- Move all credentials, tokens, webhook secrets, database URLs, and provider keys into managed environment secrets.
- Document required environment variables for local development, preview, and production.
- Rotate any development or prototype secrets before production use.
- Ensure secrets are never logged, returned in API responses, stored in client bundles, or committed to the repository.
- Use separate credentials per environment and per external integration where supported.

### Rate limiting and abuse protection

- Add rate limits for public intake endpoints, webhook endpoints, auth-sensitive routes, and enrichment-triggering APIs.
- Use stricter limits for unauthenticated traffic and more generous limits for authenticated internal users.
- Add request size limits and reject unexpectedly large payloads.
- Track suspicious repeated failures, invalid webhook signatures, and high-volume submissions.
- Design limits so legitimate campaign traffic can be increased deliberately without removing protections.

### CI security checks

- Add dependency vulnerability scanning to CI.
- Add secret scanning for committed files and pull requests.
- Add lint/type/test gates for security-sensitive backend and integration changes.
- Add checks for unsafe dependency updates, known vulnerable packages, and accidental exposure of server-only environment variables.
- Require CI to pass before merging Phase 2 backend, auth, and integration work.

### Audit persistence

- Persist audit records for lead creation, qualification changes, status changes, assignment changes, manual overrides, exports, webhook processing, enrichment calls, and agent actions.
- Include actor type, actor identifier, timestamp, target record, action, result, and relevant non-sensitive metadata.
- Avoid storing secrets, full credentials, or unnecessary sensitive payloads in audit logs.
- Make audit records append-only for normal application paths.
- Add retention and export expectations before handling production lead volume.

### Migration from the current storage interface

- Preserve the current storage interface as an application boundary while replacing the underlying implementation.
- Create a database-backed implementation that matches the existing read/write semantics before changing callers.
- Add migration scripts or one-time import tooling for any existing prototype data that must be retained.
- Run the old and new storage implementations against equivalent tests where possible.
- Cut over in stages: schema creation, database adapter, validation hardening, audit persistence, then removal or deprecation of prototype-only storage behavior.

## Phase 2B — WhatsApp Lead Intake

- Define the WhatsApp intake flow for new mortgage leads, including consent language, required fields, follow-up questions, and opt-out handling.
- Add webhook verification and signature validation for the selected WhatsApp provider.
- Normalize inbound WhatsApp messages into lead intake events.
- Link message threads to existing leads when phone numbers or provider conversation IDs match.
- Queue qualification follow-ups when required information is missing.
- Persist inbound and outbound message metadata without storing unnecessary sensitive content.
- Add operational handling for duplicate submissions, malformed provider payloads, retries, and delivery failures.

## Phase 2C — IronClaw Agent Rules / Skills

- Define agent rules for lead triage, qualification confidence, missing-information detection, escalation, and human-review handoff.
- Create skills or workflow prompts for summarizing new leads, detecting urgency, drafting follow-up questions, and preparing broker handoff notes.
- Require the agent to cite structured lead fields and audit records when recommending actions.
- Prevent the agent from making final lending, affordability, or eligibility decisions without approved business rules and human oversight.
- Add safeguards for regulated financial advice, sensitive personal data, hallucinated facts, and unsupported claims.
- Persist agent actions and recommendations to the audit trail.
- Add review workflows for tuning prompts, qualification criteria, and escalation thresholds.

## Phase 2D — Lead Generation & Enrichment Integrations

- Identify priority lead sources, enrichment providers, CRM destinations, and broker handoff channels.
- Define provider-specific API contracts, auth models, quotas, retry behavior, and data retention expectations.
- Normalize all generated and enriched data into the lead data model with source attribution.
- Track enrichment request status, provider response metadata, cost-related fields, and failure reasons.
- Add deduplication rules across campaign sources, WhatsApp submissions, imported lists, and CRM callbacks.
- Require explicit allowlists for outbound enrichment and CRM sync destinations.
- Add monitoring for provider failures, rate-limit responses, stale credentials, and unexpected payload changes.
