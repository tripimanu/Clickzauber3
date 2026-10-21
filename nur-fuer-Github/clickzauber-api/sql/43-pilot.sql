-- Pilotplätze: die nächsten vier neuen Konten nutzen clickzauber kostenlos, solange ZAHLUNG_AKTIV aus ist.
-- Gesetzt bei der Anmeldung (lib/_plans.js), von Hand änderbar auf der Plattform-Seite.
alter table users add column if not exists pilot_seit timestamptz;
create index if not exists users_pilot_idx on users (pilot_seit) where pilot_seit is not null;

-- Kontrolle
select count(*) filter (where pilot_seit is not null) as pilotbetriebe from users;
