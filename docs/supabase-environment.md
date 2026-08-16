# Supabase Environment Configuration

This project will use Supabase/Postgres for the Phase 2 backend foundation. Phase 2A Step 1 only adds local Supabase project configuration and environment documentation; it does not wire Supabase into the application yet.

## Browser-safe variables

Variables prefixed with `NEXT_PUBLIC_` are bundled into browser code by Next.js and are visible to users. Only publish values that are designed for client-side use.

Required browser-safe variables when Supabase client integration is added:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<supabase-anon-key>"
```

The Supabase anon key is intended for browser use when Row Level Security policies enforce tenant isolation and authorization. It must not be treated as a secret.

## Server-only variables

Server-only credentials must be available only to trusted server-side code, CI/CD secret stores, or deployment platform secret managers. Do not expose these values to the browser.

Expected server-only variables for later backend work:

```bash
SUPABASE_SERVICE_ROLE_KEY="<supabase-service-role-key>"
SUPABASE_DB_URL="postgresql://postgres:<password>@<host>:5432/postgres"
SUPABASE_JWT_SECRET="<supabase-jwt-secret>"
```

## Service-role safety rule

Service-role credentials bypass normal client authorization protections and must never reach browser code.

- Never prefix service-role credentials with `NEXT_PUBLIC_`.
- Never import service-role credentials in React components, client components, or browser-executed code.
- Never return service-role credentials from API responses.
- Never log service-role credentials.
- Use service-role credentials only in trusted server-only code paths that require privileged database access.

## Local development

The local Supabase configuration lives in `supabase/config.toml`.

When the Supabase CLI is introduced into the workflow, developers can run the local stack with:

```bash
supabase start
```

Local environment values should be kept in untracked local files such as `.env.local` or `.local/` notes. Do not commit secrets.

## Current scope

This recovery step does not add:

- Auth UI
- Supabase client integration
- Database-backed LeadStorage
- API routes
- Zod validation
- Upstash/rate limiting
- WhatsApp integration
- IronClaw skills or agent workflows
- Database migrations
