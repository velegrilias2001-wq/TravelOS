# TravelOS Product Vision

## Product promise

TravelOS is a premium native travel operating system that helps a traveler decide, organize, experience, and remember a trip. It should provide one calm, trustworthy place for the entire journey rather than a collection of disconnected itinerary, booking, map, budget, and memory features.

The canonical Trip is the spine of the product. Every day, stop, booking, accommodation, budget item, traveler, runtime signal, memory, and Travel Book artifact belongs to the same explicit trip truth.

## The complete travel lifecycle

### Before travel: decide, plan, and organize

TravelOS should help a traveler move from uncertainty to a viable plan:

- Discover destinations and compare their tradeoffs.
- Decide where and when to travel using preferences, constraints, seasonality, duration, party, pace, and budget.
- Save places and ideas without presenting them as confirmed itinerary facts.
- Import existing booking and trip material with visible provenance and a review step.
- Create and edit the canonical Trip, destinations, dates, travelers, and accounting currency.
- Build a day-by-day itinerary from explicit TripDays and TripStops.
- Connect bookings and accommodations to the relevant itinerary stops by ID.
- Track a trip budget, expenses, payment state, and local versus accounting currencies.
- Surface missing information, conflicts, and readiness without fabricating details.

### During travel: Companion

TravelOS should become a context-aware trip companion:

- Show the correct current trip and current day based on confirmed dates and trip timezone.
- Distinguish upcoming, active, and completed trips and the phases within a travel day.
- Surface the next relevant stop, booking, accommodation, and action.
- Make maps, directions, reservation details, addresses, contact actions, and timing easy to reach.
- Adapt to changes while preserving the difference between the plan and what actually happened.
- Remain useful offline for essential trip data and actions.
- Communicate uncertainty and missing data honestly.

### After travel: memory and Travel Book

TravelOS should turn completed travel into a durable personal archive:

- Capture memories and associate them with the correct trip, day, stop, and place.
- Track lived and visited places separately from wishlisted or merely recommended places.
- Build a World view from confirmed travel history.
- Create a Travel Book that combines itinerary truth, lived places, memories, and user-selected media.
- Keep past trips useful and editable without rewriting what actually happened.

## Product pillars

### One trip truth

All product surfaces read and write the same canonical Trip graph. A booking card, itinerary stop, map marker, budget entry, Companion action, and memory must never become isolated copies of the same fact.

### Truth with provenance

TravelOS distinguishes four classes of information:

| Class | Meaning | May become canonical automatically? |
| --- | --- | --- |
| Confirmed user fact | Entered or explicitly confirmed by the user | Yes |
| Imported claim | Extracted from a file, message, or external source | No; review is required |
| Recommendation | A candidate place, time, route, or destination | No |
| AI suggestion | Generated assistance or interpretation | No |

Suggestions and imported claims must retain their source, confidence where meaningful, and confirmation state. They must never silently overwrite canonical data.

### Context, not clutter

The product should present the right information for the travel phase and current context. Before travel favors readiness and planning; during travel favors the next useful action; after travel favors memory and reflection.

### Native confidence

Core interactions should feel designed for iOS and Android: direct manipulation, responsive gestures, considerate motion, haptics where useful, platform-aware maps and pickers, accessibility, and resilient offline behavior.

### User ownership

The traveler owns their history and private trip data. Local-first durability, clear backup/export, eventual sync, and privacy-aware intelligence are product requirements rather than implementation details.

## Experience direction

TravelOS should feel:

- Premium, editorial, calm, and highly legible.
- Rich in purposeful imagery without allowing imagery to overpower travel truth.
- Polished through typography, spacing, motion, gestures, haptics, and microinteractions.
- Confidently native rather than a desktop webpage compressed onto a phone.
- Specific to the traveler's context rather than generic or mechanically generated.

The visual system may draw inspiration from premium travel publishing and the product clarity of strong travel tools, but it must build its own identity.

## Competitive references

- Wanderlog is the primary product inspiration for connected itinerary planning, maps, collaboration, and trip organization.
- TripIt is a secondary reference for booking organization and travel readiness.
- Been is a secondary reference for lived-place history and a personal world view.
- The TravelOS web/PWA is an internal product and UX reference for earlier flows, not an architecture or visual template.

No reference should be visually cloned. Each idea must be evaluated against TravelOS truth, native interaction, privacy, and lifecycle principles.

## Product boundaries

TravelOS is not:

- A thin itinerary list.
- A WebView version of the PWA.
- A recommendation engine that presents guesses as reservations or facts.
- A second database in Zustand.
- A booking marketplace unless that becomes an explicit future product decision.
- A social network by default.

## Open product decisions

The following remain decisions rather than established facts:

- Collaboration and shared-trip permission model.
- Account, subscription, and monetization model.
- Cloud sync provider and conflict-resolution behavior.
- Supported import sources and on-device versus server-side extraction.
- AI provider, privacy boundaries, retention, and user controls.
- Media ownership, backup policy, and Travel Book export formats.
- Exact distinction between visited, lived, transited, and wishlisted places.
