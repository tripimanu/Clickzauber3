-- 54 — Feedback aus der Demo (clickzauber.de/demo, lib/demo-feedback.js).
-- Nur der Server schreibt und liest (Service-Schlüssel). Kontaktdaten stehen nur drin,
-- wenn der Interessent die Einrichtung wünscht. api/nacht.js löscht nach 12 Monaten.
-- Gefahrlos mehrfach ausführbar.
create table if not exists demo_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  branche     text,
  formular    text,
  wunsch      text,
  schmerz     text,
  einrichtung boolean not null default false,
  name        text,
  email       text,
  telefon     text,
  website     text,
  quelle      text,
  sprache     text
);
create index if not exists demo_feedback_zeit on demo_feedback (created_at desc);
alter table demo_feedback enable row level security;

-- Kontrolle: die letzten Antworten
select created_at, branche, einrichtung, email, left(wunsch, 80) as wunsch, left(schmerz, 80) as schmerz
from demo_feedback order by created_at desc limit 20;
