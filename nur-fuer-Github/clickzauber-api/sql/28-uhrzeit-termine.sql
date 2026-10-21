-- 28: Uhrzeit-Termine (Friseure, Kosmetik, Beratung)
-- Mitarbeiter mit Arbeitszeiten, Leistungen mit Dauer, reservierte Termine.
-- Die Datenbank selbst verhindert Doppelbuchungen: zwei aktive Termine
-- desselben Mitarbeiters dürfen sich zeitlich nicht überschneiden.

create extension if not exists btree_gist;

-- Wer bedient (nicht zu verwechseln mit "team" = Cockpit-Zugänge)
create table if not exists personal (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  aktiv        boolean not null default true,
  reihenfolge  integer not null default 0,
  -- {"1":[["09:00","18:00"]], ... } — Schlüssel 0 = Sonntag bis 6 = Samstag
  zeiten       jsonb not null default '{"1":[["09:00","18:00"]],"2":[["09:00","18:00"]],"3":[["09:00","18:00"]],"4":[["09:00","18:00"]],"5":[["09:00","18:00"]],"6":[["09:00","14:00"]]}',
  created_at   timestamptz not null default now()
);
create index if not exists personal_tenant_idx on personal (tenant_id, reihenfolge);
alter table personal enable row level security;

-- Leistungen und Regeln je Betrieb
create table if not exists termin_setup (
  tenant_id    uuid primary key references tenants(id) on delete cascade,
  leistungen   jsonb not null default '[{"name":"Herrenschnitt","dauer":30},{"name":"Damenschnitt","dauer":60},{"name":"Färben","dauer":90}]',
  raster       integer not null default 15,
  vorlauf_std  integer not null default 2,
  tage         integer not null default 42,
  updated_at   timestamptz not null default now()
);
alter table termin_setup enable row level security;

create table if not exists termine (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  widget_id      text,
  lead_id        uuid references leads(id) on delete set null,
  gruppe         uuid,
  person_nr      integer not null default 1,
  personal_id    uuid references personal(id) on delete set null,
  personal_name  text,
  start          timestamptz not null,
  ende           timestamptz not null,
  leistung       text,
  dauer          integer not null,
  -- wunsch = vom Gast reserviert, wartet auf Bestätigung · fest = bestätigt
  -- abgelehnt / abgesagt = Zeit ist wieder frei
  status         text not null default 'wunsch' check (status in ('wunsch','fest','abgelehnt','abgesagt')),
  name           text,
  telefon        text,
  email          text,
  nachricht      text,
  eigen          boolean not null default false,
  created_at     timestamptz not null default now(),
  status_am      timestamptz,
  check (ende > start)
);
create index if not exists termine_tenant_zeit_idx on termine (tenant_id, start);
create index if not exists termine_gruppe_idx on termine (gruppe);
alter table termine enable row level security;

-- Die eigentliche Sperre gegen Doppelbuchung
do $$ begin
  alter table termine add constraint termine_keine_ueberschneidung
    exclude using gist (personal_id with =, tstzrange(start, ende, '[)') with &&)
    where (status in ('wunsch','fest') and personal_id is not null);
exception when duplicate_object then null; end $$;
