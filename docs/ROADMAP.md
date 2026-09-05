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

- [x] **TripRuntimeState integrity V1** — optional `current_day_id` / `current_stop_id` must belong to the same trip; when both are set the stop must belong to that day. Invalid historical links are archived and cleared. Deleting a day or stop unlinks the reference (`ON DELETE SET NULL`) instead of deleting the runtime row. Migration version 13. Stop lived phase V1 now writes this row only as a last explicit lived-stop pointer. Automated tests exist. Version 13 ran on the 2026-09-03 Android 7–15 upgrade; lived progress itself was not rehearsed on device.
- [x] **Stop-day same-trip V1** — a TripStop day must belong to the same trip. Invalid historical mismatches are archived and the stop is deleted so Booking unlinks can run; stop content stays in the archive instead of moving onto another trip. Migration version 14. Automated tests exist. Version 14 ran on the 2026-09-03 Android 7–15 upgrade.
- [x] **Memories day/stop FK V1** — `memories.day_id` and `memories.stop_id` have declared foreign keys (`ON DELETE SET NULL`). Dangling historical IDs are cleared; the Memory is kept. Travel Book memberships survive the table rebuild. Same-trip ownership remains in the v7 triggers. Migration version 15. Automated tests exist. Android Pixel 8 Expo SQLite rehearsal on 2026-09-03 reached live `user_version = 15` after dropping v7 unlink triggers before `DROP TABLE memories`.
- [x] **Memory / Travel Book workspace invalidation V1** — Memories create/edit/delete and Travel Book save/delete go through TripWorkspace actions. Those writes invalidate and reload the shared aggregate, so More counts and other Trip Space tabs cannot stay stale. Update/delete fail closed when the record is missing or belongs to another trip. Automated lifecycle tests exist. No device rehearsal.
- [x] **Trip list batch read V1** — Home, Trips, World, Profile, and Import load the trip list with three SQLite queries (trips, destinations, traveler memberships) instead of one destination query and one traveler query per trip. Destination order and traveler memberships are preserved. Automated tests exist. An Android Pixel 8 pass opened Home, Trips, World, and Profile after a Metro reload; Import was not opened.
- [x] **Recovery-archive coverage V1** — Node tests cover remaining migration archive paths: v3 retargets Memory and TripRuntimeState from an archived duplicate day; v5 archives a booking whose stop is missing; v6 archives missing Accommodation booking/stop IDs; v7 archives a Memory whose day and stop IDs are missing. Booking/stop, Accommodation, TripRuntimeState, Stop-day same-trip, and Memories day/stop unlink cascades already had Node coverage. No user-facing archive inspection tool.
- [x] **Lint / baseline CI V1** — committed Expo SDK 57 `eslint-config-expo` flat config, non-interactive `eslint .`, and a GitHub Actions workflow for `npx tsc --noEmit`, `npm test`, lint, and AI-server tests on Node 22. Existing React Compiler findings are warnings. No git remote, so the workflow has not run on GitHub.
- [ ] **Deferred — iOS migration 3 rehearsal** — last, together with the iOS development-client rebuild. Windows cannot run this.
- [x] Rehearse migrations 7–15 on an Expo SQLite development build. An Android Pixel 8 development-build pass on 2026-09-03 upgraded the installed `travelos.db` to live `PRAGMA user_version = 15` with Memory `trip_id` / `day_id` / `stop_id` foreign keys. The first attempt failed until v15 dropped v7 itinerary unlink triggers before rebuilding `memories`. Existing trips survived. iOS was not rehearsed.
- [x] Rehearse migrations 16–17 and native-link `expo-network` on an Expo SQLite development build. An Android Pixel 8 debug rebuild on 2026-09-03 installed over the existing `com.travelos.app` client and upgraded live `PRAGMA user_version` from 15 to 17. Home still listed existing trips. Companion and Map opened. Airplane-mode offline copy was not rehearsed. iOS was not rehearsed.

Exit condition: existing native flows survive retries, partial data, navigation refocus, and supported migrations without corrupting or misrepresenting trip truth.

## Phase 1 — Complete Trip Core implemented

Goal: turn the current vertical prototype into a coherent pre-trip workspace.

- [x] Build one native trip budget and actual-expense flow with original currencies, explicit booking/stop IDs, truthful same-currency totals, category breakdown, persistence tests, and Android runtime verification.
- [x] Implement More as a functional trip hub with canonical Trip Details, Budget, Accommodation, Travelers, Memories, Travel Book, Itinerary, Bookings, Map, and Companion navigation while labelling remaining future modules honestly.
- [x] Add service-backed Trip Details editing for title, valid existing destination names, native dates, accounting currency, and lifecycle status.
- [x] Reject invalid/reversed detail dates, prevent manual assignment of active truth, preserve structured destination metadata, and block accounting-currency changes once a Budget exists.
- [x] Add confirmed cascade deletion for trip-owned local data, workspace not-found transition, trip-list refresh, automated coverage, and Android runtime verification with isolated data.
- [x] **FX rates V1** — traveler-supplied rate, as-of calendar date, and `traveler` provenance. Foreign paid expenses enter accounting-currency totals only through a matching pair. No live market feed. Automated tests exist. No device rehearsal.
- [x] Replace free-form Create Trip destinations with native real-location selection; add explicit ID-preserving destination replacement/legacy upgrade in Trip Details; persist only provider-returned place facts; and render all mapped destinations without a hidden first-destination assumption.
- [x] **Multi-destination authoring V1** — Create Trip and Trip Details can add, reorder, and remove up to eight real map destinations. New destinations require a picker selection. A trip cannot drop to zero destinations once it has one. Removing a destination does not delete stops, bookings, or stays. Ready-made journeys can prefill extra catalogue cities. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 prefilled Lisbon and Porto from a journey and added Coimbra through the native location picker.
- [x] **Day → Destination V1** — optional `TripDay.destinationId` assigned from Plan against existing trip destinations. Unassigned is valid. Destination order is never treated as the day’s city. Removing a destination clears the day’s assignment (`ON DELETE SET NULL`) instead of deleting the day. Trip destination saves upsert by ID so assignments survive Trip Details. Companion’s active hero shows today’s assigned city or “City not set for today”. Timezone is not inferred from the assignment and is not used to decide which calendar date is today. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 assigned Lisbon to Day 1 of an isolated trip.
- [x] **Provider identity V1** — persist `placeId` when a location provider result includes one. The installed `expo-location-picker` 1.0.2 still does not expose a stable place ID, so unknown stays unknown.
- [x] Replace free-form Create Trip dates, Booking start/end, and optional Stop time with native inputs and centralized calendar/local-time validation while preserving compatible historical Booking and Stop values.
- [x] Implement Booking ↔ Stop linking by exact ID, including optional native link/relink/unlink UX, Plan/Companion/Map context, zero-to-many reverse cardinality, same-trip validation, safe stop deletion, migration version 5, automated tests, and isolated Android verification.
- [x] Implement native Accommodation management with multiple sorted stays, validated local date/time input, optional same-trip Booking and TripStop links by exact ID, lossless unlink/delete behavior, migration version 6, automated tests, and isolated Android verification.
- [x] Implement native Traveler management with reusable canonical identities, exact-ID many-to-many Trip membership, atomic create-and-add, duplicate prevention, shared edits, membership-only removal, Trip-deletion preservation, TripWorkspace refresh, automated tests, and isolated Android verification.
- [x] **Traveler owner V1** — optional local `owner` / `member` role with at most one owner. Planning trips may still have zero travelers and no owner. Invitations, permissions, reservation ownership, expense splitting, and a one-or-more party rule remain later work (accounts / Phase 6). An Android Pixel 8 pass on 2026-09-03 made Alex OWNER on isolated Lisbon; Remove owner was shown and not pressed.
- [x] Define centralized date/time/runtime truth: canonical date-only Trip/TripDay values, local wall-clock Stop/Accommodation/new Booking values, preserved absolute historical Booking instants, injectable-clock runtime phase, exact active TripDay selection, explicit canonical-destination/device-fallback timezone provenance, and a separate future progress role for TripRuntimeState.
- [x] **Timezone enrichment V1** — IANA timezone only from a provider result, a catalogue handoff, or an explicit traveler choice, with `timezoneSource` provenance. Never guessed from coordinates, currency, or destination order. Companion uses a shared trip timezone when every city agrees, or a day’s assigned city as a clock when that city has a saved timezone and is uniquely today.
- [x] Booking amount and currency must be saved together. Cancelled bookings cannot be marked paid. Delete copy states that linked stays keep their facts and the booking cannot be recovered.
- [x] Archive is reversible organizational status. Delete remains irreversible on this device. There is no backup or export yet. Migration recovery archives are not a user restore tool.

Exit condition: a traveler can create, edit, organize, budget, and validate the essential facts of a trip in one durable workspace.

## Phase 2 — Companion

Goal: make TravelOS useful and correct while the traveler is moving.

- [x] Evolve the existing Today route into one Companion surface without creating competing trip truth or a duplicate durable state store.
- [x] Derive upcoming, active, completed, exact current TripDay, Day X of N, and explicit timezone provenance through deterministic injected-clock services.
- [x] Classify previous/current/next/later/untimed itinerary context without rewriting Plan order or calling an untimed stop current.
- [x] Surface exact linked Booking context, truthful local Accommodation context, preparation signals, and mapped-stop actions using only canonical persisted data.
- [x] Add premium phase-aware native presentation, restrained motion with reduced-motion support, working module actions, and calm imperfect-data states.
- [x] Refresh runtime truth on focus, foreground return, the next resolved local calendar boundary, and the next saved stop start/end while Companion stays open, without polling.
- [x] **Stop-boundary refresh V1** — when timing is reliable, Companion’s single timer also fires at the next canonical stop start or end on the current local date. Untimed and non-canonical times are ignored. After the last timed boundary, refresh returns to local midnight. Automated tests exist. No device rehearsal.
- [x] Add deterministic Companion selector/boundary tests and Android rehearsal for upcoming, incomplete, active fallback, linked Booking, mapped stop, cold relaunch, tab lifecycle, and completed non-live behavior.
- [x] **Day clock V1** — when exactly one TripDay is assigned to a destination with a valid IANA timezone and that timezone’s local calendar date matches the day, Companion uses that city as the clock for phase, current day, and NOW/NEXT. Destination order is never a clock. Two cities claiming today, an unassigned day, or a city without a timezone keep the previous trip-level or device fallback. Automated tests exist. An Android Pixel 8 pass on 2026-09-03 opened isolated Lisbon as LISBON with `Europe/Lisbon`.
- [x] **Home day clock V1** — Home featured-trip phase uses the same assigned-city clock as Companion. TripDays load in one batched query and are not stored in Zustand. Missing days degrade to trip-level timezone. An active featured trip shows today’s assigned city when one exists. Automated tests exist. No device rehearsal.
- [ ] **Deferred — picker / Time Zone API timezone** — `expo-location-picker` 1.0.2 still does not return an IANA timezone or stable place ID. Do not call Google Time Zone API with the Android Maps key. Traveler, catalogue, and future provider timezones already persist. Create Trip traveler timezone V1 is the unblocked slice.
- [x] **Create Trip traveler timezone V1** — Create Trip can set or clear an explicit IANA timezone with `traveler` provenance. Replacing the map pin keeps a traveler timezone when the picker still has none. Coordinates are never used to guess a zone. Automated tests exist. An Android Pixel 8 pass on 2026-09-03 showed Trip Details Porto as saved `Europe/Lisbon` and Coimbra as unknown, not guessed from the pin.
- [x] **Stop lived phase V1** — explicit done/skipped stop progress without rewriting Plan times. Delayed is derived from the clock. `TripRuntimeState` is written only as a pointer to the last explicit lived stop. Migration version 17. Automated tests exist. An Android Pixel 8 rebuild on 2026-09-03 ran version 17. A later pass marked isolated Lisbon `RehearsalCoffee` Done without rewriting Plan.
- [x] **Plan lived badges V1** — Plan shows Done/Skipped from those explicit marks without rewriting saved times. Delayed is not a Plan badge. Marks remain Companion actions. Automated tests exist. An Android Pixel 8 pass on 2026-09-03 showed Plan DONE on `RehearsalCoffee` after Companion Done.
- [x] **Map day framing + directions V1** — Map frames the assigned Day → Destination city and that day’s mapped stops when Companion has a display day. Unassigned days do not borrow another city’s coordinates. View all still fits every saved destination and stop. Directions open Apple Maps or Google Maps on the saved pin only. No route, ETA, or accommodation coordinates. Automated tests exist. No device rehearsal.
- [ ] **Deferred — real routes and ETAs** — Directions still hand a saved pin to Apple Maps or Google Maps. Do not invent travel times. A real routing provider is later work.
- [x] **Companion plan-change notice V1** — when saved dates, day city assignment, stops, bookings, or stays change while Companion is already showing that trip, a dismissible notice states that NOW/NEXT follow SQLite. First load, trip switch, done/skipped marks, and clock refresh stay silent. Lived phases are not auto-rewritten. Session-only. Automated tests exist. No device rehearsal.
- [x] **Offline essential context V1** — SQLite is the durable cache for trip, booking, stay, and saved map-pin facts. `expo-network` observes reachability; unknown does not invent online or offline. Companion and Map name on-device facts, missing coordinates, and that live tiles/lookup need a network. Directions still use a saved pin; there is no cached route and no offline tile pack. Automated tests exist. An Android Pixel 8 native rebuild on 2026-09-03 linked `expo-network` 57.0.1; Companion and Map opened. Airplane-mode offline copy was not rehearsed.
- [ ] **Deferred — notifications** — only after picker/API timezone and Companion truth rules are stable on device.

Exit condition: Companion presents the correct travel context and remains trustworthy during connectivity, timing, and plan changes.

## Phase 3 — Post-trip implemented

Goal: turn completed trips into a meaningful personal history.

- [x] Memories V1: native create/edit/delete for note and photo memories with explicit Trip ID plus optional TripDay and TripStop IDs, local photo copies in app storage, and migration version 7 same-trip integrity guards. Video remains a domain type without an authoring path. Migration integrity is covered by Node tests. No Memories device rehearsal is recorded.
- [x] Travel Book V1: one book per trip, ordered same-trip Memory membership, title/summary/cover from selected photo media, and a local `isPublished` flag that is not cloud publish or export. This documentation update did not run a device rehearsal.
- [x] World V1: native map and destination cards from persisted Trip destinations with real saved coordinates only. Filters use durable `Trip.status` (planning / completed / archived), not the runtime phase resolver, and do not infer visited history from a destination title.
- [x] **World planned vs lived V1** — World labels and filters destinations as planned or lived from explicit done-stop + Day → Destination IDs. A completed trip is not a visit. Skipped stops and unassigned days do not invent a city. Same names on different trips stay separate. Wishlist is still not World history. Automated tests exist. No device rehearsal.
- [x] **World archive V1** — lived World places can show memories linked by explicit day or stop IDs, including a saved photo cover when one exists. Memories do not mark a visit. Unlinked memories and planned-city notes stay off World. Wishlist and destination titles are not archive evidence. Automated tests exist. No device rehearsal.
- [x] **Preserve planned vs lived** — Plan times are not rewritten by done/skipped marks. Plan shows Done/Skipped badges from those marks. Companion lived phase and World planned/lived labels stay separate from the planned itinerary. `TripRuntimeState` is only a last-lived-stop pointer.
- [x] **Memory media contract V1** — owned files are app-document copies under `travelos/memories/`. Gallery originals are never deleted. Backup and export are none. Copies remain available offline. Memory replace/delete and trip delete update SQLite first, then best-effort delete owned files. Video authoring remains absent. Automated tests exist. No device rehearsal.
- [x] Route Memory and Travel Book mutations through TripWorkspace invalidation.

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
- [ ] **Deferred — Discover reranking** — benchmarked, not adopted. Ollama 0.33.2 has no `/api/rerank`. A constrained `qwen3:4b` listwise reorder of the embedding top-8 improved English recall@3 from 0.58 to 0.71, left Greek and MRR unchanged, kept Bergen first on fjord probes, and averaged 3284 ms. That is too slow and too uneven to wire into Discover. A BGE reranker remains the candidate; do not install one until a real rerank serving path can be measured.
- [x] **Grounded AI explanations** — opt-in Qwen explanation of one grounded Discover candidate from catalogue facts and the explicit Brief. Invented destinations, coordinates, prices, other catalogue names, and extra fit tags fail closed. Unreachable AI leaves ranking unchanged. Android Pixel 8 rehearsal on 2026-09-02 accepted a Porto explanation and fail-closed a Rome explanation that invented a missing fit tag.
- [x] **Best time V1** — sourced months for a known grounded catalogue destination, with cited source and `checkedAt` freshness. Destinations without timing evidence stay unknown. Months are not converted into Create Trip dates. Automated tests exist. Android Pixel 8 opened the catalogue list and Bergen sourced months on 2026-09-02; Create Trip from that screen was not exercised.
- [x] **Ready-made journeys V1** — curated journey ideas over grounded catalogue destinations. They remain distinct from confirmed trips until the traveler accepts them through `/new-trip`. Extra catalogue cities can prefill additional Create Trip destinations. Automated tests exist. Android Pixel 8 opened the journey list on 2026-09-02. A 2026-09-03 pass opened Lisbon and Porto detail and Create Trip with both cities prefilled.
- [x] **Wishlist V1** — durable saved Discover candidates keyed by grounded identity, distinct from Trips and World history. Unknown identities fail closed. Create Trip still requires explicit confirmation. Automated tests exist. Android Pixel 8 opened the empty Saved ideas list on 2026-09-02. A 2026-09-03 pass saved Slow days in Porto, listed it, then removed it.
- [x] **Import Review Queue V1** — pasted iCalendar events become durable claims with provenance and confidence. Accepting writes a planned booking onto an existing trip; dismissing does not. Location text is not coordinates. Date-only events do not invent times. No AI extraction. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-02 pasted an `.ics`, reviewed the claim, accepted a planned booking onto Coullons, then deleted that booking. Review is `/import/review/[batchId]` so `/import/index` is not captured as a batch id.
- [x] **Import ICS file picker V1** — `expo-document-picker` chooses a local file and feeds the same review queue. Paste remains. Non-iCalendar content and files larger than 512 KiB fail closed. No PDF/ZIP/image extraction and no AI parsing. Automated tests exist. Android Pixel 8 development-build rebuild on 2026-09-02 opened the system picker and reviewed `e2e-ferry.ics` without writing a booking. iOS was not rebuilt.
- [x] **Import email-wrapped iCalendar V1** — paste or a chosen file may be a raw calendar, UTF-16 calendar bytes, or an email that contains a `text/calendar` part. Extraction feeds the same review queue. The hash is of the extracted calendar, so the same events stay one batch. No PDF/HTML scraping and no AI. Automated tests exist. Android Pixel 8 chose `e2e-email.eml` from Downloads on 2026-09-02 and reviewed `E2E Email Catamaran` without writing a booking. iOS was not rebuilt.
- [x] **Import calendar ZIP V1** — a chosen zip can contain calendars or emails with a calendar part. Nested zips are skipped. Members over 512 KiB are skipped. Extraction feeds the same review queue. No PDF/Office/image parsing and no AI. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-zip-ferry.zip` and reviewed `E2E Zip Ferry` without writing a booking.
- [x] **Import PDF-embedded iCalendar V1** — a chosen PDF yields claims only when it contains a `BEGIN:VCALENDAR` block, including FlateDecode streams. Confirmation PDFs without a calendar fail closed. No AI parsing of invoice or ticket prose. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-pdf-ferry.pdf` and reviewed `E2E Pdf Ferry` without writing a booking.
- [x] **Import Office-embedded iCalendar V1** — Word/Excel/PowerPoint Open XML packages yield claims only when visible text contains a `BEGIN:VCALENDAR` block, including text split across Office runs. No AI parsing of confirmation prose. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-office-ferry.docx` and reviewed `E2E Office Ferry` without writing a booking.
- [x] **Import image-embedded iCalendar V1** — JPEG, PNG, GIF, and WEBP files yield claims only when metadata or file bytes contain a `BEGIN:VCALENDAR` block, including compressed PNG zTXt and text split across chunks. Ticket photos without a calendar fail closed. No OCR and no AI parsing of confirmation prose. Automated tests exist. Android Pixel 8 rehearsal on 2026-09-03 chose `e2e-image-ferry.png` and reviewed `E2E Image Ferry` without writing a booking.

### Remaining Phase 4 work

- [ ] **Deferred — iOS rebuild** — last. Rehearse migration 3, ICS file picker, and the rest of native import on an iOS development build. Windows cannot do this.
- [ ] **Deferred — confirmation-photo OCR** — only with an explicit extractor contract that still cannot write bookings. Ticket photos without an embedded iCalendar already fail closed. No OCR engine is installed.
- [x] **Import and AI confirmation gates** — AI-assisted extraction is not implemented. Import claims still require explicit review before a booking is written. Plan ideas and Discover explanations cannot become stops or destinations on their own.
- [x] **No silent canonical facts** — Discover, import claims, and AI suggestions remain visibly separate from trip truth until the traveler confirms through the existing Create Trip, import-accept, or stop-editor paths.
- [x] **Local-dev AI boundary V1** — production provider is none. The native client uses a loopback AI URL only; a cloud host in `EXPO_PUBLIC_TRAVELOS_AI_URL` is ignored. No cloud retention, no billed cost, unreachable AI degrades, and advice cannot write SQLite. Automated tests exist. No device rehearsal.
- [x] **Local-dev AI provider abstraction V1** — `server/ai-provider.js` + env model IDs, copilot prompt file, tool registry (available vs not_configured), feature flags. Existing free-time / retrieve / explain routes unchanged for the app. No HF production token in the client, no chat UI, no Whisper/vision, no Discover rerank adoption.

Exit condition: discovery and import reduce planning effort while every unconfirmed claim remains visibly separate from trip truth.

## Phase 5 — Premium Product Polish

Goal: turn coherent functionality into a distinctive, accessible native product.

- [x] Complete UX Refinement V1: preserve the TravelOS identity while making Companion the signature surface, tightening utility-screen hierarchy, reducing card stacking and shadows, improving Plan density, compacting Bookings/Accommodation summaries, and turning More into a fast grouped hub.
- [x] Remove traveler-facing engineering terminology from Companion, Travelers, Trip Details, destination selection, and time/date form helpers while preserving the underlying canonical data rules.
- [x] Establish shared compact utility-header and summary-strip primitives and apply them across Plan, Bookings, Budget, Accommodation, Travelers, More, and Trip Details without adding a UI framework.
- [x] UX Refinement V1 Android visual/function matrix remainder: closed on Pixel 8 on 2026-09-03 (booking save/delete, stop delete, trip delete confirm cancelled).
- [x] Design QA V1 for Discover, World, Profile, Memories, Travel Book, and Travel DNA: accessibility labels/targets and hierarchy pass in code; full Pixel visual matrix for these surfaces remains a device smoke when the emulator is available.
- [x] Shared polish primitives V1: typography/spacing via `@/theme`; `EmptyState` / `InlineError`, `LocalImage`, `confirmDestructive`, `MIN_TOUCH_TARGET` on top of existing `Screen` / `UtilityScreenHeader` / motion helpers. Sheets stay native `Modal` + `Alert`. Full Field/Card framework deferred.
- [x] Pass 1–2 restrained motion with Reduce Motion: tabs, primary CTAs, Plan badges, Discover stagger/bookmark, Companion/Map notices, World filters.
- [x] Light haptics V1 in code (`expo-haptics` 57.0.2 on tab select, primary CTAs, Companion Done/Skip, Discover wishlist). Android development-build rebuild on 2026-09-05 linked the native module; emulator feel remains limited.
- [x] Imagery strategy V1: `docs/IMAGERY.md` — local traveler media only; Discover stays text/icon; no stock CDN; `LocalImage` for memory/book covers.
- [x] Accessibility V1: labels and ≥44pt targets on Home, World filters, Discover find chips, Memories, Travel Book, Travel DNA; Reduce Motion already on motion/haptics. Dynamic type policy and iOS VoiceOver stay later.
- [x] Localization architecture V1: `locale-format` + device-locale dates/currency; English UI copy. String catalogs, Greek UI, and RTL deferred.
- [x] Layout validation V1: Android Pixel 8 remains the verified phone size from prior Phase 5 matrix; multi-size Android matrix and iOS deferred to device sessions.
- [x] Remove unused Expo starter components, orphan theme hooks/CSS, unused Expo images, and direct `expo-symbols` / `expo-web-browser` deps (`expo-symbols` may remain transitive via `expo-router`). App icons and splash in `app.json` remain until branded replacements exist.
- [x] Design QA and performance budgets V1 recorded in `docs/CURRENT_STATE.md` for Home, Trips, Companion, Plan, Discover results, World, Memories.

Exit condition: core flows feel calm, specific, responsive, accessible, and intentionally native rather than template-derived. **Phase 5 V1 is closed in code on this branch.** Remaining device gates: optional multi-size Android smoke; iOS last.

## Phase 6 — Cloud and Release

Goal: make user data durable across devices and operate TravelOS as a released product.

- [x] Local data export V1: Profile can write a versioned JSON backup of trips, Travel DNA, saved places, and related canonical facts without mutating SQLite. Photo bytes are omitted; cloud sync remains later. `expo-sharing` 57 is used when available.
- [x] Local data restore V1: Profile can pick a `travelos.local-export.v1` JSON backup, confirm a destructive replace, and atomically wipe+reload canonical local tables while preserving exported IDs. Photo bytes are not restored; import review queues are cleared (not in the export contract). Automated parse and round-trip persistence tests exist.
- [x] EAS build profiles V1: committed `eas.json` with development / preview / production. Production uses `autoIncrement: true` (Android `versionCode` / iOS `buildNumber`).
- [x] EAS project link V1: Expo account `velegris`, project `@velegris/TravelOS`, `extra.eas.projectId` in `app.json`. Cloud builds and store credentials can proceed next.
- [x] Credentials and versioning discipline V1: root `.env.example` names required/optional env vars without values; `server/.env.example` already documents AI server vars; Maps key stays out of git; `app.config.js` loads `.env.local` for config evaluation without printing secrets; `app.json` carries `android.versionCode` and `ios.buildNumber`; export snapshots record `expo.version` via `expo-constants`. Store signing credentials remain operator steps on EAS.
- Define accounts, identity, guest conversion, shared-trip permissions, and data ownership.
- Design backend sync and conflict resolution around SQLite-backed canonical IDs.
- Complete iOS bundle, maps, permissions, device testing, TestFlight, and App Store readiness (**last**; Windows cannot rebuild iOS).
- Complete Android signing via EAS credentials, set `GOOGLE_MAPS_API_KEY` as an EAS secret for cloud builds, verify Maps key package/SHA restrictions, then preview/production Play tracks.
- [x] **Android EAS preview build V1** — `GOOGLE_MAPS_API_KEY` stored as EAS env secret for development/preview/production; `eas.json` profiles declare matching `environment`; remote Android keystore created on Expo; first preview APK built 2026-09-05 (`ca98eafd-e956-4e05-9a62-78aeddfdfa94`). Play tracks and Maps package/SHA restriction verification remain open.
- Add notifications after platform permission, timezone, and Companion rules are complete (still parked with Time Zone API).
- Add privacy-aware crash reporting, performance monitoring, structured diagnostics, and operational alerts.
- [x] **CI / migration / rollback procedure V1** — local release gates are `npx tsc --noEmit`, `npm test`, `cd server && npm test`, `npm run lint`, and `git diff --check`. GitHub Actions workflow is committed; this branch still needs `git push -u origin HEAD` before CI runs remotely. Migrations stay forward-only (never edit shipped migrations). Rollback without cloud sync: keep a Profile JSON export before destructive restore; revert native clients by installing a prior APK/AAB; SQLite has no automatic cloud undo.

Exit condition: TravelOS can be built, tested, observed, restored, and released safely on iOS and Android.

## Parked remaining work (2026-09-03)

These stay later. They were not implemented in this pass. iOS rebuild is last.

- Picker or restricted Time Zone API enrichment. Do not use the Android Maps key. Traveler IANA on Create Trip / Trip Details already exists.
- Real in-app routes and ETAs. Saved-pin directions stay. Do not invent travel times.
- Notifications, only after timezone truth is stable on device.
- Discover reranking. Do not install a BGE reranker until a real `/api/rerank` path can be measured.
- Confirmation-photo OCR, only with an extractor that cannot write bookings.
- Phase 5 visual/function matrix remainder: closed on Pixel 8 on 2026-09-03. Phase 5 polish V1 closed in code. Android rebuild on 2026-09-05 linked haptics/sharing. iOS last.
- iOS development-client rebuild and Expo SQLite rehearsal.

## Cross-cutting rules

- Preserve one canonical Trip and explicit ID relationships at every phase.
- SQLite remains the local durable truth; Zustand remains UI/session state.
- Preserve existing user data and working behavior.
- Do not fabricate data to make a screen appear complete.
- Destination truth must come from grounded sources. AI is not a destination source.
- Embedding, reranker, and explanation models named in this roadmap are candidates to evaluate, not permanent architecture commitments.
- A phase is complete only when its behavior, failure states, tests, and documentation agree.
- Update docs/CURRENT_STATE.md and this roadmap after each meaningful milestone.

Unresolved work that remains in force across phases is listed under Parked remaining work. A GitHub Actions workflow is committed; this branch still needs an upstream push before CI runs on GitHub. Those items stay open. They do not authorize inventing timezones, routes, or a production AI provider.
