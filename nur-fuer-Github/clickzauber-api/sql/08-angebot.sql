-- 08 — Angebot, Status und Verlauf je Anfrage.
-- In Supabase → SQL Editor ausführen. Idempotent.

-- Einzelposten aus dem Widget, damit das Angebot dieselben Zahlen zeigt wie der Richtwert.
alter table if exists leads add column if not exists posten jsonb;
-- Bearbeitungsstand: neu | angerufen | angebot | gebucht | verloren
alter table if exists leads add column if not exists status text default 'neu';
alter table if exists leads add column if not exists status_am timestamptz;
-- Angebot
alter table if exists leads add column if not exists angebot_nr text;
alter table if exists leads add column if not exists angebot_am timestamptz;
alter table if exists leads add column if not exists angebot_summe numeric;
-- Verlauf: Notizen, gesendete Nachrichten, Statuswechsel — als Liste
alter table if exists leads add column if not exists verlauf jsonb default '[]'::jsonb;

-- Laufende Angebotsnummer je Betrieb.
create table if not exists angebot_zaehler (
  tenant_id  uuid primary key references tenants(id) on delete cascade,
  stand      integer not null default 0
);
alter table angebot_zaehler enable row level security;

create index if not exists leads_status_idx on leads (tenant_id, status, ts desc);
