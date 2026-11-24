# StopBucks — Phase 3 Remediation Report

## Executive summary

Phase 3 remediation implemented the highest-risk confirmed correctness and session-isolation fixes. Monetary values remain integer minor units and the domain layer remains pure. The guest path, financial calculations, parser fallback, vault resolution, and production webpack build are verified locally.

The application is materially safer for Phase 4, but live Supabase/Gemini verification remains pending because this environment has neither configured credentials nor a database. Process-local rate limiting is also not a substitute for deployment-level distributed rate limiting.

## Implemented remediation

- **FIN-002 / TEST-001:** Runway and burn calculations exclude transactions after the supplied reference instant; entries remain in the ledger. Seed timestamps are clamped to the injected reference instant.
- **FIN-001 / DATA-008:** Financial views pass browser timezone explicitly to pure domain functions and refresh the runway reference clock every minute. Radar analysis uses the current calendar month in that timezone and labels the period accurately.
- **FIN-006:** `analyzeBiases` accepts an explicit time window; Radar filters every detector to one current-month transaction set.
- **DATA-001 / DATA-004 / DATA-005 / ARCH-002:** Query keys now include mode and identity. Repository transitions cancel and clear cache before a new identity reads. App routes show an explicit access gate when no session exists; they no longer render guest data implicitly. Onboarding invalidates the active profile and transaction caches after persistence.
- **Session controls:** Desktop navigation now exposes Exit Sandbox for guests and Sign Out for authenticated users.
- **DATA-003:** Rescue now enforces the same unlock instant as purchase in both repository implementations. The Supabase update includes an `unlock_at <= now` predicate.
- **FIN-003:** The deterministic parser prefers explicitly currency-marked values or the final plausible amount, rejects a lone `1 coffee`, and identifies explicit cash payment.
- **FIN-004:** Onboarding now converts monetary input with `parseAmountStringToMinor`, avoiding float-to-minor conversion.
- **PWA/config:** Turbopack root uses the repository path rather than a developer-specific path.

## Regression coverage

The suite now has **117 passing tests**. Added coverage includes future consumption/investment exclusion, exact-reference inclusion, Kolkata month-boundary handling, quantity-versus-price parsing, cash detection, and early vault rescue rejection. Existing vault atomic-purchase and CSV compatibility coverage remains green.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Passed — 117 tests |
| `npx next build --webpack` | Passed |
| `npm run build` (Turbopack) | Blocked by host-level process/port restriction during CSS worker execution; webpack production build passed |

## Deferred / environment-dependent work

- Supabase RLS, profile upsert, row-validation mappings, and RPC behaviour require a real Supabase project and migration execution.
- Gemini model selection, cancellation, structured-response smoke tests, and guest server authorization require a configured server key/session secret and live credentials. No live Gemini claim is made.
- Process-local rate limiting remains deployment-limited; use a distributed store/adapter for multi-instance production.
- Comprehensive browser-device accessibility and responsive checks require an interactive browser session; chart accessibility and broad UI typography review should be completed before public launch.
- Existing migrations `0001_initial_schema.sql` and `0002_vault_purchase_rpc.sql` were not modified.

## Production readiness

The verified guest experience and deterministic fallback are suitable for a controlled demo and further Phase 4 work. Do not declare the authenticated/AI production path fully ready until the deferred live Supabase, Gemini, API authorization/rate-limit, and browser accessibility checks have passed.
