-- 55 — Persönliche Demo-Zugänge für Interessenten (lib/demo-zugang.js, Vertrieb-Seite).
-- Jeder Zugang hat einen eigenen Code (clickzauber.de/demo?z=CODE), gilt 7 Tage und lässt sich sperren oder löschen.
-- demo_ereignisse hält fest, was im Demo-Cockpit angeklickt wurde (nie, was eingetippt wurde).
-- users.pilot_extra: Pilotplatz von Hand über einen Demo-Zugang vergeben, zählt nicht zu den automatischen Plätzen.
-- Nur der Server liest und schreibt (Service-Schlüssel). api/nacht.js löscht Zugänge 30 Tage nach Ablauf, die Klicks gleich mit (seit 07.10.2026, nichts neu auszuführen).

create table if not exists demo_zugaenge (
  code text primary key,
  betrieb text not null,
  branche text,
  telefon text,
  notiz text,
  erstellt_am timestamptz not null default now(),
  laeuft_ab timestamptz not null,
  gesperrt_am timestamptz,
  erstmals_am timestamptz,
  zuletzt_am timestamptz,
  aufrufe int not null default 0,
  klicks int not null default 0,
  hinweise jsonb not null default '[]'::jsonb,
  feedback jsonb,
  vorablauf_mail_am timestamptz,
  pilot_email text,
  pilot_am timestamptz,
  gast_vorname text,
  gast_nachname text,
  gast_telefon text,
  gast_am timestamptz
);
-- Falls die Tabelle schon ohne die Gast-Felder angelegt wurde:
alter table demo_zugaenge add column if not exists gast_vorname text;
alter table demo_zugaenge add column if not exists gast_nachname text;
alter table demo_zugaenge add column if not exists gast_telefon text;
alter table demo_zugaenge add column if not exists gast_am timestamptz;
-- Kontrolle (03.10.2026): Geräte, Vertraulichkeit, Push bei Aktivität, Erinnerung Tag 3, Fragen an Manuel
alter table demo_zugaenge add column if not exists geraete jsonb not null default '[]'::jsonb;
alter table demo_zugaenge add column if not exists vertraulich_am timestamptz;
alter table demo_zugaenge add column if not exists aktiv_push_am timestamptz;
alter table demo_zugaenge add column if not exists tag3_am timestamptz;
alter table demo_zugaenge add column if not exists fragen jsonb not null default '[]'::jsonb;

create table if not exists demo_ereignisse (
  id bigserial primary key,
  code text not null references demo_zugaenge(code) on delete cascade,
  sitzung text,
  ts timestamptz not null default now(),
  art text not null,
  was text,
  seite text
);
create index if not exists demo_ereignisse_code_ts on demo_ereignisse (code, ts);

alter table demo_zugaenge enable row level security;
alter table demo_ereignisse enable row level security;

alter table users add column if not exists pilot_extra boolean not null default false;
