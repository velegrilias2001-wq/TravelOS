# TravelOS

TravelOS is a premium native travel operating system for planning trips, acting on the right context during travel, and preserving memories afterward. This repository is the native implementation source of truth; the earlier PWA at https://travelos3.netlify.app/ is a functional and UX reference only.

## Current status

The app is a working native foundation and vertical prototype. It currently includes:

- Home, Trips, and persisted trip creation.
- Trip Space with Today, Plan, Map, Bookings, and a placeholder More tab.
- SQLite-backed trips, self-healing automatic days, atomic itinerary-stop reorder, bookings, and payment status.
- Truth-aware upcoming/active/completed Today behavior.
- Android Google Maps, native location selection, persisted coordinates, and stop pins.
- Domain, repository, service, and Zustand UI/session layers.

Discover, World, Profile, budget, accommodation UI, travelers, full Companion, Memories, Travel Book, sync, broad test coverage, and release infrastructure are not complete. See docs/CURRENT_STATE.md for the verified implementation snapshot.

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

Create an uncommitted .env.local file containing the required variable:

| Variable | Purpose |
| --- | --- |
| GOOGLE_MAPS_API_KEY | Android Google Maps and native place-search configuration |

Do not commit, print, or share the value. app.config.js requires the variable while resolving native configuration. The Google Cloud project must enable the services used by the app, currently Maps SDK for Android and Places API (New), and the key should be appropriately restricted.

### Build and run on Android

Build and install the development client:

    npm run android

For later JavaScript-only iterations with the development client already installed:

    npm start

Then open the project from the installed TravelOS development build.

### Build and run on iOS

On macOS:

    npm run ios

iOS maps, bundle configuration, permissions, and release behavior are not yet considered production-ready. Treat iOS work as an explicit platform-hardening task.

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
