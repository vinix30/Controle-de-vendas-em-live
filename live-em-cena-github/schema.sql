PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS presenters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  room_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  currents_json TEXT NOT NULL DEFAULT '{}',
  switches INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  presenter_id TEXT NOT NULL,
  presenter_name TEXT NOT NULL,
  room_id TEXT NOT NULL,
  value REAL NOT NULL CHECK (value > 0),
  sold_at TEXT NOT NULL,
  legacy INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS sales_sold_at_idx ON sales(sold_at);
CREATE INDEX IF NOT EXISTS sales_room_idx ON sales(room_id, sold_at);
CREATE INDEX IF NOT EXISTS sales_presenter_idx ON sales(presenter_id, sold_at);

INSERT OR IGNORE INTO rooms (id, name) VALUES
  ('room1', 'Sala 1'),
  ('room2', 'Sala 2'),
  ('room3', 'Sala 3'),
  ('room4', 'Sala 4'),
  ('room5', 'Sala 5');

INSERT OR IGNORE INTO app_state (id, currents_json, switches) VALUES (1, '{}', 0);
