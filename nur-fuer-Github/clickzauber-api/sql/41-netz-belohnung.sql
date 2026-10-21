-- 41: Vernetzen — Gründe, jeden Tag hineinzuschauen. Nach sql/35 und sql/36 ausführen. Idempotent.
-- Kein Geld, keine Provision, keine Gästedaten an Dritte. Alles beruht auf Daten, die der Betrieb selbst freigibt.

-- 1. Ausgebucht? Partner zeigen, die frei sind.
--    Ist ein Tag im eigenen Formular belegt, zeigt es dem Gast Partner, die an dem Tag frei sind.
--    Jeder Betrieb kann das für sich abschalten (dann erscheint er dort nicht).
alter table netz_profil add column if not exists frei_zeigen boolean not null default true;

-- 2. Freie Termine an Partner melden (Lücken-Alarm). Nur Tage, die der Betrieb selbst einträgt.
alter table netz_profil add column if not exists freie_tage jsonb not null default '[]'::jsonb;   -- ['2027-07-12', …]
alter table netz_profil add column if not exists freie_tage_am timestamptz;

-- 3. Profilbesuche. Gespeichert wird nur: wer, wen, an welchem Tag. Angezeigt werden nur Anzahl und Branche,
--    nie der Name des Besuchers. Nach 30 Tagen löscht api/nacht.js die Einträge.
create table if not exists netz_besuch (
  besucher  uuid not null references tenants(id) on delete cascade,
  ziel      uuid not null references tenants(id) on delete cascade,
  tag       date not null default current_date,
  primary key (besucher, ziel, tag)
);
create index if not exists netz_besuch_ziel_idx on netz_besuch (ziel, tag);
alter table netz_besuch enable row level security;

-- 4. Antwortzeit: wann der Betrieb zum ersten Mal auf eine Anfrage reagiert hat
--    (Stand geändert, Mail an den Gast, Angebot verschickt).
alter table leads add column if not exists erste_antwort_at timestamptz;
create index if not exists leads_antwort_idx on leads (tenant_id, created_at) where erste_antwort_at is not null;
