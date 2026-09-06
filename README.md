# TravelOS

TravelOS is a premium native travel operating system for planning trips, acting on the right context during travel, and preserving memories afterward. This repository is the native implementation source of truth; the earlier PWA at https://travelos3.netlify.app/ is a functional and UX reference only.

## Current status

TravelOS is a mature **local-first Personal Travel OS** on Expo SDK 57 (Android development build verified). Trip core, Companion, Discover/import, Memories/World, Phase 5 polish, local export/restore, and EAS project linking are in place. Cloud sync, accounts, Play/App Store release, and iOS rebuild remain open. Authoritative detail: `docs/CURRENT_STATE.md` and `docs/ROADMAP.md`.

Verified local checks (2026-09-05): `npx tsc --noEmit`, app `npm test` (333), server `npm test` (33). EAS project: `@velegris/TravelOS`.

## Stack

- Expo SDK 57 and React Native 0.86
- TypeScript
- Expo Router
- SQLite through expo-sqlite
- Zustand for UI/session state
- react-native-maps and expo-location-picker
- Expo development builds

Before changing code or dependencies, use the exact Expo SDK 57 documentation: https://docs.expo.dev/versions/v57.0.0/.

## Local development

### Prerequisites

- Node.js 22.13 or newer for the Expo SDK 57 toolchain.
- npm.
- Android Studio, an Android SDK, and an emulator or connected device.
- JDK 17 for local Android builds.
- macOS with Xcode for local iOS builds.

This project includes native modules and is developed with a development build, not Expo Go.

### Install

    npm install

### Environment

Create an uncommitted `.env.local` from `.env.example`:

| Variable | Purpose |
| --- | --- |
| GOOGLE_MAPS_API_KEY | Google Maps / Places configuration for Android and (when rebuilt) iOS via `app.config.js` |
| EXPO_PUBLIC_TRAVELOS_AI_URL | Optional loopback AI / geo server URL. Cloud hosts are ignored. |

Do not commit, print, or share secret values. Restrict the Maps key to the APIs TravelOS uses (Maps SDK for Android, Places API New; Maps SDK for iOS when shipping iOS). Android restriction: package `com.travelos.app` plus the EAS/Play signing SHA-1. iOS restriction: bundle `com.travelos.app`. Local AI server tokens stay in `server/.env` only — never in `EXPO_PUBLIC_*`. Optional `GOOGLE_TIMEZONE_API_KEY` in `server/.env` enables picker Time Zone enrichment via `POST /geo/timezone` (restrict that key to Time Zone API only; never reuse the Maps key).

### Versioning

- User-facing version: `package.json` / `app.json` `expo.version` (currently `1.0.0`).
- Android Play monotonic build: `app.json` `expo.android.versionCode` (EAS production uses `autoIncrement: true`).
- iOS build number (when iOS is rebuilt): `app.json` `expo.ios.buildNumber`.
- Cloud EAS builds: project `@velegris/TravelOS` is linked. Use `npx eas-cli` (not `npx eas`). Set `GOOGLE_MAPS_API_KEY` as an EAS secret before cloud Android builds.

### Build and run on Android

Build and install the development client:

    npm run android

For later JavaScript-only iterations with the development client already installed:

    npm start

Then open the project from the installed TravelOS development build.

### Build and run on iOS

On macOS (Windows cannot produce an iOS binary):

    npm run ios

`ios.bundleIdentifier` is `com.travelos.app`. Maps use `PROVIDER_GOOGLE`, so enable Maps SDK for iOS and set the same `GOOGLE_MAPS_API_KEY` (EAS secret or `.env.local`) with an iOS-app restriction for that bundle. Memory camera/photo strings come from the `expo-image-picker` config plugin. TestFlight / App Store remain operator steps after a Mac/EAS iOS build.

## Validation

Run the current safe baseline checks:

    npm test
    npx tsc --noEmit
    git diff --check
    git status --short

The persistence suite compiles its targeted TypeScript modules and runs against Node's built-in in-memory SQLite implementation. Node 22.13 or newer is required. The package contains an Expo lint script, but no non-interactive lint configuration is committed yet. Do not let the lint command initialize or rewrite configuration during a verification-only task.

## Project shape

- src/app/ — Expo Router screens and layouts
- src/domain/ — canonical travel entities and repository contracts
- src/data/ — SQLite database, migrations, and repositories
- src/services/ — application orchestration
- src/store/ — Zustand UI/session state
- src/components/ and src/theme/ — shared UI and design foundations
- tests/ — automated persistence and migration coverage
- docs/ — product contract, verified state, roadmap, and web-reference guidance

## Documentation

- AGENTS.md — permanent engineering contract
- docs/PRODUCT_VISION.md — full lifecycle and product principles
- docs/CURRENT_STATE.md — verified implementation and risks
- docs/ROADMAP.md — ordered delivery sequence
- docs/WEB_REFERENCE.md — how to use the PWA reference safely

SQLite is the durable source of truth. Zustand is not a database. Preserve explicit IDs, existing user data, working functionality, and forward-only migration history.
