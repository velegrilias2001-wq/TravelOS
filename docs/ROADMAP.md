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

- [ ] Decide and enforce remaining relationship invariants and cardinality for runtime state and other unfinished workspace aggregates. Booking ↔ Stop, Accommodation, Memory, and Travel Book same-trip rules are now explicit; Memory/Travel Book integrity is guarded by migration version 7 triggers. `TripRuntimeState` day/stop references are still not fully protected.
- [ ] Route Memory and Travel Book writes through the shared TripWorkspace action/invalidation contract so other Trip Space tabs cannot remain stale after those mutations.
- [ ] Remove N+1 loading patterns from the trip list and other obvious aggregate reads.
- [ ] Expand automated coverage for the remaining repository relationships/cascades. Booking/stop unlink cascades for Bookings and Accommodations are covered, and deterministic upcoming/active/completed runtime plus exact-day selection now have fixed-clock coverage.
- [ ] Rehearse migration version 3 against Expo SQLite on an iOS development build.
- [ ] Rehearse migrations 7–11 on an Expo SQLite development build. Historical Android rehearsals stopped at `user_version = 6`. Node tests cover versions 7–11. No device `PRAGMA user_version = 11` rehearsal is recorded.
- [ ] Commit a non-interactive lint configuration and add baseline CI checks.

Exit condition: existing native flows survive retries, partial data, navigation refocus, and supported migrations without corrupting or misrepresenting trip truth.

## Phase 1 — Complete Trip Core in progress

Goal: turn the current vertical prototype into a coherent pre-trip workspace.

- [x] Build one native trip budget and actual-expense flow with original currencies, explicit booking/stop IDs, truthful same-currency totals, category breakdown, persistence tests, and Android runtime verification.
- [x] Implement More as a functional trip hub with canonical Trip Details, Budget, Accommodation, Travelers, Memories, Travel Book, Itinerary, Bookings, Map, and Companion navigation while labelling remaining future modules honestly.
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

## Phase 3 — Post-trip in progress

Goal: turn completed trips into a meaningful personal history.

- [x] Memories V1: native create/edit/delete for note and photo memories with explicit Trip ID plus optional TripDay and TripStop IDs, local photo copies in app storage, and migration version 7 same-trip integrity guards. Video remains a domain type without an authoring path. Migration integrity is covered by Node tests. No Memories device rehearsal is recorded.
- [x] Travel Book V1: one book per trip, ordered same-trip Memory membership, title/summary/cover from selected photo media, and a local `isPublished` flag that is not cloud publish or export. This documentation update did not run a device rehearsal.
- [x] World V1: native map and destination cards from persisted Trip destinations with real saved coordinates only. Filters use durable `Trip.status` (planning / completed / archived), not the runtime phase resolver, and do not infer visited history from a destination title.
- [ ] Distinguish planned places from visited and lived places using explicit relationships rather than destination strings or World filters on organizational status.
- [ ] Derive a deeper World / travel-archive view from confirmed lived history, memories, and place relationships—not from recommendations or the current destination-coordinate V1 alone.
- [ ] Preserve the difference between the planned itinerary and lived history; `TripRuntimeState` remains unused as lived progress.
- [ ] Define remaining media ownership, backup, export, deletion, and offline behavior before expanding Memories beyond on-device photo/note storage.
- [ ] Route Memory and Travel Book mutations through TripWorkspace invalidation (also remaining Phase 0 work).

Exit condition: a completed trip becomes a durable, truthful, and user-controlled personal record.

## Phase 4 — Discovery and Planning Intelligence in progress

Goal: support earlier travel decisions without contaminating confirmed trip data.

Destination truth must come from grounded sources. AI is not a destination source. Embedding, reranker, and explanation-model choices are replaceable candidates to benchmark, not permanent architecture commitments.

### Completed planning-intelligence milestones

- [x] Travel DNA V1: one explicit local preference profile (pace, interests, travel style, budget style, daily rhythm, typical party). Values are user-chosen only; nothing is inferred or generated by AI.
- [x] Trip Intent + Pace V1: optional trip-specific intent and pace on Create Trip and Trip Details, persisted by migration version 9, and not overwritten by Travel DNA.
- [x] Flexible Itinerary / Free Time V1: optional stop end times, knowable free-time gaps between consecutive timed stops, and explicit overlapping time conflicts. Gaps are not invented before the first stop, after the last stop, or across untimed moments.
- [x] AI Foundation V1: read-only deterministic AI context snapshots plus a local HTTP client/server for Plan free-time advice. Suggestions do not become itinerary stops unless the traveler later uses the existing stop editor. Node tests for context and payload parsing exist. Android Pixel 8 rehearsal on 2026-09-02 received live Qwen ideas for a verified free-time gap without mutating Plan.
- [x] Discover Architecture V1: session Discover Brief (Zustand only), curated catalogue with provenance, matcher, personalization fallback from Travel DNA, and Create Trip route-param handoff. Candidates are not written into SQLite as trips.
- [x] Discover Experience V1: native Discover tab supporting **Start with a place** (Create Trip) and **Find me somewhere** (explicit Brief → deterministic matching against grounded curated destinations → optional Create Trip confirmation). Trip-specific Brief values outrank Travel DNA. Flexible timing is not converted into invented calendar dates. Android Pixel 8 rehearsal on 2026-09-02 created and then deleted an isolated Discover-prefilled trip.

Current Discover V1 includes Start with a place, Find me somewhere, Best time for a known catalogue destination, Ready-made journeys as catalogue ideas, Saved ideas persistence, a multi-pack grounded destination corpus, hybrid semantic extras from local retrieval when the AI server is available, and opt-in grounded explanations of existing catalogue candidates. It does **not** include live provider catalogues or reranking.

### Immediate planned Discover sequence

These steps are ordered. Grounded destination data must exist before semantic retrieval or reranking.

- [x] **Grounded Destination Sourcing V1** — explicit multi-pack grounded corpus with provenance, optional editorial fit, identity by `(source, record id)`, and matcher ranking only fitted records. AI is not a destination source.
- [x] **Semantic Discover V1** — measured BGE-M3 benchmark, precomputed corpus embeddings keyed by grounded identity plus content hash, `/ai/discover-retrieve` on the local AI server, and hybrid Discover results that keep deterministic fit reasons primary. Semantic extras carry explicit provenance. Unreachable AI or a stale hash degrades to deterministic-only results. Android Pixel 8 rehearsal on 2026-09-02 showed live retrieve extras on device via `adb reverse`. BGE-M3 stays a replaceable candidate, not a locked choice.
- [ ] **Discover reranking** — benchmarked, not adopted. Ollama 0.33.2 has no `/api/rerank`. A constrained `qwen3:4b` listwise reorder of the embedding top-8 improved English recall@3 from 0.58 to 0.71, left Greek and MRR unchanged, kept Bergen first on fjord probes, and averaged 3284 ms. That is too slow and too uneven to wire into Discover. A BGE reranker remains the candidate; do not install one until a real rerank serving path can be measured.
- [x] **Grounded AI explanations** — opt-in Qwen explanation of one grounded Discover candidate from catalogue facts and the explicit Brief. Invented destinations, coordinates, prices, other catalogue names, and extra fit tags fail closed. Unreachable AI leaves ranking unchanged. Android Pixel 8 rehearsal on 2026-09-02 accepted a Porto explanation and fail-closed a Rome explanation that invented a missing fit tag.
- [x] **Best time V1** — sourced months for a known grounded catalogue destination, with cited source and `checkedAt` freshness. Destinations without timing evidence stay unknown. Months are not converted into Create Trip dates. Automated tests exist. Android Pixel 8 opened the catalogue list and Bergen sourced months on 2026-09-02; Create Trip from that screen was not exercised.
- [x] **Ready-made journeys V1** — curated journey ideas over grounded catalogue destinations. They remain distinct from confirmed trips until the traveler accepts them through `/new-trip`. Extra cities stay ideas because Create Trip still authors one destination. Automated tests exist. Android Pixel 8 opened the journey list on 2026-09-02; journey detail and Create Trip from a journey were not exercised.
- [x] **Wishlist V1** — durable saved Discover candidates keyed by grounded identity, distinct from Trips and World history. Unknown identities fail closed. Create Trip still requires explicit confirmation. Automated tests exist. Android Pixel 8 opened the empty Saved ideas list on 2026-09-02; save/remove was not exercised.
- [x] **Import Review Queue V1** — pasted iCalendar events become durable claims with provenance and confidence. Accepting writes a planned booking onto an existing trip; dismissing does not. Location text is not coordinates. Date-only events do not invent times. No AI extraction. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-02 pasted an `.ics`, reviewed the claim, accepted a planned booking onto Coullons, then deleted that booking. Review is `/import/review/[batchId]` so `/import/index` is not captured as a batch id.
- [x] **Import ICS file picker V1** — `expo-document-picker` chooses a local file and feeds the same review queue. Paste remains. Non-iCalendar content and files larger than 512 KiB fail closed. No PDF/ZIP/image extraction and no AI parsing. Automated tests exist. Android Pixel 8 development-build rebuild on 2026-09-02 opened the system picker and reviewed `e2e-ferry.ics` without writing a booking. iOS was not rebuilt.
- [x] **Import email-wrapped iCalendar V1** — paste or a chosen file may be a raw calendar, UTF-16 calendar bytes, or an email that contains a `text/calendar` part. Extraction feeds the same review queue. The hash is of the extracted calendar, so the same events stay one batch. No PDF/HTML scraping and no AI. Automated tests exist. Android Pixel 8 chose `e2e-email.eml` from Downloads on 2026-09-02 and reviewed `E2E Email Catamaran` without writing a booking. iOS was not rebuilt.

### Remaining Phase 4 work

- [ ] Rebuild the iOS development client so the ICS file picker can be rehearsed there.
- [ ] Add remaining import formats (PDF/Office/images) only with an explicit extractor contract that still cannot write bookings.
- [ ] Keep AI-assisted extraction behind explicit review and confirmation gates if it is added later.
- [ ] Never allow recommendations, imports, or AI suggestions to silently become canonical facts.
- [ ] Define production provider, privacy, retention, cost, and fallback behavior before shipping intelligence beyond the local-dev AI foundation.

Exit condition: discovery and import reduce planning effort while every unconfirmed claim remains visibly separate from trip truth.

## Phase 5 — Premium Product Polish

Goal: turn coherent functionality into a distinctive, accessible native product.

- [x] Complete UX Refinement V1: preserve the TravelOS identity while making Companion the signature surface, tightening utility-screen hierarchy, reducing card stacking and shadows, improving Plan density, compacting Bookings/Accommodation summaries, and turning More into a fast grouped hub.
- [x] Remove traveler-facing engineering terminology from Companion, Travelers, Trip Details, destination selection, and time/date form helpers while preserving the underlying canonical data rules.
- [x] Establish shared compact utility-header and summary-strip primitives and apply them across Plan, Bookings, Budget, Accommodation, Travelers, More, and Trip Details without adding a UI framework.
- [ ] Complete the remaining UX Refinement V1 Android visual/function matrix for Plan, Bookings, More, Travelers, forms, Map, CRUD, and cold relaunch; the debug build/install/launch and updated upcoming Companion first screenful are verified, but emulator control ended before the rest of the matrix could be observed.
- [ ] Extend design QA to Discover, World, Profile, Memories, Travel Book, and Travel DNA screens that shipped after UX Refinement V1. Those surfaces were not part of the incomplete V1 visual matrix. No device visual matrix was run for this documentation handoff.
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
- Destination truth must come from grounded sources. AI is not a destination source.
- Embedding, reranker, and explanation models named in this roadmap are candidates to evaluate, not permanent architecture commitments.
- A phase is complete only when its behavior, failure states, tests, and documentation agree.
- Update docs/CURRENT_STATE.md and this roadmap after each meaningful milestone.

Unresolved work that remains in force across phases includes: multi-destination add/remove/reorder; Day → Destination semantics; secure timezone enrichment; FX strategy; Companion V2 lived-state decisions; Memory/Travel Book workspace invalidation; Expo SQLite rehearsal of migrations 7–9; accessibility and design-system consolidation; iOS; CI/EAS; and sync/backup. Those items stay open. They do not replace the immediate Discover sequence in Phase 4.
