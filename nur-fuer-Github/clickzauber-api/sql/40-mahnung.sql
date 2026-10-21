-- Automatische Mahnung und Sperre bei offener Zahlung (lib/mahnung.js).
alter table users add column if not exists zahlung_offen_seit timestamptz;
alter table users add column if not exists mahnung_stufe integer not null default 0;
create index if not exists protokoll_zeit_idx on protokoll (created_at desc);
