export const DATABASE_NAME = 'travelos.db';

export const DATABASE_SCHEMA = `

PRAGMA journal_mode = WAL;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trips (

  id TEXT PRIMARY KEY NOT NULL,

  title TEXT NOT NULL,

  status TEXT NOT NULL,

  intent TEXT

    CHECK (

      intent IS NULL OR

      intent IN (

        'relax',

        'explore',

        'food',

        'nature',

        'event',

        'social',

        'romantic',

        'family',

        'work_leisure',

        'other'

      )

    ),

  pace TEXT

    CHECK (

      pace IS NULL OR

      pace IN ('slow', 'balanced', 'full')

    ),

  start_date TEXT NOT NULL,

  end_date TEXT NOT NULL,

  accounting_currency TEXT NOT NULL,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS trip_destinations (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  name TEXT NOT NULL,

  country_code TEXT,

  latitude REAL,

  longitude REAL,

  timezone TEXT,

  timezone_source TEXT

    CHECK (

      timezone_source IS NULL OR

      timezone_source IN (

        'provider',

        'catalogue',

        'traveler'

      )

    ),

  currency_code TEXT,

  place_id TEXT,

  position INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE

);

CREATE TABLE IF NOT EXISTS trip_days (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  date TEXT NOT NULL,

  day_number INTEGER NOT NULL,

  title TEXT,

  notes TEXT,

  destination_id TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (destination_id)

    REFERENCES trip_destinations(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS trip_stops (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  day_id TEXT NOT NULL,

  title TEXT NOT NULL,

  type TEXT NOT NULL,

  position INTEGER NOT NULL,

  location_name TEXT,

  address TEXT,

  latitude REAL,

  longitude REAL,

  place_id TEXT,

  start_time TEXT,

  end_time TEXT,

  notes TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (day_id)

    REFERENCES trip_days(id)

    ON DELETE CASCADE

);

CREATE TABLE IF NOT EXISTS travelers (

  id TEXT PRIMARY KEY NOT NULL,

  first_name TEXT NOT NULL,

  last_name TEXT,

  type TEXT NOT NULL,

  email TEXT,

  phone TEXT,

  avatar_uri TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS trip_travelers (

  trip_id TEXT NOT NULL,

  traveler_id TEXT NOT NULL,

  role TEXT NOT NULL DEFAULT 'member'

    CHECK (

      role IN ('owner', 'member')

    ),

  PRIMARY KEY (trip_id, traveler_id),

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (traveler_id)

    REFERENCES travelers(id)

    ON DELETE CASCADE

);

CREATE UNIQUE INDEX IF NOT EXISTS trip_travelers_one_owner

  ON trip_travelers(trip_id)

  WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS travel_dna (

  singleton_key INTEGER PRIMARY KEY NOT NULL

    CHECK (singleton_key = 1),

  id TEXT NOT NULL UNIQUE,

  pace TEXT

    CHECK (

      pace IS NULL OR

      pace IN ('slow', 'balanced', 'full')

    ),

  interests_json TEXT NOT NULL DEFAULT '[]',

  travel_style TEXT

    CHECK (

      travel_style IS NULL OR

      travel_style IN ('local', 'iconic', 'mix')

    ),

  budget_style TEXT

    CHECK (

      budget_style IS NULL OR

      budget_style IN ('value', 'comfortable', 'premium')

    ),

  daily_rhythm TEXT

    CHECK (

      daily_rhythm IS NULL OR

      daily_rhythm IN ('morning', 'flexible', 'night')

    ),

  typical_party TEXT

    CHECK (

      typical_party IS NULL OR

      typical_party IN ('solo', 'couple', 'friends', 'family')

    ),

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS bookings (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  stop_id TEXT,

  type TEXT NOT NULL,

  status TEXT NOT NULL,

  title TEXT NOT NULL,

  provider TEXT,

  confirmation_code TEXT,

  start_at TEXT,

  end_at TEXT,

  amount REAL,

  currency_code TEXT,

  is_paid INTEGER,

  notes TEXT,

  external_url TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (stop_id)

    REFERENCES trip_stops(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS accommodations (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  stop_id TEXT,

  booking_id TEXT,

  name TEXT NOT NULL,

  type TEXT NOT NULL,

  address TEXT,

  latitude REAL,

  longitude REAL,

  check_in_at TEXT,

  check_out_at TEXT,

  phone TEXT,

  website TEXT,

  notes TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (stop_id)

    REFERENCES trip_stops(id)

    ON DELETE SET NULL,

  FOREIGN KEY (booking_id)

    REFERENCES bookings(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS budgets (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL UNIQUE,

  currency_code TEXT NOT NULL,

  planned_amount REAL,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE

);

CREATE TABLE IF NOT EXISTS trip_fx_rates (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  from_currency TEXT NOT NULL,

  to_currency TEXT NOT NULL,

  rate REAL NOT NULL

    CHECK (rate > 0),

  as_of TEXT NOT NULL,

  source TEXT NOT NULL

    CHECK (source IN ('traveler')),

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  UNIQUE (trip_id, from_currency, to_currency)

);

CREATE TABLE IF NOT EXISTS budget_items (

  id TEXT PRIMARY KEY NOT NULL,

  budget_id TEXT NOT NULL,

  trip_id TEXT NOT NULL,

  booking_id TEXT,

  stop_id TEXT,

  title TEXT NOT NULL,

  category TEXT NOT NULL,

  status TEXT NOT NULL,

  amount REAL NOT NULL,

  currency_code TEXT NOT NULL,

  notes TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (budget_id)

    REFERENCES budgets(id)

    ON DELETE CASCADE,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (booking_id)

    REFERENCES bookings(id)

    ON DELETE SET NULL,

  FOREIGN KEY (stop_id)

    REFERENCES trip_stops(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS trip_runtime_states (

  trip_id TEXT PRIMARY KEY NOT NULL,

  phase TEXT NOT NULL,

  current_day_id TEXT,

  current_stop_id TEXT,

  last_activity_at TEXT,

  is_companion_active INTEGER NOT NULL DEFAULT 0,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (current_day_id)

    REFERENCES trip_days(id)

    ON DELETE SET NULL,

  FOREIGN KEY (current_stop_id)

    REFERENCES trip_stops(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS memories (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL,

  day_id TEXT,

  stop_id TEXT,

  type TEXT NOT NULL,

  title TEXT,

  caption TEXT,

  media_uri TEXT,

  captured_at TEXT NOT NULL,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE,

  FOREIGN KEY (day_id)

    REFERENCES trip_days(id)

    ON DELETE SET NULL,

  FOREIGN KEY (stop_id)

    REFERENCES trip_stops(id)

    ON DELETE SET NULL

);

CREATE TABLE IF NOT EXISTS travel_books (

  id TEXT PRIMARY KEY NOT NULL,

  trip_id TEXT NOT NULL UNIQUE,

  title TEXT NOT NULL,

  cover_image_uri TEXT,

  summary TEXT,

  is_published INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (trip_id)

    REFERENCES trips(id)

    ON DELETE CASCADE

);

CREATE TABLE IF NOT EXISTS travel_book_memories (

  travel_book_id TEXT NOT NULL,

  memory_id TEXT NOT NULL,

  position INTEGER NOT NULL,

  PRIMARY KEY (travel_book_id, memory_id),

  FOREIGN KEY (travel_book_id)

    REFERENCES travel_books(id)

    ON DELETE CASCADE,

  FOREIGN KEY (memory_id)

    REFERENCES memories(id)

    ON DELETE CASCADE

);

CREATE TABLE IF NOT EXISTS saved_places (

  id TEXT PRIMARY KEY NOT NULL,

  kind TEXT NOT NULL

    CHECK (

      kind IN ('destination', 'journey')

    ),

  grounded_identity TEXT NOT NULL UNIQUE,

  source TEXT NOT NULL

    CHECK (

      source IN ('curated', 'provider')

    ),

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL

);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id

ON trip_days(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_days_destination_id

ON trip_days(destination_id);

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id

ON trip_stops(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_stops_day_id

ON trip_stops(day_id);

CREATE INDEX IF NOT EXISTS idx_bookings_trip_id

ON bookings(trip_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_trip_id

ON budget_items(trip_id);

CREATE INDEX IF NOT EXISTS idx_memories_trip_id

ON memories(trip_id);

CREATE INDEX IF NOT EXISTS idx_memories_day_id

ON memories(day_id);

CREATE INDEX IF NOT EXISTS idx_memories_stop_id

ON memories(stop_id);

CREATE INDEX IF NOT EXISTS idx_trip_runtime_states_current_day_id

ON trip_runtime_states(current_day_id);

CREATE INDEX IF NOT EXISTS idx_trip_runtime_states_current_stop_id

ON trip_runtime_states(current_stop_id);

CREATE TABLE IF NOT EXISTS import_batches (

  id TEXT PRIMARY KEY NOT NULL,

  source_kind TEXT NOT NULL

    CHECK (

      source_kind IN ('ics')

    ),

  source_label TEXT NOT NULL,

  content_hash TEXT NOT NULL UNIQUE,

  skipped_count INTEGER NOT NULL,

  created_at TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS import_claims (

  id TEXT PRIMARY KEY NOT NULL,

  batch_id TEXT NOT NULL,

  kind TEXT NOT NULL

    CHECK (

      kind IN ('booking')

    ),

  status TEXT NOT NULL

    CHECK (

      status IN ('pending', 'accepted', 'dismissed')

    ),

  title TEXT NOT NULL,

  start_at TEXT,

  end_at TEXT,

  location_text TEXT,

  ics_uid TEXT,

  confidence TEXT NOT NULL

    CHECK (

      confidence IN ('high', 'medium', 'low')

    ),

  evidence_json TEXT NOT NULL,

  accepted_trip_id TEXT,

  accepted_booking_id TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (batch_id)

    REFERENCES import_batches(id)

    ON DELETE CASCADE,

  FOREIGN KEY (accepted_trip_id)

    REFERENCES trips(id)

    ON DELETE SET NULL,

  FOREIGN KEY (accepted_booking_id)

    REFERENCES bookings(id)

    ON DELETE SET NULL

);

CREATE INDEX IF NOT EXISTS idx_saved_places_created_at

ON saved_places(created_at);

CREATE INDEX IF NOT EXISTS idx_import_claims_batch_id

ON import_claims(batch_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_created_at

ON import_batches(created_at);

`;
