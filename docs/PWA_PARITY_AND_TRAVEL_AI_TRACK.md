# PWA Parity + Absolute Travel AI — Master Track

Status: **Wave A done · Wave B done (β1+β2) · Waves C–E remaining**
Draft date: 2026-09-06
Updated: 2026-09-06 (Wave B β2 import line → Plan stop landed)
Branch context: `docs/expo-sqlite-rehearsal-7-15`  
PWA reference: https://travelos3.netlify.app/ (v13.5.1 product memory; vault session observed 2026-09-06)  
Native authority: `AGENTS.md`, `docs/PRODUCT_VISION.md`, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/WEB_REFERENCE.md`

This document consolidates:

1. Product gaps vs the Netlify PWA that are still thin or missing in native.
2. The Absolute Travel AI / Copilot Agent program.
3. An ordered build track with exit criteria, non-goals, and dependencies.

It is an analysis and sequencing contract. It does **not** authorize implementation until the operator marks waves **OK to start**.

---

## 1. Hard product rules (non-negotiable)

These bind every wave below.

| Rule | Meaning |
| --- | --- |
| One canonical Trip | All durable travel facts attach through explicit IDs in SQLite |
| `/new-trip` creates trips | Discover, chat, Home, Import may **prefill** only |
| AI is a copilot | May retrieve, rank, rerank, summarize, explain grounded candidates |
| AI is not a destination source | No invented cities, POIs, coordinates, prices, or bookings |
| No silent SQLite from AI | Suggestions and claims need explicit traveler confirm |
| Discover Brief ≠ Trip | Session/Zustand only until Create Trip confirmation |
| Travel DNA is explicit | Never inferred or AI-generated |
| Do not copy PWA architecture | No Vault-as-sync, no Gemini coupling, no browser localStorage as truth |
| Fail closed | Unknown stays unknown; missing evidence is not invented precision |

**Absolute Travel AI** in TravelOS means: the strongest conversational + tool-using copilot that still obeys the table above — not a freer Gemini clone.

---

## 2. Already strong on native (do not rebuild)

Keep and extend; do not re-implement as PWA ports.

- Canonical Trip graph (days, stops, bookings, stays, budget/FX, travelers, memories, travel book, lived marks).
- Truth-aware Companion (phase, NOW/NEXT, day clock, plan-change notice, offline honesty).
- Native Map with real pins, day framing, walking ETAs/polylines, system turn-by-turn.
- Discover: Brief, grounded catalogue, Best time, journeys, wishlist, retrieve/rerank/explain.
- Import Review Queue (ICS/email/zip/PDF/Office/image + OCR → claims → accept).
- Travel DNA, Plan free-time + Plan Assist, local export/restore, trip notifications.
- Local-dev AI server (`/ai/*`, `/geo/*`, `/import/ocr-extract`) with loopback boundary.

---

## 3. Explicit non-goals (parked)

| Item | Why parked |
| --- | --- |
| Journey Vault / cross-device sync | Phase 6 design; local export/restore is the backup path |
| Gemini-specific coupling | Privacy/cost/provider decision open; use `openai_compatible` later |
| PWA install / browser chrome | Native app, not WebView product |
| Play Console AAB / iOS rebuild | Operator/Mac tracks already deferred |
| Accounts / shared-trip permissions | Design only |
| On-device HF / Whisper / general unconstrained chat | Not authorized by current ROADMAP |
| Invented packing lists / fake “trip health %” without evidence | Violates truth rules |

---

## 4. Gap inventory (PWA idea → native status → proposed V1)

Ranked by traveler value. Each V1 must be native-first and truth-safe.

### Track α — Pre-trip confidence (high value, low truth risk)

| ID | Gap | PWA signal (observed / docs) | Native today | Proposed V1 | Depends on |
| --- | --- | --- | --- | --- | --- |
| α1 | **Trip readiness checklist** | Trip health / “before you leave” pressure; prep strips | `trip-readiness` + Companion readiness exist; More still thin / “coming later” in places | More + Companion surface checklist from **existing** readiness counts only (days with stops, stays, bookings, travelers, budget). Each row links to the real screen. Optional % only if derived from those countable facts — never invented tasks | None |
| α2 | **Stay pins on Map** | Map-centric travel context | Stays have address text; Map uses destination/stop coords only | Optional Accommodation coordinates via same location picker; Map markers with clear “stay” provenance; no geocode-from-free-text invention | Location picker |
| α3 | **Booking quick actions** | Booking action strips / open provider | Full booking CRUD; limited one-tap external actions | Actions only from saved fields: open `https` URL, `tel:`, copy confirmation code. Missing field → hidden action | Booking entity fields |
| α4 | **Packing checklist** | PWA “Βαλίτσα” progress | Not a first-class module | Trip-owned packing list in SQLite (items, packed bool). Traveler-authored only. Optional template seeds labeled as suggestions until accepted. No AI-invented packing as truth | Migration |
| α5 | **Home multi-trip readiness glance** | Home shows multiple upcoming trips + readiness feel | Editorial Home with featured / doors | Optional glance chips from readiness snapshot for upcoming trips (counts only). No second trip database | α1 |

### Track β — Import & claim depth

| ID | Gap | PWA signal | Native today | Proposed V1 | Depends on |
| --- | --- | --- | --- | --- | --- |
| β1 | **Claim → rich booking** | Broad confirmation import narrative | OCR/ICS → claims; accept often thin `other` booking | Review UI: edit type, times, reference, provider URL/phone before accept. Accept writes only edited confirmed fields | Import review |
| β2 | **Import line → Plan stop** | Itinerary-shaped material | `itinerary_line` mark-reviewed only | “Add as stop” opens stop editor prefilled from claim; TripStop written only on save | Import + Plan editor |
| β3 | **Seed → Create Trip polish** | Material → plan funnel | Seed handoff exists | Clearer review copy + prefill quality; still no silent trip write | Seed V1 |

### Track γ — Create Trip & Discover decision support

| ID | Gap | PWA signal | Native today | Proposed V1 | Depends on |
| --- | --- | --- | --- | --- | --- |
| γ1 | **Origin on Create Trip** | Origin in Create V2 | Destinations only | Optional origin place (picker facts only), not a competing destination clock | Picker |
| γ2 | **Party on trip** | Party type in create | DNA “typical party”; travelers are separate IDs | Optional party size/type on Trip for planning context. Does **not** auto-create Traveler rows | Schema |
| γ3 | **Budget at create** | Budget asked early | Budget under More after create | Optional planned amount + accounting currency → create Budget only if both provided | Budget service |
| γ4 | **Create “unsure where” door** | Uncertainty in create path | Home/Discover help-me-decide | Where step: Know place vs Help me decide → Discover Brief → return grounded prefill | Discover |
| γ5 | **Discover tradeoff compare** | Destination tradeoffs | Per-card reasons + explain | Compare 2–3 grounded identities on Brief dimensions with cited catalogue facts only | Discover results |
| γ6 | **Best-time catalogue depth** | Season guidance | Best time V1; sparse sourced months | Expand grounded month citations only; unknown stays unknown | Catalogue data |
| γ7 | **Journey → Plan Assist handoff** | Journeys as plan start | Journeys prefill cities | After Create from journey, offer Plan Assist per empty day (accept → addStop) | Plan Assist |

### Track δ — World / archive polish

| ID | Gap | PWA signal | Native today | Proposed V1 | Depends on |
| --- | --- | --- | --- | --- | --- |
| δ1 | **World footprint stats** | Country / day / archive stats | Planned/lived map + memory covers | Counts from `countryCode` + lived evidence (done-stop + Day→Destination) only | World V1 |
| δ2 | **Share trip snapshot** | Share controls on trip | Local export exists at Profile | Trip-scoped share of non-secret summary / export slice via system share — no Vault | Sharing |

### Track ε — Absolute Travel AI (Copilot Agent)

| ID | Milestone | Scope | Non-goals |
| --- | --- | --- | --- |
| ε1 | **Travel Chat V1** | Home (and Discover door) conversational session. Server `POST /ai/chat` (or equivalent) with **allow-listed tools only**: read Travel DNA, update session Discover Brief, `discover-retrieve`, `discover-explain`, list grounded candidates. UI: message thread + destination cards + **Confirm → `/new-trip` prefill**. Session-only; no SQLite trip writes from the model | Free-form agent that invents places; silent Create Trip; cloud retention |
| ε2 | **Trip Copilot V1** | Inside an existing trip workspace. Tools: free-time advice, Plan Assist suggestions, readiness summary (α1), booking/claim help pointing at review screens. Mutations only after explicit tap (addStop / open booking editor / accept claim) | Autonomous itinerary rewrite |
| ε3 | **Production brain V1** | Activate `openai_compatible` (or chosen production provider) behind same tool contract. Privacy copy, retention = none or documented, user kill-switch in Profile. Loopback Ollama remains for local-dev | Shipping HF weights on device; removing grounded tool gates |
| ε4 | **Voice later (optional)** | Only after ε1–ε3 stable; `AI_VOICE_ENABLED` already reserved false | Whisper as destination source |

**Tool allow-list principle (ε1–ε3):** every model “action” is either (a) a read of local/session/grounded data, (b) a session Brief mutation, or (c) a **proposal card** that the traveler must confirm through an existing native write path.

---

## 5. Recommended build order (waves)

Operator reviews this order. Implementation starts only after OK per wave (or OK for a contiguous block).

### Wave A — Truth-safe product depth (start here after OK)

**Builds:** α1 Trip readiness checklist · α2 Stay pins · α3 Booking quick actions  

**Why first:** Matches PWA “before you leave / map / bookings” pressure with almost no new AI surface and low corruption risk.

**Exit criteria:**

- [x] More (and/or Companion) shows readiness rows from real counts with working deep links.
- [x] Accommodation can save picker coordinates; Map shows stay markers distinctly from stops.
- [x] Booking detail/list exposes URL / tel / copy-code only when fields exist. (URL + confirmation code via Share; no phone field on Booking entity)
- [x] `npx tsc --noEmit`, relevant tests, focused Android smoke. *(tsc + 363 tests pass; Android smoke pending)*

**Estimate shape:** 1 implementation pass (checklist + map stay + booking actions), small migration only if Accommodation coords need a column (inspect schema before coding).

---

### Wave B — Import depth

**Builds:** β1 Claim → rich booking · β2 Import line → stop · β3 seed polish as needed  

**Exit criteria:**

- [x] Review accept path can set structured booking fields before write.
- [x] Itinerary-line claim can open prefilled stop editor; save is the only write.
- [x] No silent Booking/Stop from OCR text alone (regression preserved).

---

### Wave C — Create & Discover decisions

**Builds:** γ1 Origin · γ2 Party · γ3 Budget at create · γ4 Unsure-where door · γ5 Compare (γ6/γ7 can trail)  

**Exit criteria:**

- [ ] Create Trip can optionally capture origin/party/budget without inventing travelers or FX.
- [ ] Unsure-where routes through Discover Brief and returns grounded prefill only.
- [ ] Compare shows 2–3 catalogue IDs with fail-closed missing evidence.

---

### Wave D — Packing + Home glance + World stats

**Builds:** α4 Packing · α5 Home readiness glance · δ1 World stats · δ2 Share snapshot (optional)  

**Exit criteria:**

- [ ] Packing items are traveler-owned SQLite rows; progress % = packed/total.
- [ ] World stats never use destination title as visit evidence.
- [ ] Share uses system sheet; no Vault protocol.

---

### Wave E — Absolute Travel AI

**Builds:** ε1 Travel Chat V1 → ε2 Trip Copilot V1 → ε3 Production brain  

**Exit criteria (ε1):**

- [ ] Chat UI on Home (or dedicated route) with session transcript (Zustand or ephemeral).
- [ ] Server chat endpoint with tool allow-list; invented identities rejected.
- [ ] Destination cards only from grounded retrieve/catalogue.
- [ ] Confirm opens `/new-trip` with prefill; cancel leaves no trip.
- [ ] Profile/copilot health shows chat tool as available/unavailable honestly.
- [ ] Automated tests for tool allow-list + identity guards; Android smoke with local Ollama.

**Exit criteria (ε2):**

- [ ] Trip-scoped copilot can propose free-time / Plan Assist / readiness next steps.
- [ ] Every write requires an existing editor/accept path.

**Exit criteria (ε3):**

- [ ] Production provider selectable via env; same tools; documented privacy; local-dev still works offline-loopback.

---

## 6. Dependency graph (simplified)

```text
α1 readiness ─────────────┐
α2 stay pins              ├─► Wave A done
α3 booking actions ───────┘
         │
         ▼
β1 / β2 import depth ───── Wave B
         │
         ▼
γ* create/discover ─────── Wave C
         │
         ▼
α4 packing / δ1 stats ──── Wave D
         │
         ▼
ε1 Travel Chat ──► ε2 Trip Copilot ──► ε3 Production brain   (Wave E)
         ▲
         └── reuses Discover retrieve/explain, Brief, readiness (α1), Plan Assist
```

Wave E can **overlap design** with A–D, but ε1 implementation should wait until Discover retrieve/explain remain stable (already true) and ideally α1 exists so chat can cite readiness language consistently. ε1 may start after Wave A if operator prioritizes AI earlier — call that **reorder decision**.

---

## 7. Operator decision checklist

Reply with decisions (example: `OK A`, `OK A+E1 first`, `hold packing`, etc.).

| Decision | Options |
| --- | --- |
| Start wave | A / B / C / D / E / custom subset |
| AI priority | E after A (recommended) · E1 immediately after A · E1 in parallel with A |
| Packing α4 | In Wave D (default) · Pull into Wave A · Defer indefinitely |
| Production AI ε3 | Design-only until cloud provider chosen · Include provider choice now: _______ |
| Schema for stay coords | Prefer new columns on Accommodation if missing · Link-only via stop (weaker) |
| Docs after OK | Update `ROADMAP.md` checkboxes when each wave completes · Keep this file as living track |

---

## 8. Definition of done for the whole track

The track is complete when:

1. Waves A–D close the highest-value PWA *product* gaps without copying web architecture.
2. Wave E delivers conversational Absolute Travel AI under the copilot contract.
3. `docs/CURRENT_STATE.md` and `docs/ROADMAP.md` reflect what actually shipped.
4. Parked items (Vault, Gemini, Play, iOS, accounts) remain explicitly parked, not silently started.

---

## 9. Open questions for analysis (answer before or during first OK)

1. Should readiness % match PWA-style “82% ready”, or prefer calm checklist without a percentage?
2. Is packing (βαλίτσα) must-have for v1 delight, or later?
3. For Travel Chat V1, is Greek-first copy required on day one, or English product copy with locale later?
4. Production brain: prefer dedicated Inference Endpoint, OpenAI-compatible third party, or stay local-only until accounts exist?
5. Any PWA surfaces from your vault trips that feel more important than readiness/map/booking actions (e.g. Guide/Οδηγός)? If yes, name them for a new gap ID.

---

*End of proposal. No implementation implied until operator OK.*
