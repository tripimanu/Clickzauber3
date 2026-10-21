-- 64 — Termin-Links für Interessenten (lib/vertrieb-termin.js, Vertrieb-Seite, termin.html).
-- Manuel schickt einen Link (clickzauber.de/t/CODE). Der Interessent bestätigt einen Vorschlag mit einem Tipp
-- oder wünscht einen anderen Termin. Bestätigung per E-Mail (mit Kalender-Eintrag) oder per WhatsApp von Manuel.
-- Der Kontakt landet im Kontaktbuch (kontakte, Stufe „termin“). Auf Wunsch entsteht danach eine eigene 7-Tage-Demo.
-- Nur der Server liest und schreibt (Service-Schlüssel). In Supabase → SQL Editor ausführen. Idempotent.

create table if not exists vertrieb_termine (
  code text primary key,
  kontakt_id text,
  betrieb text,
  name text,
  branche text,
  email text,
  telefon text,
  art text not null default 'telefon',          -- telefon | video | vor_ort
  ort text,                                     -- Adresse (vor Ort) oder Link (Video)
  dauer int not null default 30,
  vorschlaege jsonb not null default '[]'::jsonb,  -- [{datum:'2026-10-12', zeit:'10:00'}]
  nachricht text,
  demo boolean not null default true,
  status text not null default 'offen',         -- offen | bestaetigt | anderer | abgesagt
  gewaehlt jsonb,                               -- {datum, zeit}
  wunsch text,
  weg text,                                     -- mail | whatsapp
  demo_code text,
  aufrufe int not null default 0,
  geoeffnet_am timestamptz,
  push_am timestamptz,
  bestaetigt_am timestamptz,
  wa_bestaetigt_am timestamptz,
  erinnert_am timestamptz,
  verschickt jsonb not null default '[]'::jsonb,
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index if not exists vertrieb_termine_zeit on vertrieb_termine (erstellt_am desc);

alter table vertrieb_termine enable row level security;
