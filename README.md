# StopBucks

**Behavioral Finance Operating System & Gamified Training Dojo for College Students**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_RLS-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-14.14.0-0055FF?style=flat-square&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Vitest](https://img.shields.io/badge/Vitest-291%2F291_passing-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Private-475569?style=flat-square)](#)

<!-- TODO: Add Vercel & Video URLs -->
> **Submission Links**
> - **Live Demo URL (Vercel):** `<!-- TODO: Insert deployed Vercel URL -->`
> - **5-Minute Demo Video:** `<!-- TODO: Insert 5-minute walkthrough video URL -->`
> - **Instant Guest Access:** Click **Try Instant Demo (Guest)** on `/` to launch the preloaded 30-day student dataset with zero sign-up required.

---

## Why StopBucks Exists

Standard expense trackers are post-mortem ledgers: they categorize *what* you spent after the money has already left your account. Meanwhile, traditional financial literacy education assumes a student standing at a late-night checkout will pause, run mental arithmetic, and behave rationally.

Empirical behavioral finance demonstrates why both fail together:
1. **Literacy breaks down under cognitive load.** In Ma, Ge, Gu & Ding (2026), objective financial literacy did not significantly buffer the impulsivity-to-delinquency pathway (`p = 0.611`), whereas emotional strain drove a sharp shift toward hedonic digital-credit spending (`55.6%` → `79.9%`).
2. **Digital payments decouple spending from pain.** Instant QR scans, UPI taps, and deferred installments weaken the psychological "pain of paying" (Prelec & Loewenstein, 1998), making micro-transactions feel free until month-end.
3. **Present bias beats willpower.** Under quasi-hyperbolic discounting (Laibson, 1997), instant liquidity removes commitment barriers and exposes tomorrow's essentials to today's impulses.

**StopBucks** addresses this gap as a **zero-guilt, behavioral-friction operating system** engineered for college and university students managing fixed monthly allowances (`INR`, `HKD`, `USD`). Instead of shaming past transactions, it separates protected growth from consumption, translates prices into work hours and 4-year opportunity cost, enforces a 48-hour cooling-off commitment delay, and trains checkout reflexes directly against the student's live ledger.

---

## Core Feature Modules

### 1. Feature Spotlight — Behavioral Dojo (`/dojo`)

StopBucks Dojo turns 12 peer-reviewed behavioral-finance and student-economics studies into an interactive 3-world curriculum connected directly to the student's own financial telemetry.

#### 3-World × 9-Level Winding S-Curve Skill Map
`src/lib/dojo-map-layout.ts` computes deterministic sinusoidal coordinates (`DOJO_S_CURVE_LANES = [0, 1, 0, -1, 0, 1, 0, -1, 0]`) and cubic Bézier SVG connectors across three progressive worlds with World Bosses on Levels 3 & 6 and a Final Boss on Level 9:

| World | Theme | Levels | Boss Encounter |
| --- | --- | --- | --- |
| **World 1** | *The Impulse Mind* — Spotting invisible money scripts & frictionless traps | Levels 1–3 | **Level 3:** *The Frictionless Trap* (11:45 PM BNPL Boss) |
| **World 2** | *Mental Buckets & Framing* — Acquisition vs. transaction utility & System 2 checks | Levels 4–6 | **Level 6:** *Mental Buckets & Category Blur* |
| **World 3** | *Resilience & Commitment* — Unexpected shock buffers & illiquid commitment devices | Levels 7–9 | **Level 9 (Final Boss):** *Golden Eggs & The Liquidity Trap* |

#### 5-Beat Full-Screen Training Arena (`DojoLessonArena`)
Each level launches a distraction-free `100dvh` arena with a segmented 5-beat progress bar, **3 Focus Shields**, a live **Combo Flame** (`2x+` streak), scoped keyboard navigation (`Enter` to continue feedback, `Escape` exit confirmation), and zero-asset audio cues:

1. **Beat 1 — Research Wager (`MythBetWidget`):** Predict an empirical study's outcome before animated comparison bars and the source citation reveal.
2. **Beat 2 — Rotated Interactive Concept Mechanics:**
   - **`ImpulseDuelWidget` (Levels 1, 3, 5):** Multi-round Planner vs. Doer / System 2 duels against realistic System 1 excuses, charging the **Planner Shield** meter.
   - **`InteractiveSliderWidget` (Levels 2, 9):** Interactive parameter labs with zero-penalty exploration and single-shot target lock-in—featuring the **Payment Mode Coupling Spectrum** (`evaluatePrelecCoupling`: Cash → UPI/Card → Flat-Rate/BNPL) in Level 2, and a live SVG **Quasi-Hyperbolic Discounting Curve** ($\delta^t$ vs. $\beta\delta^t$, piecewise-linear Laibson 1997 Table II welfare loss across $\beta \in [0.4, 1.0]$) in Level 9 (plus a `broad_bracket_zoom` projection utility in the engine).
   - **`BucketSortWidget` (Levels 4, 6):** Dynamic 2-bucket (*Real Acquisition Value* vs. *Transaction-Utility Trap*) and 3-bucket (*Fixed Commitments*, *Discretionary Burn*, *Protected Invest-in-Self*) item classifiers.
   - **`FeedbackLoopWidget` (Levels 7, 8):** 3-stage tactical stability meters modeling sudden campus expense shocks and Scheier & Carver's *Monitor–Compare–Adjust* feedback loop.
3. **Beat 3 — Live Personal Data Mirror (`PersonalMirrorCard` + `buildDojoPersonalMirror`):** Bridges theory to practice by computing deterministic, timezone-aware metrics from the student's actual current-month non-future ledger, fixed commitments, and 48h Vault items (e.g., Planner Moves vs. Doer Impulses, Cashless Micro-Taps vs. Prepayment Shield, Hedonic Share vs. Ma et al. cohorts, Annualized & 4-Year Compounded routine spend, Deliberative Planning Index, 3-Bucket separation, Robb's 4-habit Self-Efficacy score & Shock Cushion, Mid-Month Deficit Watch, and Protected Golden Eggs vs. Exposed Liquid Pool). Handles loading/error/empty states strictly without inventing metrics.
4. **Beat 4 — Applied Mastery Check (`MasteryCheckWidget`):** Three applied comprehension checks per level paired with the safe-area docked `LessonFeedbackTray`.
5. **Beat 5 — Victory Celebration & Progression (`LevelClearOverlay`, `DojoTrophyDrawer`):**
   - **5-Belt Rank Ladder (`DOJO_BELT_TIERS`):**
     `White Belt` (*Impulse Rookie*, 0 XP) → `Yellow Belt` (*Bias Spotter*, 200 XP) → `Green Belt` (*Friction Architect*, 450 XP) → `Blue Belt` (*Bucket Strategist*, 750 XP) → `Black Belt` (*Golden Egg Master*, 1,100+ XP; `1,480 XP` max across all 9 levels with perfect bonuses).
   - **9 Collectible Mastery Badges & Timezone-Safe Streaks:** One unique badge per level (`unlockedBadges` derived strictly from `completedLevels`), plus `currentStreak` / `longestStreak` evaluated on local calendar date keys (`YYYY-MM-DD`).
   - **Anti-Farming XP Rules:** Replaying a completed level increments `replayCount` and preserves `bestAccuracyPct` while awarding `0` duplicate XP (only granting a missed `perfectBonusXp` if accuracy improves to `100%`).
   - **Zero-Asset Web Audio API Synthesizer (`src/lib/sound-fx.ts`):** SSR-safe oscillator + gain envelope synthesizer (`playTap`, combo-scaled `playCorrect`, gentle `playWrong`, 45 ms throttled `playSliderTick`, `playMirrorReveal`, and `playVictory` C5–E5–G5–C6 arpeggio) with persisted `soundMuted` preference.

#### 12 Verified Peer-Reviewed Studies (`src/domain/dojo-curriculum.ts` & `src/lib/dojo-citations.ts`)

| # | Authors & Year | Publication | Core Empirical Concept | Dojo Level |
| --- | --- | --- | --- | --- |
| 1 | **Strömbäck, Lind, Skagerlund, Västfjäll & Tinghög (2017)** | *J. Behavioral and Experimental Finance*, 14, 30–38 | Self-control (FMBS `3.61` vs. `3.27`) and deliberative thinking predict sound financial behavior and lower anxiety (`2.57` vs. `3.05`) beyond literacy/income | Level 1 (Primary) |
| 2 | **Shim, Barber, Card, Xiao & Serido (2010)** | *J. Youth and Adolescence*, 39(12), 1457–1470 | Longitudinal APLUS study (`n = 2,098` students): early socialization shapes attitudes and perceived behavioral control | Level 1 (Supporting) |
| 3 | **Prelec & Loewenstein (1998)** | *Marketing Science*, 17(1), 4–28 | Double-entry mental accounting (`60%` vs. `29%` model fit) and payment–consumption hedonic coupling ("pain of paying") | Level 2 (Primary) |
| 4 | **Ma, Ge, Gu & Ding (2026)** | *Frontiers in Psychology*, 17:1950938 | Active BNPL survey (`n = 708`): financial anxiety covaries with hedonic BNPL share (`55.6%` → `79.9%`, `OR = 2.078`); objective literacy does not moderate impulsivity–delinquency (`p = 0.611`) | Level 3 · Boss (Primary) |
| 5 | **Liu & Zhang (2021)** | *J. Behavioral and Experimental Finance*, 32, 100569 | College online consumer credit (`N = 539`): financial self-efficacy partially mediates how literacy reduces risky borrowing | Level 3 · Boss (Supporting) |
| 6 | **Richard H. Thaler (1999)** | *J. Behavioral Decision Making*, 12(3), 183–206 | Acquisition utility vs. transaction utility ("deal" framing), unbooked petty-cash leakage, and broad vs. narrow bracketing | Level 4 (Primary) |
| 7 | **Hashmi, Aftab, Martins, Mata, Qureshi, Abreu & Mata (2021)** | *PLOS ONE*, 16(9): e0256649 | University PLS-SEM (`N = 429`): System 2 deliberative thinking ($\beta = 0.164$) and self-control ($\beta = 0.147$) drive behavior; optimism is non-significant (`p = 0.150`); self-esteem buffers anxiety ($\beta = -0.263$) | Level 5 (Primary) |
| 8 | **Ruofan Bai (2023)** | *PLOS ONE*, 18(11): e0294466 | University PLS-SEM (`N = 449`): financial literacy ($\beta = 0.299$), self-control ($\beta = 0.182$), and mental budgeting ($\beta = 0.102$) support well-being via investment decisions; category blur & budget rigidity risks | Level 6 · Boss (Primary) |
| 9 | **Cliff A. Robb (2017)** | *J. Family and Economic Issues*, 38(4), 514–527 | Undergraduate stress (`N = 324`): ~`30%` cut credit hours for financial reasons; self-efficacy relates positively to well-being and negatively to course load reduction | Level 7 (Primary) |
| 10 | **Bartholomae & Fox (2021)** | *J. Family and Economic Issues*, 42(Suppl 1), S154–S177 | Decade review of 20 JFEI college studies: structural shift from campus cards to student loans and unsecured debt precarity | Level 7 (Supporting) |
| 11 | **Hernandez-Perez & Cruz Rambaud (2025)** | *Future Business Journal*, 11:70 | National survey (`N = 8,554`, PLS-SEM): hardship mediates `41%` of weak self-control's harm; liquid financial buffer holds the highest formative well-being weight (`0.780` vs. income `0.771`) | Level 8 (Primary) |
| 12 | **David Laibson (1997)** | *Quarterly Journal of Economics*, 112(2), 443–477 | Quasi-hyperbolic discounting (`1, βδ, βδ², ...`): eliminating illiquid "golden egg" commitment assets causes Table II welfare losses up to `29.5%` of output at $\beta = 0.4$ | Level 9 · Final Boss (Primary) |

---

### 2. Daily Safe-to-Spend Runway (`/runway`)
- **3-Bucket Mental Accounting Split (`calculateMentalAccounting`):** Reserves monthly **Fixed Commitments** (`FixedCommitmentsCard`) and ring-fenced **Invest-in-Self** capital (`selfInvestTargetMinor`) before computing the **Disposable Consumption Pool**:
  $$\text{Consumption Pool} = \max(0,\ \text{Monthly Budget} - \text{Invest-in-Self Target} - \text{Fixed Commitments})$$
- **Dynamic Daily Allowance (`SafeToSpendHero`):** Divides remaining non-future month-to-date consumption across `daysRemainingInMonth` in the user's local timezone, accompanied by pace status (*On Track*, *Tight Runway*, *Overspent*), `DailyBurnChart` (cumulative actual vs. ideal linear trajectory), and `TriggerBreakdown`.
- **Month Switcher (`MonthSwitcher`):** Inspect closed months via `MonthEndSnapshotCard` (surplus/deficit badge, consumption %, growth-to-burn ratio, dominant trigger).
- **Pre-Spend Impulse Simulator (`ImpulseSimulatorDialog`):** Triggered from `"Should I Buy This?"` on `/runway` or `/vault`; computes days of runway consumed, post-purchase Safe-to-Spend drop, hours of work, and 4-year 8% p.a. compounded cost—with one-click **Park in 48h Vault (Recommended)** or **Buy & Log Anyway**.
- **Global Pain-of-Paying Toggle (`PainOfPayingToggle`):** Persistent top-bar switcher translating every monetary value across the workspace between **Currency** (`₹` / `HK$` / `$`), **Work Hours** (`amount / hourlyRate`), and **4-Yr Cost** (`amount × 1.08^4`).

### 3. Quick Log & Smart Ledger (`/log`)
- **Natural-Language AI Expense Parser (`POST /api/parse-expense`):** Uses server-side Gemini (`@google/genai`, default `gemini-3.8-flash`) with strict anti-hallucination boundary verification (`amountAppearsInInput`) and guaranteed deterministic fallback (`parseExpenseFallback`) so logging works offline or without `GEMINI_API_KEY`.
- **Student Frictionless Input (`QuickLogForm`):** 5 currency-aware **1-Tap Quick Presets** (`getQuickLogPresets`), 5 behavioral trigger tags (`need`, `convenience`, `stress_late_night`, `social_fomo`, `invest_self`), `cash` vs. `cashless` selector, and live pre-submit **Runway Impact Preview** (`buildRunwayPreview`).
- **Smart Ledger (`TransactionLedger` & `EditTransactionDialog`):** Daily-grouped responsive table/cards, search + month/trigger/payment filters, inline transaction editing, deletion, and UTF-8 BOM-safe CSV export (`src/lib/csv.ts`).

### 4. Bias Radar & Weekly Coach (`/radar`)
- **Four Deterministic Behavioral Detectors (`src/domain/behavioral-engine.ts`):**
  1. **Present Bias / Late-Night Drift** (`22:00–04:00` local time or `stress_late_night` tag, deduplicated per transaction).
  2. **Cashless Numbness** (`cashless` consumption transactions $\le 1.5\%$ of monthly budget).
  3. **Early-Month Windfall Burn** (Days `1–7` consumption share vs. `~23%` healthy linear baseline).
  4. **Social FOMO Ratio** (`social_fomo` percentage of consumption spending).
- **4-Axis Radar & Zero-Guilt Telemetry (`BiasRadarChart`, `BiasCards`):** Composite `overallRiskScore` (`0–100`) plus deterministic rule-based guidance.
- **Weekly Behavioral Coach (`WeeklyCoach` + `POST /api/coach/nudge`):** Sends only aggregated scores and runway totals (never raw transaction notes or PII) to Gemini with a capped deterministic fallback (`buildDeterministicNudge`) to produce one concrete 3-day habit experiment per ISO week (`YYYY-Www`).

### 5. 48-Hour Cool-Off Vault (`/vault`)
- **Digital Commitment Device:** Implements Laibson's advance-notice illiquidity barrier—park impulse wants (`ParkImpulseForm`) for 48 hours with a live countdown (`CoolingItemCard`) and defer decision controls until the timer expires.
- **Atomic Purchase Resolution RPC:** Resolving an unlocked item as *"Still Bought It"* in authenticated mode calls the PostgreSQL `resolve_vault_purchase` RPC (`0002_vault_purchase_rpc.sql`, `SECURITY INVOKER`, row-level `FOR UPDATE` lock), updating `vault_items` and inserting exactly one `transactions` row atomically; choosing *"Skipped It"* preserves the funds and increments the **Money Rescued** hero (`calculateMoneyRescuedMinor`).

### 6. Instant Guest Sandbox vs. Authenticated Supabase Mode
- **Explicit Access Gate (`AccessGate` & `RepositoryProvider`):** Prevents cross-mode data flashes by clearing and canceling TanStack Query caches on identity transitions (`queryKeys` scoped by `{ mode, userId }`).
- **Guest Sandbox (`GuestSandboxRepository`):** Persists in `sessionStorage` with a seeded 30-day dataset (`createInitialGuestState`: 22 transactions across all 5 triggers, 3 fixed commitments, 2 rescued + 1 cooling Vault item, and Dojo Level 1 pre-mastered), one-click **Reset Demo** (`GuestBanner`), and guest-only **Simulate 48h Elapsed** Vault control.
- **Authenticated Mode (`SupabaseRepository`):** Passwordless OTP magic-link authentication via `/auth/callback` (with open-redirect protection) and Next.js 16 session refresh proxy (`src/proxy.ts`).

---

## Visual Showcase

Drop rendered PNG screenshots into `docs/screenshots/` using the exact paths below:

| Module | Screenshot Slot | What It Highlights |
| --- | --- | --- |
| **Landing Hero (`/`)** | `![Landing Hero](docs/screenshots/01-landing-hero.png)` | Zero-guilt value proposition, Guest Sandbox CTA, and three-pillar product overview |
| **Daily Runway (`/runway`)** | `![Daily Runway](docs/screenshots/02-daily-runway.png)` | Safe-to-Spend hero, 3-bucket allocation breakdown, Fixed Bills, and Daily Burn chart |
| **Behavioral Dojo Map (`/dojo`)** | `![Dojo Skill Map](docs/screenshots/03-dojo-skill-map.png)` | 3-World × 9-Level winding S-curve track, Belt & Rank side rail, and 3×3 badge grid |
| **Dojo Arena & Mirror (`/dojo`)** | `![Dojo Training Arena](docs/screenshots/04-dojo-arena-mirror.png)` | 5-beat training arena with live Personal Data Mirror, Focus Shields, and docked feedback |
| **Bias Radar (`/radar`)** | `![Bias Radar](docs/screenshots/05-bias-radar.png)` | 4-axis behavioral footprint radar, detector cards, and ISO-week coach experiment |
| **48h Cool-Off Vault (`/vault`)** | `![Cool-Off Vault](docs/screenshots/06-cool-off-vault.png)` | Money Rescued total, active 48-hour cooling timers, and impulse resolution history |

---

## Architecture & Project Structure

- **Repository Pattern (`IStopBucksRepository`):** UI components and React Query hooks interact strictly with `src/repositories/repository.interface.ts`. `GuestSandboxRepository` (`sessionStorage`) and `SupabaseRepository` (PostgreSQL + RLS + strict Zod row validation + sanitized database error messages) implement the same contract without leaking persistence details into components.
- **Pure TypeScript Domain Engine (`src/domain/`):** Zero React, Next.js, Supabase, or browser API imports. All monetary calculations use **safe integer minor units** (`BIGINT` paise/cents) parsed via digit manipulation (`parseAmountStringToMinor`) to eliminate IEEE-754 floating-point drift, with explicit `referenceDate` and IANA `timeZone` injection for deterministic testing.
- **Server-Side AI Guardrails (`src/app/api/`):** Both `/api/parse-expense` and `/api/coach/nudge` enforce `authorizeAiRoute` (Supabase session or `x-stopbucks-guest: 1` header), bounded in-memory sliding-window rate limiting (`src/lib/rate-limit.ts`), 12-second `AbortController` timeouts (`src/lib/gemini.ts`), Zod schema validation, and deterministic fallbacks.
- **4 Additive SQL Migrations (`supabase/migrations/`):**
  - `0001_initial_schema.sql` — `profiles`, `transactions`, `vault_items`, `weekly_nudges` tables, enums, indexes, and owner-only RLS policies (`auth.uid() = user_id`).
  - `0002_vault_purchase_rpc.sql` — Atomic `resolve_vault_purchase(UUID)` `SECURITY INVOKER` PL/pgSQL function locking the row `FOR UPDATE` and enforcing `status = 'cooling'` and `unlock_at <= now()`.
  - `0003_fixed_commitments.sql` — `fixed_commitments` table + owner-only RLS policies.
  - `0004_dojo_progress.sql` — `dojo_progress` table storing `completed_levels` JSONB, XP, streaks, `unlocked_badges` JSONB, and `sound_muted` with owner-only RLS policies.

```text
StopBucks/
├── src/
│   ├── proxy.ts                              # Next.js 16 Supabase session refresh proxy
│   ├── app/
│   │   ├── page.tsx                          # Landing page & Guest/Auth entry
│   │   ├── layout.tsx                        # Root metadata, PWA manifest & Providers
│   │   ├── onboarding/page.tsx               # 4-input baseline (Currency, Budget, Invest Target, Hourly Rate)
│   │   ├── auth/callback/route.ts            # Magic-link code exchange + safe redirect guard
│   │   ├── (app)/
│   │   │   ├── layout.tsx                    # AccessGate + GuestBanner + AppSidebar + AppTopbar + MobileNav
│   │   │   ├── runway/page.tsx               # Daily Safe-to-Spend Runway & Month Switcher
│   │   │   ├── log/page.tsx                  # Smart Quick Log & Transaction Ledger
│   │   │   ├── radar/page.tsx                # 4-Detector Bias Radar & Weekly Coach
│   │   │   ├── vault/page.tsx                # 48-Hour Cool-Off Vault & Money Rescued
│   │   │   └── dojo/page.tsx                 # Behavioral Dojo 3-World Hub & 5-Beat Arena
│   │   └── api/
│   │       ├── parse-expense/route.ts        # POST natural-language expense parser (Gemini + fallback)
│   │       └── coach/nudge/route.ts          # POST weekly behavioral nudge generator (Gemini + fallback)
│   ├── components/
│   │   ├── bias-radar/                       # BiasRadarChart, BiasCards, WeeklyCoach
│   │   ├── dashboard/                        # SafeToSpendHero, MentalAccounting, FixedCommitmentsCard, DailyBurnChart, TriggerBreakdown, MonthEndSnapshotCard
│   │   ├── dojo/                             # DojoHeader, DojoSkillMap, DojoLevelNode, DojoSideRail, DojoLevelBriefing, DojoTrophyDrawer, DojoCitationModal, DojoLessonArena
│   │   │   └── widgets/                      # MythBetWidget, ImpulseDuelWidget, InteractiveSliderWidget, BucketSortWidget, FeedbackLoopWidget, PersonalMirrorCard, MasteryCheckWidget, LessonFeedbackTray, LevelClearOverlay
│   │   ├── quick-log/                        # QuickLogForm, TransactionLedger, EditTransactionDialog
│   │   ├── shared/                           # AccessGate, AppSidebar, AppTopbar, GuestBanner, ImpulseSimulatorDialog, MonthSwitcher, PainOfPayingToggle
│   │   ├── ui/                               # Radix/Tailwind UI primitives
│   │   └── vault/                            # ParkImpulseForm, CoolingItemCard, VaultHistory
│   ├── domain/                               # 100% pure TypeScript engine (zero React/DOM/Supabase imports)
│   │   ├── behavioral-engine.ts              # Mental accounting, daily runway, 4 bias detectors
│   │   ├── currency.ts                       # Minor-unit integer math, Work Hours, 4-Yr 8% compounded formatter
│   │   ├── dojo-curriculum.ts                # Canonical 3-world, 9-level, 12-study curriculum
│   │   ├── dojo-engine.ts                    # 5-Belt ladder, replay XP rules, streaks, Prelec & Laibson models
│   │   ├── dojo-mirror.ts                    # Live Personal Data Mirror computations across levels 1–9
│   │   ├── dojo-types.ts                     # Pure Dojo domain types
│   │   ├── expense-parser.ts                 # Deterministic NL parser & anti-hallucination validator
│   │   ├── impulse-simulator.ts              # Pre-spend runway & opportunity cost simulator
│   │   ├── nudge.ts                          # Deterministic weekly behavioral experiment generator
│   │   ├── quick-log-presets.ts              # 5 currency-aware 1-tap student presets
│   │   ├── runway-insights.ts                # Pace status, burn series, trigger breakdown, month-end snapshots
│   │   ├── seed-data.ts                      # 30-day Guest Sandbox student seed dataset
│   │   └── types.ts                          # Core financial & behavioral domain types
│   ├── lib/                                  # App utilities, schemas, citations, sound synth, Supabase clients
│   │   ├── dojo-citations.ts                 # Deduplicated 12-study Research Library extractor
│   │   ├── dojo-map-layout.ts                # Sinusoidal S-curve node geometry & cubic Bézier SVG paths
│   │   ├── dojo-progress-mutation.ts         # Identity-scoped Dojo completion mutation helper
│   │   ├── dojo-sound-mutation.ts            # Persisted Dojo mute toggle mutation helper
│   │   ├── gemini.ts                         # Server-only @google/genai client with timeout & null fallback
│   │   ├── rate-limit.ts                     # Bounded in-memory rate limiter (LRU eviction)
│   │   ├── route-auth.ts                     # Session vs. Guest Sandbox AI route authorization
│   │   ├── schemas.ts                        # Zod schemas & DB row mappers
│   │   ├── sound-fx.ts                       # Zero-asset Web Audio API synthesizer
│   │   └── supabase/{client.ts,server.ts}    # Browser & SSR Supabase clients
│   └── repositories/
│       ├── repository.interface.ts           # IStopBucksRepository contract
│       ├── repository-provider.tsx           # Dual-mode context + cache isolation
│       ├── guest-sandbox.repository.ts       # SessionStorage implementation
│       └── supabase.repository.ts            # Supabase PostgreSQL + RLS implementation
├── supabase/migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_vault_purchase_rpc.sql
│   ├── 0003_fixed_commitments.sql
│   └── 0004_dojo_progress.sql
└── test/                                     # 22 Vitest test files (291 tests)
```

---

## Tech Stack & Quality Verification

### Verified Dependency Stack (`package.json`)

| Layer | Technologies & Versions |
| --- | --- |
| **Frontend & UI** | Next.js `^16.4.6` (App Router), React `^19.0.0`, TypeScript `^5.7.3`, Tailwind CSS `^4.0.9`, Radix UI (`dialog`, `select`, `tabs`, `label`, `slot`), Lucide React `^1.16.0`, Recharts `^2.15.1`, TanStack Query `^5.66.11`, Sonner `^2.0.1` |
| **Animation & Audio** | Framer Motion `^14.14.0` (with `useReducedMotion` support), zero-asset Web Audio API synthesizer (`src/lib/sound-fx.ts`) |
| **Backend, Auth & DB** | Supabase (`@supabase/supabase-js ^2.49.1`, `@supabase/ssr ^0.5.2`), PostgreSQL with Row-Level Security & PL/pgSQL RPC, Zod `^3.24.2` |
| **AI (Optional)** | Google Gemini via `@google/genai ^3.6.1` (`gemini-3.8-flash` default) with deterministic fallbacks |
| **Testing & Tooling** | Vitest `^3.0.7`, Testing Library React `^16.3.3`, jsdom `^31.0.1`, ESLint `^9.21.0` (`eslint-config-next ^16.4.6`) |

### Verification Suite

| Command | Purpose | Scope |
| --- | --- | --- |
| `npm run typecheck` | `tsc --noEmit` strict static type verification | `src/` and `test/` |
| `npm run lint` | `eslint src test` code & Next.js lint checks | `src/` and `test/` |
| `npm test` | `vitest run` automated unit, domain, repository, and UI suite | **22 test files · 291 tests** (domain math, parser, nudge, RLS mappers, Vault RPC, Dojo engine, mirrors, layout, Web Audio & 5-beat Arena UI) |
| `npx next build --webpack` | Production Next.js build via webpack | Full application & route bundle |

---

## Local Setup & Environment Variables

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd StopBucks
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate `.env.local` using the keys defined in `.env.example`:

```dotenv
# Supabase project URL (e.g. https://<project-ref>.supabase.co)
NEXT_PUBLIC_SUPABASE_URL=

# Supabase publishable key (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY alias)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-side Gemini API key (never exposed to client-side bundles)
GEMINI_API_KEY=

# Optional: Override default Gemini model (defaults to gemini-3.8-flash)
GEMINI_MODEL=gemini-3.8-flash
```

> **Note:** StopBucks runs out of the box in **Instant Guest Sandbox** mode even when Supabase and Gemini environment variables are unset; both AI endpoints automatically fall back to their deterministic TypeScript engines.

### 3. Apply Supabase Migrations (for Authenticated Mode)
Execute the four additive SQL migrations in order against your Supabase PostgreSQL database (via the Supabase SQL Editor or `supabase db push`):
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_vault_purchase_rpc.sql`
3. `supabase/migrations/0003_fixed_commitments.sql`
4. `supabase/migrations/0004_dojo_progress.sql`

Enable **Email (Magic Link)** authentication in Supabase Auth and add `http://localhost:3000/auth/callback` (plus your Vercel production callback URL) to your Supabase **Redirect URLs**.

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to launch StopBucks.
