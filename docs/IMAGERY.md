# TravelOS Imagery Strategy (Phase 5 V1)

Local-media-only contract. No remote stock CDN and no AI-invented photos.

## Sources

- Traveler photos: owned copies under `travelos/memories/` via the Memory media contract. Gallery originals are never deleted.
- World / Travel Book covers: only when a Memory photo URI exists and is linked by explicit IDs.
- Discover catalogue: text, icons, and provenance citations only. No destination photography in V1.

## Licensing and attribution

- User-owned media: licensing is the traveler’s. TravelOS stores a local copy.
- Catalogue facts may cite sources; those citations are not image attributions.
- App icons / splash in `app.json` remain Expo placeholders until branded assets exist.

## Caching and performance

- Durable cache is the filesystem copy, not a second image database.
- Prefer `expo-image` / `LocalImage` for local URIs with `contentFit: 'cover'`.
- Missing URI → empty placeholder. Never invent a remote URL or coordinate.

## Fallbacks

- Photo memories without `mediaUri` show an icon panel.
- World lived cards without a photo cover stay text-led.
- Offline: local copies remain readable; live map tiles may still need a network.
