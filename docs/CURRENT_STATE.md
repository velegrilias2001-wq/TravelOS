# TravelOS Current State

Snapshot date: 2026-08-23

This file describes verified implementation, not intended behavior. Unknown or unverified capabilities are called out explicitly.

## Repository checkpoint

- Audited branch: foundation/native-architecture
- Audited HEAD: ec0b28a — Add native location picker and mapped itinerary stops
- The implementation branch is 11 commits ahead of the local main checkpoint.
- No Git remote or upstream branch was configured during the audit.
- The working tree was clean before this documentation pass.
- .env.local exists and is ignored. Its contents were not read.

Recent native milestones include the repository/service foundation, native navigation, create trip, itinerary planning, truth-aware Today, bookings, Google Maps on Android, and the location picker.

## Stack and runtime

| Area | Verified implementation |
| --- | --- |
| Framework | Expo SDK 57.0.15, React Native 0.86.2, React 19.2.3 |
| Language | TypeScript 6.0.3 with strict checking |
| Navigation | Expo Router 57 |
| Persistence | expo-sqlite 57, local database travelos.db |
| UI/session state | Zustand 5 |
| Maps | react-native-maps 1.27.2 |
| Place selection | expo-location-picker 1.0.2 |
| Native runtime | expo-dev-client development build |
| Styling | Local design tokens and React Native StyleSheet-based screen styling |

The package currently has start, Android, iOS, web, reset-project, and lint scripts. There is no committed test runner, CI workflow, EAS configuration, or non-interactive lint configuration.

## Architecture

The codebase has a sensible layered direction:

1. Domain entities define the travel model.
2. Repository interfaces describe persistence operations.
3. SQLite repositories implement those interfaces.
4. Services coordinate aggregate workflows.
5. Zustand holds trip-list and active-trip UI/session state.
6. Expo Router screens render and mutate trip workspaces through the service layer.

TripService builds a TripWorkspace aggregate from the canonical Trip and its related records. Screens also keep local workspace state, so durable records currently have two UI-facing state paths: the small Zustand store and screen-owned workspace snapshots.

## Canonical domain model

Verified domain entities include:

- Trip
- TripDay
- TripStop
- Booking
- Accommodation
- Budget and budget items
- Traveler
- TripRuntimeState
- Memory
- TravelBook

Entities use explicit IDs. The model distinguishes the trip's accounting currency from destination currency concepts. Booking and accommodation records can persist stop relationships, although the booking-to-stop and accommodation user experiences are not yet implemented.

## SQLite and migrations

The database is the current durable source of truth. Verified characteristics include:

- SQLite WAL mode and foreign-key enforcement are enabled.
- The current database version is 2.
- The schema contains 14 tables covering trips and related travel data.
- Repository queries use bound parameters.
- A version-2 migration adds an accommodation stop relationship.
- The baseline schema already contains that column, creating migration-history drift that must be corrected with a safe forward-only strategy.

Important gaps:

- Automatic TripDay generation is neither fully idempotent nor atomic. It exits when any day exists, so a partial set can remain incomplete, and concurrent calls can create duplicates.
- Stop reorder writes positions separately rather than in one durable transaction.
- Important uniqueness constraints, indexes, and relationship invariants are incomplete.
- Some multi-record writes use a non-exclusive async transaction wrapper, so transaction boundaries need review.
- Trip-list loading performs repeated related-data queries and will not scale well.
- Repository relationship cardinality and service aggregation need explicit decisions where schemas can hold multiple records but the aggregate exposes one.

Historical migrations must not be edited to repair these issues. Corrections require new migrations.

## Implemented native flows

### Global navigation

The primary tab structure is:

- Home
- Trips
- Discover
- World
- Profile

Home and Trips are functional. Discover, World, and Profile are placeholders.

### Trips and trip creation

Implemented behavior includes:

- Persisted trip list.
- Creating a trip with title, one destination, free-form date strings, and accounting currency.
- Opening a trip-specific workspace.
- Automatic TripDay creation from the trip date range.

Dates and currencies do not yet have production-grade native input, validation, timezone handling, or editing flows.

### Trip Space navigation

Each trip exposes:

- Today
- Plan
- Map
- Bookings
- More

Today, Plan, Map, and Bookings have working functionality. More is a placeholder.

### Today

Today distinguishes upcoming, active, and completed trips using the device's local calendar date. It shows the appropriate trip day and its stops when active.

This is truth-aware compared with a static mock, but not yet Companion-grade:

- It does not use the destination or trip timezone.
- It does not consume persisted TripRuntimeState.
- It does not derive current and next stop phases.
- Booking and accommodation context is not integrated.
- Error and missing-trip states are incomplete.

### Plan

Implemented behavior includes:

- Day-by-day itinerary rendering.
- TripStop create, edit, delete, and reorder.
- UI support for place, activity, food, and transport stop types.
- Native real-location selection.
- Persisted stop name, address, latitude, and longitude.

Current limitations include free-form time input, limited stop-type UI, no route or transit model, no booking linkage UI, no place-provider ID persisted from the picker, and large screen-level implementations with duplicated presentation patterns.

### Bookings

Implemented behavior includes persistent create, edit, delete, status, payment status, amount, currency, reference, location, and date/time fields.

The flow is not yet production complete:

- Booking-to-stop linkage exists in persistence but is not exposed in the UI.
- Accommodation is a separate persisted domain without a dedicated UI.
- Date/time validation and native input are incomplete.
- External action links and provider-specific details are absent.
- Destructive and persistence failure states need stronger UX.

### Map and location picker

Implemented behavior includes:

- A native map screen.
- Pins for stops with persisted coordinates.
- Camera framing from real stop coordinates.
- A native location picker that returns a real selected location.

Platform state:

- Android uses Google Maps through the current app configuration.
- Android location search depends on Google Maps and Places API (New) being enabled for the configured key.
- The API key is injected from GOOGLE_MAPS_API_KEY through app.config.js.
- Cloud API enablement and key restrictions were not verified because secret configuration was intentionally not inspected.
- iOS currently uses platform-default map behavior rather than a completed Google Maps setup.
- No iOS bundle identifier is configured.
- iOS build, picker behavior, permissions, and release readiness are unverified.
- Routes, travel times, offline map behavior, navigation handoff, clustering, and multi-destination map behavior are not implemented.

Several current screens use only the first destination even though the domain can represent more than one.

## Persisted modules without product UI

The following have domain and persistence support but no complete user-facing flow:

- Accommodation
- Budget and budget items
- Travelers
- TripRuntimeState
- Memories
- TravelBook

These are foundations, not shipped features. Their repository existence does not prove the end-to-end behavior is complete.

## State and navigation risks

- Screens load TripWorkspace data independently and retain local snapshots.
- Changes are not consistently refreshed when a tab regains focus.
- Zustand and screen-local state can become stale relative to SQLite.
- Invalid trip IDs can leave some screens in an indefinite loading state.
- Bootstrap failures are not surfaced consistently.
- Only parts of Trip Space expose a clear path back to global navigation.
- The current nested tab structure needs native usability testing on both platforms.

## Design system state

The app has a coherent early visual direction with typography, color, spacing, and premium editorial intent. Home, Trips, and trip flows are more considered than a default Expo template.

It is still an early design system:

- Major screens contain large, locally defined style and interaction implementations.
- Common cards, fields, sheets, empty states, alerts, and destructive confirmations are duplicated rather than enforced through stable primitives.
- Theme configuration and actual UI behavior are not fully aligned.
- Accessibility labels, dynamic type behavior, reduced-motion behavior, contrast validation, localization, and bidirectional layout are not complete.
- Starter Expo components and assets remain in the repository.

## Testing and release readiness

Verified checks at the takeover checkpoint:

- npx tsc --noEmit passes.
- npm ls --depth=0 passes.
- git diff --check was clean.

Missing release foundations:

- No automated unit, repository, migration, or integration tests.
- No CI pipeline.
- No committed lint configuration; the current lint command may attempt interactive setup.
- No EAS build or submit configuration.
- No iOS release configuration.
- No production observability or crash reporting.
- No backup, export, account, or sync mechanism.
- No verified accessibility, offline, performance, upgrade, or destructive-migration test plan.

## Production-quality versus prototype

### Production-oriented foundations

- One canonical Trip domain direction.
- Explicit entity IDs and repository interfaces.
- SQLite as durable local truth with WAL, foreign keys, migrations, and bound queries.
- Domain/repository/service separation.
- Strict TypeScript.
- Expo Router-based native navigation.
- Persisted itinerary and booking CRUD.
- Truth-aware upcoming/active/completed Today logic.
- Real selected coordinates persisted and rendered as map pins.
- Separate accounting-currency concept.
- A coherent early visual language.

These pieces are promising foundations; they do not make the app production-ready on their own.

### Prototype or incomplete implementation

- Create Trip input and validation.
- Automatic day generation and stop reorder transaction safety.
- Today as a full Companion.
- Booking-stop and accommodation workflows.
- Map intelligence, routes, and offline behavior.
- Budget, travelers, runtime state, memories, and Travel Book UI.
- Discover, World, Profile, and More.
- Reactive workspace state.
- Shared UI primitives and accessibility.
- iOS platform setup.
- Tests, CI, EAS, release operations, sync, backup, and observability.

## Overall assessment

TravelOS is a credible native foundation and working vertical prototype, not yet a production application. The strongest asset is its canonical, persistent native trip architecture. The immediate priority is to harden that foundation before broadening the product into the many flows already represented by domain types and the web reference.
