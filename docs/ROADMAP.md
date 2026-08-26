# TravelOS Development Roadmap

This sequence protects the canonical trip truth before adding product breadth. A phase may be refined as evidence changes, but later surface area should not outrun the integrity work in P0.

## Phase 0 — Foundation Hardening Sprint

Goal: make existing trip, day, stop, booking, and workspace behavior safe to extend.

### Phase 0A — Persistence Safety implemented

- [x] Make TripDay generation atomic, idempotent, concurrent-call safe, and able to repair partial canonical day sets without replacing valid rows.
- [x] Make stop reorder a single atomic operation that preserves IDs/content and rolls back completely on failure.
- [x] Add forward-only migration version 3 without changing historical migration behavior.
- [x] Reconcile the version-2 accommodation-stop drift.
- [x] Archive duplicate TripDay rows before consolidating references.
- [x] Normalize legacy day numbers and stop positions before adding high-value unique indexes.
- [x] Move application transactions to serialized, transaction-scoped exclusive Expo SQLite connections.
- [x] Add automated coverage for fresh, partial, repeated, and concurrent TripDay generation; reorder integrity/rollback; and fresh, drifted, and failed migration behavior.
- [x] Rehearse migration version 3 and the Phase 0A persistence paths with Expo SQLite on an Android development build using isolated version-2 test data.

### Phase 0B — Reactive Trip Workspace and Reliable Screen Lifecycle implemented

- [x] Introduce one route-scoped TripWorkspace provider above Companion, Plan, Map, Bookings, and future Trip Space tabs while keeping SQLite authoritative.
- [x] Route stop and booking mutations through shared TripService-backed actions that invalidate and reload the aggregate from SQLite.
- [x] Add revision-aware focus refresh so invalidated or failed snapshots reload without querying the database on every tab focus.
- [x] Define loading, ready, refreshing, not-found, recoverable workspace error, and fatal bootstrap error behavior.
- [x] Remove the unused Zustand active-trip snapshot while retaining the global trip-list UI cache.
- [x] Add automated workspace lifecycle coverage and verify create/open, mapped-stop add/edit propagation, booking persistence across tabs, and invalid-trip recovery on an Android development build.

### Remaining Phase 0 work

- [ ] Decide and enforce remaining relationship invariants and cardinality for memories, runtime state, and other workspace aggregates. Booking ↔ Stop is explicitly zero-or-one from Booking and zero-to-many from TripStop; Accommodation is explicitly zero-to-many from Trip with optional zero-or-one Booking and TripStop links. Both relationship families enforce same-trip IDs.
- [ ] Remove N+1 loading patterns from the trip list and other obvious aggregate reads.
- [ ] Expand automated coverage for the remaining repository relationships/cascades. Booking/stop unlink cascades for Bookings and Accommodations are covered, and deterministic upcoming/active/completed runtime plus exact-day selection now have fixed-clock coverage.
- [ ] Rehearse migration version 3 against Expo SQLite on an iOS development build.
- [ ] Commit a non-interactive lint configuration and add baseline CI checks.

Exit condition: existing native flows survive retries, partial data, navigation refocus, and supported migrations without corrupting or misrepresenting trip truth.

## Phase 1 — Complete Trip Core in progress

Goal: turn the current vertical prototype into a coherent pre-trip workspace.

- [x] Build one native trip budget and actual-expense flow with original currencies, explicit booking/stop IDs, truthful same-currency totals, category breakdown, persistence tests, and Android runtime verification.
- [x] Implement More as a functional trip hub with canonical Trip Details, Budget, Itinerary, Bookings, Map, and Companion navigation while labelling future modules honestly.
- [x] Add service-backed Trip Details editing for title, valid existing destination names, native dates, accounting currency, and lifecycle status.
- [x] Reject invalid/reversed detail dates, prevent manual assignment of active truth, preserve structured destination metadata, and block accounting-currency changes once a Budget exists.
- [x] Add confirmed cascade deletion for trip-owned local data, workspace not-found transition, trip-list refresh, automated coverage, and Android runtime verification with isolated data.
- [ ] Define a real FX-rate source, rate timestamp, conversion policy, user override, and provenance model before foreign currencies can enter accounting-currency totals.
- [x] Replace free-form Create Trip destinations with native real-location selection; add explicit ID-preserving destination replacement/legacy upgrade in Trip Details; persist only provider-returned place facts; and render all mapped destinations without a hidden first-destination assumption.
- [ ] Complete destination add/remove/reorder, adopt a stable provider identity when the chosen provider exposes one, and define how multi-destination truth is presented across Create Trip, Companion, Plan, Map, and Bookings.
- [x] Replace free-form Create Trip dates, Booking start/end, and optional Stop time with native inputs and centralized calendar/local-time validation while preserving compatible historical Booking and Stop values.
- [x] Implement Booking ↔ Stop linking by exact ID, including optional native link/relink/unlink UX, Plan/Companion/Map context, zero-to-many reverse cardinality, same-trip validation, safe stop deletion, migration version 5, automated tests, and isolated Android verification.
- [x] Implement native Accommodation management with multiple sorted stays, validated local date/time input, optional same-trip Booking and TripStop links by exact ID, lossless unlink/delete behavior, migration version 6, automated tests, and isolated Android verification.
- [x] Implement native Traveler management with reusable canonical identities, exact-ID many-to-many Trip membership, atomic create-and-add, duplicate prevention, shared edits, membership-only removal, Trip-deletion preservation, TripWorkspace refresh, automated tests, and isolated Android verification.
- [ ] Define Traveler owner identity, roles, invitations, permissions, reservation ownership, expense splitting, and when a Trip should transition from the current planning-time zero-or-many membership to a one-or-more party rule.
- [x] Define centralized date/time/runtime truth: canonical date-only Trip/TripDay values, local wall-clock Stop/Accommodation/new Booking values, preserved absolute historical Booking instants, injectable-clock runtime phase, exact active TripDay selection, explicit canonical-destination/device-fallback timezone provenance, and a separate future progress role for TripRuntimeState.
- [ ] Add Day → Destination semantics before claiming fully timezone-aware multi-destination runtime behavior; never substitute destination order as temporal truth. Add timezone only through a reliable provider or separately restricted service boundary—never by geographic or currency guesswork.
- Improve booking actions, validation, payment state, and destructive-flow UX.
- Define archive and user-data recovery expectations before deletion is considered release-ready.

Exit condition: a traveler can create, edit, organize, budget, and validate the essential facts of a trip in one durable workspace.

## Phase 2 — Companion

Goal: make TravelOS useful and correct while the traveler is moving.

- [x] Evolve the existing Today route into one Companion surface without creating competing trip truth or a duplicate durable state store.
- [x] Derive upcoming, active, completed, exact current TripDay, Day X of N, and explicit timezone provenance through deterministic injected-clock services.
- [x] Classify previous/current/next/later/untimed itinerary context without rewriting Plan order or calling an untimed stop current.
- [x] Surface exact linked Booking context, truthful local Accommodation context, preparation signals, and mapped-stop actions using only canonical persisted data.
- [x] Add premium phase-aware native presentation, restrained motion with reduced-motion support, working module actions, and calm imperfect-data states.
- [x] Refresh runtime truth on focus, foreground return, and the next resolved local calendar boundary without polling.
- [x] Add deterministic Companion selector/boundary tests and Android rehearsal for upcoming, incomplete, active fallback, linked Booking, mapped stop, cold relaunch, tab lifecycle, and completed non-live behavior.
- [ ] Add Day → Destination semantics and secure reliable destination-timezone enrichment before claiming exact NOW/NEXT across multi-destination trips. The current native selection flow truthfully leaves timezone unknown because its picker does not return one.
- [ ] Decide whether timed stop-boundary refresh is needed while Companion remains continuously open; V1 refreshes at focus, foreground, and local date boundaries.
- [ ] Model delayed, completed, and skipped lived-stop phases without rewriting the original plan, then activate `TripRuntimeState` only for concrete durable progress.
- [ ] Add smarter map framing, real route and travel-time providers, and navigation handoff without invented data.
- [ ] Support live itinerary changes and make their effect on Companion explicit.
- [ ] Cache essential trip, booking, accommodation, and map context for offline use.
- [ ] Design graceful behavior for stale routes, no network, missing coordinates, and provider failure.
- [ ] Add useful notifications only after timezone and truth rules are stable.

Exit condition: Companion presents the correct travel context and remains trustworthy during connectivity, timing, and plan changes.

## Phase 3 — Post-trip

Goal: turn completed trips into a meaningful personal history.

- Build Memories with explicit trip, day, stop, and place relationships.
- Distinguish planned places from visited and lived places.
- Build the World view from confirmed history, not destination strings or recommendations.
- Build Travel Book as a curated post-trip narrative from canonical travel facts and user-selected memories.
- Preserve the difference between the planned itinerary and lived history.
- Define media ownership, storage, export, deletion, and offline behavior before expanding media features.

Exit condition: a completed trip becomes a durable, truthful, and user-controlled personal record.

## Phase 4 — Discovery and Planning Intelligence

Goal: support earlier travel decisions without contaminating confirmed trip data.

- Build Discover around destination uncertainty, constraints, seasonality, pace, party, interests, and budget.
- Add wishlist and candidate-place states distinct from visited and planned data.
- Add best-season guidance with cited source and freshness where applicable.
- Import supported booking and itinerary materials into a review queue.
- Record provenance, extraction confidence, and conflicts for every imported claim.
- Add AI assistance only behind explicit review and confirmation gates.
- Never allow recommendations, imports, or AI suggestions to silently become canonical facts.
- Define provider, privacy, retention, cost, and fallback behavior before shipping intelligence.

Exit condition: discovery and import reduce planning effort while every unconfirmed claim remains visibly separate from trip truth.

## Phase 5 — Premium Product Polish

Goal: turn coherent functionality into a distinctive, accessible native product.

- [x] Complete UX Refinement V1: preserve the TravelOS identity while making Companion the signature surface, tightening utility-screen hierarchy, reducing card stacking and shadows, improving Plan density, compacting Bookings/Accommodation summaries, and turning More into a fast grouped hub.
- [x] Remove traveler-facing engineering terminology from Companion, Travelers, Trip Details, destination selection, and time/date form helpers while preserving the underlying canonical data rules.
- [x] Establish shared compact utility-header and summary-strip primitives and apply them across Plan, Bookings, Budget, Accommodation, Travelers, More, and Trip Details without adding a UI framework.
- [ ] Complete the remaining UX Refinement V1 Android visual/function matrix for Plan, Bookings, More, Travelers, forms, Map, CRUD, and cold relaunch; the debug build/install/launch and updated upcoming Companion first screenful are verified, but emulator control ended before the rest of the matrix could be observed.
- Consolidate stable primitives for typography, fields, cards, sheets, navigation, alerts, empty states, loading, and errors.
- Add native gestures, transitions, motion, and haptics where they improve comprehension.
- Create an imagery strategy with licensing, caching, attribution, fallbacks, and performance constraints.
- Complete accessibility for labels, focus, touch targets, contrast, dynamic type, reduced motion, and screen readers.
- Add localization architecture, timezone-aware copy, locale-aware dates/numbers, and bidirectional layout support.
- Validate layout and interactions across supported phone sizes and both platforms.
- Remove unused starter assets and components once their non-use is verified.
- Establish design QA and performance budgets for critical screens.

Exit condition: core flows feel calm, specific, responsive, accessible, and intentionally native rather than template-derived.

## Phase 6 — Cloud and Release

Goal: make user data durable across devices and operate TravelOS as a released product.

- Define accounts, identity, guest conversion, shared-trip permissions, and data ownership.
- Design backend sync and conflict resolution around SQLite-backed canonical IDs.
- Add backup, restore, and user-controlled export before relying on cloud-only recovery.
- Add EAS build profiles, credentials policy, versioning, and environment management.
- Complete iOS bundle, maps, permissions, device testing, TestFlight, and App Store readiness.
- Complete Android signing, API-key restrictions, device testing, Play testing tracks, and Play Store readiness.
- Add notifications after platform permission, timezone, and Companion rules are complete.
- Add privacy-aware crash reporting, performance monitoring, structured diagnostics, and operational alerts.
- Add CI release gates, migration rehearsal, rollback plans, and support procedures.

Exit condition: TravelOS can be built, tested, observed, restored, and released safely on iOS and Android.

## Cross-cutting rules

- Preserve one canonical Trip and explicit ID relationships at every phase.
- SQLite remains the local durable truth; Zustand remains UI/session state.
- Preserve existing user data and working behavior.
- Do not fabricate data to make a screen appear complete.
- A phase is complete only when its behavior, failure states, tests, and documentation agree.
- Update docs/CURRENT_STATE.md and this roadmap after each meaningful milestone.
