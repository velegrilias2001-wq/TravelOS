# TravelOS → 10/10 Design Track

Status: **U1–U5 implemented in code (this branch)** — U6 operator gates remain open  
Baseline after T0–T4: Completeness 8 · Functional 8.5 · Beat PWA 7.5 · Usable 7.5 · Useful 7.5  
After U1–U5 (code + Node tests; device smoke script committed, not yet re-run on emulator this pass): target Android product 10/10 pending hosted AI (U2 operator) + checklist pass.

Hard rules stay in force (`AGENTS.md`, `PRODUCT_VISION.md`): AI is not a destination source; no silent SQLite; DNA is explicit and confirm-gated; `/new-trip` creates trips.

---

## Waves

### Wave U1 — First-run & one path — **done**

- [x] First-open coach: Decide then Organize (2 screens)
- [x] Empty Home: Decide + Organize primary; Discover tertiary; Import under organize
- [x] Create Trip success → `/trip/[tripId]/copilot`

### Wave U2 — Always-on Travel Intelligence — **agent done / operator pending**

- [x] Chat constraint chips → Discover Brief (no invented destinations)
- [x] Compare-in-thread when ≥2 grounded cards
- [ ] Operator: hosted `openai_compatible` + HTTPS `EXPO_PUBLIC_TRAVELOS_AI_URL` in EAS
- [ ] Production geo/OCR through same proxy
- [ ] Preview APK Decide→Confirm + Organize ≥3 Accept on device/emulator with **hosted** AI

#### Operator activation (Android first; iOS parked until Mac)

Client already accepts HTTPS TravelOS AI proxy URLs (`resolveTravelOsAiBaseUrl`). Keys stay on `server/` only.

1. Deploy `server/` behind HTTPS (Fly / Railway / Render / your VPS). Do not expose Ollama publicly without auth.
2. On that host `server/.env`:
   - `AI_PROVIDER=openai_compatible`
   - `AI_BASE_URL=https://…/v1` (HF Inference Endpoint or OpenAI-compatible)
   - `AI_API_KEY=` / `HF_TOKEN=` (server only)
   - `AI_CHAT_MODEL=` / `AI_EMBEDDING_MODEL=`
   - `AI_ENABLED=true`
   - Optional: `GOOGLE_TIMEZONE_API_KEY`, `GOOGLE_DIRECTIONS_API_KEY`, `GOOGLE_VISION_API_KEY` for geo/OCR
3. EAS Preview env (Expo dashboard or `npx eas-cli env:create`):
   - `EXPO_PUBLIC_TRAVELOS_AI_URL=https://YOUR_PROXY` (no credentials in URL)
4. Build: `npx eas-cli build --platform android --profile preview`
5. Smoke: Profile → TravelOS AI shows Ready; Chat Confirm → Create Trip; Copilot ≥3 Accept greens.
6. Until hosted is live, local-dev remains `AI_PROVIDER=ollama` + `adb reverse tcp:8789` + loopback URL.

Reply with the HTTPS proxy URL when ready (never paste API keys into chat).

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

### Wave U6 — Operator release gates — **open**

| Gate | Owner |
| --- | --- |
| Hosted AI endpoint + EAS URL | Operator |
| Play Console AAB | Operator |
| iOS / TestFlight | Operator / Mac |
| Accounts / cloud sync | Product (parked) |

---

## Non-goals (unchanged)

- AI-invented destinations / packing-as-truth
- Silent DNA inference
- Competing create-trip paths outside `/new-trip`

*U1–U5 exit is code-complete on this branch. Declare Android 10/10 only after hosted AI live (U2 operator) + smoke checklist pass.*
