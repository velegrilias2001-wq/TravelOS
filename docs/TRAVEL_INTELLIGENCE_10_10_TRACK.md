# TravelOS → 10/10 Design Track

Status: **U1–U5 + U2 hosted Android smoke done (this branch)** — remaining U6: Play AAB, iOS, geo/OCR keys, accounts  
Baseline after T0–T4: Completeness 8 · Functional 8.5 · Beat PWA 7.5 · Usable 7.5 · Useful 7.5  
After U1–U5 + hosted Render/`openai_compatible` preview APK smoke (2026-09-06): Android Travel Intelligence path is live; declare store 10/10 only after Play + remaining U6.

Hard rules stay in force (`AGENTS.md`, `PRODUCT_VISION.md`): AI is not a destination source; no silent SQLite; DNA is explicit and confirm-gated; `/new-trip` creates trips.

UX Fix Wave note (2026-09-06): P0 layout/safe-area repairs passed Pixel 8 Android development-build and standalone EAS preview (`78a537ed-22cd-40b0-bfe4-a5112c498057`) smoke with 3-button navigation. Play remains paused pending the P1 hybrid/manual-path audit.

### UX Fix Wave P1 — hybrid audit (2026-09-06)

| Scenario | Manual lane | Suggestion / AI lane | Evidence | Result |
| --- | --- | --- | --- | --- |
| Empty app, no DNA or trips | Create Trip picker and Import remain available | Home Decide opens Travel Chat; Discover remains grounded | Standalone preview | Pass |
| AI disabled in Profile | Create Trip native picker, Plan, More and Packing remain available | Client request boundary rejects AI calls with explicit disabled copy | Standalone preview + client contract | Pass |
| Hosted AI cold or unavailable | Deterministic Discover and all manual trip tools remain usable | Health probe loads, then reports Ready or Unavailable; request failures do not write SQLite | Cold Render preview probe + automated failure tests | Pass; fully offline device toggle not repeated |
| Mid-trip destination with empty Plan | Manual `Add a moment` opens the complete editor | Plan Assist offers theme-only candidates; Accept is required | Standalone preview | Pass |
| Packing | Free-text add remains present | Curated starter rows require Accept | Standalone preview + persistence tests | Pass |
| Discover or direct creation | `/new-trip` accepts a real native picker result directly | Grounded Discover / Chat Confirm only prefills `/new-trip` | Standalone direct-picker preview + prior hosted preview smoke + handoff tests | Pass |
| Copilot and More | More exposes Trip Details, Travelers, Budget, Accommodation, Packing, Memories and Travel Book | Copilot proposals remain capped and confirm-gated; free-time advice is display-only | Standalone preview + copilot tests | Pass |
| Import review | Pending claims can be edited/accepted through Import Review without AI | OCR is optional extraction only and cannot accept a claim | Import review implementation + persistence tests | Pass; not repeated on this preview |
| Companion without Day→Destination | Plan/Companion offer explicit assignment by saved destination ID | No AI or coordinate inference assigns the city | Standalone preview | Pass |
| Greek and English surfaces | Mixed copy remains usable without blocking controls | Suggestion provenance/confirmation language remains visible | Standalone preview | Pass; localization unification remains later |

No new architecture or product feature was required by this audit. Play remains explicitly paused until the operator chooses to reopen Part C.

---

## Waves

### Wave U1 — First-run & one path — **done**

- [x] First-open coach: Decide then Organize (2 screens)
- [x] Empty Home: Decide + Organize primary; Discover tertiary; Import under organize
- [x] Create Trip success → `/trip/[tripId]/copilot`

### Wave U2 — Always-on Travel Intelligence — **done (hosted Android smoke 2026-09-06)**

- [x] Chat constraint chips → Discover Brief (no invented destinations)
- [x] Compare-in-thread when ≥2 grounded cards
- [x] Operator: hosted `openai_compatible` + HTTPS `EXPO_PUBLIC_TRAVELOS_AI_URL` in EAS
- [ ] Production geo/OCR through same proxy (optional Google keys on Render)
- [x] Preview APK Decide→Confirm + Organize ≥3 Accept on emulator with **hosted** AI

#### Hosted activation (Android verified; iOS parked until Mac)

- Proxy: Render Free Web Service, root `server/`, `AI_PROVIDER=openai_compatible` → OpenAI (`gpt-4o-mini` + `text-embedding-3-small`). Corpus artifact regenerated for that embedding model (`contentHash bce5bc94da21a457`).
- EAS preview: `EXPO_PUBLIC_TRAVELOS_AI_URL=https://travelos-lckj.onrender.com` (no credentials in URL).
- Preview build: `71b6c20c-d1b6-497c-bc12-5c923cf7bb48` (commit `e90014c`).
- Emulator smoke: Profile → TravelOS AI **Ready**; Travel Chat grounded Vienna card → Confirm → Create Trip → Trip Copilot; Packing Accept ×3. Free tier may cold-start ~1 min after idle.
- Local-dev can still use `AI_PROVIDER=ollama` + `adb reverse` + loopback; preview/production use the HTTPS proxy.

### Wave U3 — Guided build — **done**

- [x] Copilot Build queue ≤3 (`selectTripCopilotBuildQueue`)
- [x] Packing templates as Accept-only suggestions
- [x] `packingItems` in local export/restore contract (+ tests)

### Wave U4 — Personal memory confirm — **done**

- [x] DNA reflection: Plan Assist accepted interests; Brief/trip; Profile suggestions section
- [x] Confirm cards only — no silent DNA writes

### Wave U5 — Locale + harness — **done (script)**

- [x] Greek-first core doors (Home, Chat, Copilot, Packing, DNA intro)
- [x] `scripts/smoke-decide-organize.sh`
- [x] Docs synced (`CURRENT_STATE`, this file)

### Wave U6 — Operator release gates — **partial**

| Gate | Owner | Status |
| --- | --- | --- |
| Hosted AI endpoint + EAS URL | Operator | Done (Render + preview APK smoke) |
| Play Console AAB | Operator | Open |
| iOS / TestFlight | Operator / Mac | Parked |
| Accounts / cloud sync | Product | Parked |
| Hosted geo/OCR keys on proxy | Operator | Open (optional) |

---

## Non-goals (unchanged)

- AI-invented destinations / packing-as-truth
- Silent DNA inference
- Competing create-trip paths outside `/new-trip`

*U1–U5 + hosted Android U2 smoke are done on this branch. Remaining store/release gates live under U6.*
