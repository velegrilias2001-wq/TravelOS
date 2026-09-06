# TravelOS → 10/10 Design Track

Status: **U1–U5 + U2 hosted Android smoke done (this branch)** — remaining U6: Play AAB, iOS, geo/OCR keys, accounts  
Baseline after T0–T4: Completeness 8 · Functional 8.5 · Beat PWA 7.5 · Usable 7.5 · Useful 7.5  
After U1–U5 + hosted Render/`openai_compatible` preview APK smoke (2026-09-06): Android Travel Intelligence path is live; declare store 10/10 only after Play + remaining U6.

Hard rules stay in force (`AGENTS.md`, `PRODUCT_VISION.md`): AI is not a destination source; no silent SQLite; DNA is explicit and confirm-gated; `/new-trip` creates trips.

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
