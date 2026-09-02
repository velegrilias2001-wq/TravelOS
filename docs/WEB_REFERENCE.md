# TravelOS Web Reference

Reference: https://travelos3.netlify.app/

Audit context: public, unauthenticated/empty-state experience observed on 2026-08-23. The visible build identified itself as v13.5.1. Data-dependent and signed-in behavior was not verified, so this document does not claim that hidden flows work.

## How to use the reference

The PWA is a product-memory and UX-idea source. It is not the implementation source of truth.

- Preserve useful product intent.
- Redesign interactions for native mobile context.
- Reconnect every adopted feature to the canonical native Trip graph.
- Do not copy browser storage, sync, import, or AI architecture.
- Do not copy desktop-responsive layouts directly.
- Do not assume a visible web control has production-ready behavior behind it.

## What the public web reference shows

### Home and Trips

- Empty-state entry points for creating a trip.
- A “help me decide” path for uncertain travelers.
- Import entry points for existing booking or itinerary material.
- Main navigation for Home, Trips, Discover, World, and Profile.
- Trips list, new-trip action, and import-material action.

### Create Trip V2

The web creation flow asks for more planning context than the current native flow:

- Origin.
- One or more destinations.
- Destination uncertainty and best-time guidance.
- Date range.
- Travel party type.
- Pace.
- Language.
- Budget and interests.
- Browser draft auto-save.
- Continuation into an “AI Architect” concept.

These fields are product hypotheses, not automatically canonical requirements. Each needs a native input model, data ownership decision, validation, and truth/provenance behavior.

### Import

The visible import surface advertises ZIP, PDF, DOCX, XLSX, CSV, TXT, Markdown, JSON, JPG, PNG, and WEBP. It states that extraction happens locally where possible and that necessary extracted content may be sent to Gemini.

This is reference copy, not a verified privacy or implementation contract. Native import must define supported formats, device/server processing, provider behavior, retention, review, conflict handling, and user consent before shipping.

### Discover

The web experience supports:

- Destination advice based on month, duration, travelers, budget, trip type, interests, and no-car preference.
- Heuristic matches described as guidance rather than live pricing.
- Destination tradeoffs and wishlist actions.
- Best-season guidance for a known destination.
- Curated starting points.

The visible disclosure that suggestions are heuristic is worth preserving. Recommendations must remain outside canonical trip data until explicitly accepted.

### World

The web World concept includes:

- Trip, country, and travel-day statistics.
- Visited, upcoming, and wishlist filters.
- An interactive world map.
- Travel archive and footprint statistics.
- Adding a place to a wishlist.

Native implementation should derive these states from explicit place and trip relationships. It must not infer visited history from a destination title.

### Profile

The public reference shows:

- A Vault code concept for sharing trips across devices.
- PWA installation.
- Local-vault and browser-AI diagnostics.

These are web-era solutions. Native accounts, sync, diagnostics, privacy, and recovery need a new architecture.

## Preserve, redesign, or avoid

| Reference idea | Disposition | Native direction |
| --- | --- | --- |
| Full lifecycle navigation | Preserve | Home, Trips, Discover, World, and Profile remain the native areas. Home is what matters now; Trips are owned trips; Discover is what could be next; World is the travel story |
| Create / decide / import entry points | Preserve | Native Create Trip is `/new-trip`. Discover may prefill it. Import Review Queue V1 pastes, chooses, extracts iCalendar from an email, or unpacks a zip of calendars into a claim queue; bookings are written only after explicit accept |
| Rich trip-creation questions | Redesign | Native Create Trip persists destination, dates, accounting currency, and optional intent/pace; extra web fields stay hypotheses |
| Destination advisor and season guidance | Redesign | Native Discover now includes Start with a place, Find me somewhere, Best time, and Ready-made journeys against the grounded catalogue. Journeys are ideas until Create Trip confirmation; extra cities are not written as destinations yet |
| Import breadth | Redesign | Start with a supportable subset and a mandatory review queue |
| Wishlist | Preserve | Native Wishlist V1 persists grounded Discover destination and journey identities in SQLite. They are not Trips and are not World visited history |
| World and travel archive | Preserve / reinterpret | Native World V1 maps persisted trip destinations with real coordinates and durable trip-status filters. It does not yet model visited/lived/wishlist history |
| Editorial visual tone | Preserve | Translate to native typography, imagery, motion, gestures, and platform conventions |
| Desktop grids and browser forms | Do not copy | Design phone-first flows, sheets, pickers, gestures, and focused steps |
| Browser local-vault architecture | Do not copy | Design native local-first storage, accounts, backup, and sync around canonical IDs |
| Gemini-specific import/AI coupling | Do not copy | Select providers only after privacy, quality, cost, and provenance decisions |
| Heuristic or AI output as trip truth | Never copy | Require explicit review and user confirmation |

## Where the web is broader

The public PWA expresses more of the before-travel product:

- Destination decision support.
- Richer trip setup.
- File import.
- Discovery and seasonality.
- Wishlist.
- World and travel archive.
- Cross-device vault concept.

Native Discover, World, and Profile are no longer empty placeholders. Native Discover now includes Best time, Ready-made journeys, and Saved ideas over grounded catalogue destinations. Native import now has an iCalendar review queue with paste, a local file picker, email-wrapped calendar extraction, and zip-of-calendars extraction; the PWA still advertises a broader file-format set and Gemini extraction that native V1 does not copy.

## Where native is already stronger

The native repository has a more credible foundation for:

- One typed canonical Trip and related domain entities.
- Explicit ID relationships.
- SQLite persistence and forward migrations.
- Repository and service boundaries.
- Real itinerary, booking, accommodation, budget, traveler, memory, and travel-book CRUD.
- Truth-aware trip timing and a deterministic Companion.
- Native map rendering and real location selection.
- Persisted coordinates rather than decorative map content.
- Explicit Travel DNA and a Discover Brief that is not a Trip.
- Grounded curated Discover matching with confirmation through `/new-trip`.
- A path to offline-first behavior.

The native app should keep these strengths while selectively adopting the web product ideas.

## Native interpretation principles

- Use phone context: the next action matters more than exposing every option at once.
- Use platform controls for dates, times, maps, sheets, menus, share, files, and permissions.
- Use progressive disclosure for complex creation and import flows.
- Preserve editorial calm without sacrificing accessibility or information density.
- Make empty states useful, but never fill them with fabricated sample user data by default.
- Show provenance and confirmation for imports, recommendations, and AI output.
- Design Companion independently from pre-trip planning screens; it has different urgency and interaction needs.
- Derive World and Travel Book from confirmed history rather than duplicating data.
- Do not copy Gemini-coupled discovery. Native AI may explain or advise on grounded candidates only; it is not a destination source.

## Open verification items

- Active-trip and Companion behavior in the web product.
- Real import extraction, privacy, error, and review behavior.
- Sync and Vault implementation.
- AI provider behavior, prompts, retention, and safeguards.
- Data model behind wishlist, World, and travel statistics.
- Accessibility, offline behavior, and mobile-browser edge cases.

Until verified, these remain references or open questions rather than requirements.
