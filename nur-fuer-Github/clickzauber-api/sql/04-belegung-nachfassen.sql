-- 04 — Nachrüstung für Datenbanken, die vor 01-schema.sql angelegt wurden.
-- Bei einer neuen Datenbank genügen 01, 02 und 03; diese Datei ist dann wirkungslos.

alter table if exists widgets add column if not exists belegung jsonb default '{}'::jsonb;
alter table if exists widgets add column if not exists updated_at timestamptz default now();
alter table if exists leads   add column if not exists termin date;
alter table if exists leads   add column if not exists nachgefasst_at timestamptz;
alter table if exists leads   add column if not exists answers jsonb;
alter table if exists leads   add column if not exists value_est numeric;
alter table if exists tenants add column if not exists email text;

create index if not exists leads_offen_idx on leads (ts) where nachgefasst_at is null;
