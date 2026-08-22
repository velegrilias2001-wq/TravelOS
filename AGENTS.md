# TravelOS Engineering Contract

This file is the permanent operating contract for contributors and coding agents working in this repository. Read it together with the files in docs/ before changing implementation.

## Product and authority

- TravelOS is a premium native travel operating system across the full trip lifecycle. It is not merely an itinerary app.
- This native Expo/React Native repository is the implementation source of truth.
- The web/PWA at https://travelos3.netlify.app/ is a functional and UX reference only. Preserve worthwhile product ideas, but never copy its architecture blindly or treat its data model as authoritative.
- Wanderlog is the primary competitive reference; TripIt and Been are secondary references. Learn from their product strengths without visually cloning them.
- The experience must feel premium, editorial, calm, native, and highly polished. Avoid generic component-library layouts and obviously AI-generated UI.

## Canonical travel truth

- There is one canonical Trip entity shared throughout the application.
- TripDay, TripStop, Booking, Accommodation, Budget, TripRuntimeState, Traveler, Memory, and TravelBook records must attach to that trip truth through explicit IDs.
- Never fuzzy-link records by a title, label, destination name, place name, or other display text.
- Booking-to-TripStop and Accommodation-to-TripStop relationships use IDs and must have explicit cardinality and lifecycle behavior.
- Trip.accountingCurrency and destination/local currency are different concepts. Never collapse one into the other.
- Today and Companion must be truth-aware. An upcoming or completed trip must never be presented as currently happening.
- A recommendation, imported claim, or AI suggestion is not a confirmed fact. Its provenance and confirmation state must remain visible until the user accepts it into canonical data.
- Never invent coordinates, bookings, prices, places, dates, reservations, or other user facts. Unknown data stays unknown.

## Data and persistence

- SQLite is the durable local source of truth.
- Zustand is for UI and session state. It must not become a competing database or own durable travel records.
- Repositories own persistence operations; services coordinate domain workflows; screens should not encode database rules.
- Preserve existing user data and working functionality. Schema changes require a migration and a compatibility plan.
- Never edit a historical migration that may have shipped. Add a new forward migration, even when correcting an earlier migration.
- Durable multi-record workflows must be atomic and retry-safe where applicable.
- Relationships require explicit foreign keys and appropriate indexes. Important domain invariants should be enforced at the database boundary as well as in TypeScript.

## Security and configuration

- Never read, print, log, commit, expose, or copy secrets from .env.local.
- Documentation may name required environment variables, but must never contain their values.
- Keep API keys platform-restricted and service-restricted. Do not weaken restrictions to make local setup easier.
- Never log private itinerary, booking, traveler, location, or payment data unnecessarily.

## Expo and native platform rules

- This is native React Native with Expo, TypeScript, and Expo Router. Do not introduce a WebView wrapper as the product implementation.
- The project is on Expo SDK 57. Before writing code or changing dependencies, read the exact versioned documentation at https://docs.expo.dev/versions/v57.0.0/.
- Use packages and APIs compatible with SDK 57. Confirm compatibility before adding or upgrading native dependencies.
- Native configuration changes require checking both Android and iOS consequences.
- Use a development build for native functionality; do not assume Expo Go represents the supported runtime.

## Change discipline

- Inspect the current branch, status, relevant recent commits, and affected architecture before implementing.
- Do not discard unrelated work or working functionality.
- Prefer small, reversible changes with a clear migration and rollback story.
- Treat invalid IDs, missing records, persistence errors, and partial data as explicit UI states.
- Keep screens focused on presentation and interaction. Move reusable domain behavior to services and reusable persistence behavior to repositories.
- Add or update high-value tests with behavioral changes. Prioritize persistence invariants, migrations, date/trip-state logic, and destructive workflows.

## Required completion checks

Before completing a change, run the checks that apply and report any check that could not run:

1. npx tsc --noEmit
2. git diff --check
3. Relevant automated tests, once present
4. Lint, once a non-interactive lint configuration is committed
5. A focused native smoke test for changed user flows when the environment permits
6. git status --short

Do not allow a tool to initialize or rewrite project configuration merely to run a check.

## Living documentation

- Update docs/CURRENT_STATE.md after a meaningful implementation milestone changes what actually works, the current risks, or release readiness.
- Update docs/ROADMAP.md when a milestone is completed, reprioritized, or split.
- Update docs/PRODUCT_VISION.md only when an intentional product decision changes the product contract.
- Update docs/WEB_REFERENCE.md when a web-reference idea is adopted, rejected, or materially reinterpreted.
- Record unknowns as open decisions. Do not turn assumptions into project facts.
