#!/usr/bin/env bash
# TravelOS U5 smoke — Decide + Organize happy paths (Android emulator).
# Prerequisites: Metro + development client running; adb device online.
# Usage: bash scripts/smoke-decide-organize.sh
set -euo pipefail

ADB="${ADB:-adb}"
PACKAGE="${PACKAGE:-com.travelos.app}"

echo "== TravelOS smoke: device =="
"$ADB" devices

echo "== Launch app =="
"$ADB" shell am start -n "$PACKAGE/.MainActivity" >/dev/null || \
  "$ADB" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1

echo "== Deep link: Travel Chat (Decide) =="
"$ADB" shell am start -a android.intent.action.VIEW \
  -d "travelos://travel-chat" "$PACKAGE" >/dev/null 2>&1 || true

echo "== Deep link: Create Trip (Organize) =="
"$ADB" shell am start -a android.intent.action.VIEW \
  -d "travelos://new-trip" "$PACKAGE" >/dev/null 2>&1 || true

echo "== Checklist (manual confirm in emulator UI) =="
cat <<'EOF'
[ ] Home first-run coach (cold) shows Decide then Organize, then dismisses
[ ] Empty Home: Decide + Organize primary; Discover tertiary
[ ] Travel Chat: constraint chips update Brief; Confirm opens /new-trip
[ ] Create Trip save opens Trip Copilot (not Companion index)
[ ] Copilot Build shows ≤3 next Accept cards; packing starter Accept works
[ ] Packing templates Accept-only; Profile Travel DNA shows suggestions when Brief/trip set
[ ] Export JSON includes packingItems; restore restores them
[ ] Profile → TravelOS AI shows Ready or calm degrade (hosted or loopback)
EOF

echo "Smoke script finished (deep links attempted; checklist is manual)."
