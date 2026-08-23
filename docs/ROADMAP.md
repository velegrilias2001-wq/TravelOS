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

### Remaining Phase 0 work

- [ ] Decide and enforce remaining relationship invariants and cardinality for bookings, accommodations, stops, memories, runtime state, and workspace aggregates.
- [ ] Make Trip Space data reactive or focus-aware so every tab reflects current SQLite truth.
- [ ] Define a single screen/service loading contract and remove avoidable competing state snapshots.
- [ ] Handle invalid trip IDs, missing records, persistence failures, and bootstrap errors explicitly.
- [ ] Remove N+1 loading patterns from the trip list and other obvious aggregate reads.
- [ ] Expand automated coverage to stop deletion, repository relationships/cascades, and upcoming/active/completed trip-state logic.
- [ ] Rehearse migration version 3 against Expo SQLite on an iOS development build.
- [ ] Commit a non-interactive lint configuration and add baseline CI checks.

Exit condition: existing native flows survive retries, partial data, navigation refocus, and supported migrations without corrupting or misrepresenting trip truth.

## Phase 1 — Complete Trip Core

Goal: turn the current vertical prototype into a coherent pre-trip workspace.

- Build budget and expense flows with explicit accounting and local currencies plus conversion provenance.
- Implement More as trip details, readiness, settings, and safe trip actions.
- Add trip editing for destinations, dates, title, currencies, and status.
- Replace free-form date/time fields with appropriate native inputs and domain validation.
- Implement booking-to-stop linking by ID.
- Implement accommodation management and accommodation-to-stop linking by ID.
- Implement traveler management and explicit trip membership.
- Define trip timezone, destination timezone behavior, and TripRuntimeState responsibilities.
- Clarify multi-destination behavior across creation, Today, Plan, Map, and bookings.
- Improve booking actions, validation, payment state, and destructive-flow UX.
- Define safe archive/delete behavior and user-data recovery expectations.

Exit condition: a traveler can create, edit, organize, budget, and validate the essential facts of a trip in one durable workspace.

## Phase 2 — Companion

Goal: make TravelOS useful and correct while the traveler is moving.

- Derive the correct current trip and current TripDay using explicit timezone rules.
- Model current, next, delayed, completed, and skipped stop phases without rewriting the original plan.
- Surface the next relevant stop, booking, accommodation, address, contact, and action.
- Integrate TripRuntimeState with clear durable versus ephemeral boundaries.
- Add smarter map framing, real route and travel-time providers, and navigation handoff without invented data.
- Support live itinerary changes and make their effect on Today explicit.
- Cache essential trip, booking, accommodation, and map context for offline use.
- Design graceful behavior for stale routes, no network, missing coordinates, and provider failure.
- Add useful notifications only after timezone and truth rules are stable.

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
