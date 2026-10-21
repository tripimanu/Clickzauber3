-- 07 — Einstellungen, Datenschutz-Nachweise, Löschprotokoll.
-- In Supabase → SQL Editor ausführen. Idempotent.

-- Einstellungen je Betrieb. Ein Datensatz pro Mandant.
create table if not exists einstellungen (
  tenant_id          uuid primary key references tenants(id) on delete cascade,
  -- Benachrichtigungen
  mail_haupt         text,                   -- wohin Anfragen gehen (Standard: Konto-Adresse)
  mail_zweit         text,                   -- zweite Adresse, z.B. Vertretung im Urlaub
  mail_gast          boolean default true,   -- Bestätigung an den Gast senden
  nachfassen         boolean default true,    -- Zwischennachricht nach 3 Tagen
  -- Datenschutz
  datenschutz_url    text,                   -- Datenschutzerklärung DES KUNDEN, erscheint im Widget
  loeschfrist_monate integer default 24,     -- Anfragen automatisch löschen nach x Monaten (0 = nie)
  av_vertrag_am      timestamptz,            -- wann der AV-Vertrag abgeschlossen wurde
  av_vertrag_von     text,                   -- wer ihn abgeschlossen hat (Name)
  av_vertrag_fassung text,                   -- Fassung, damit Änderungen nachweisbar sind
  -- Betrieb
  pausiert           boolean default false,  -- Widget vorübergehend abschalten
  pausiert_text      text,                   -- was Besucher stattdessen sehen
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table einstellungen enable row level security;

-- Protokoll: wer hat wann was gelöscht oder exportiert.
-- Bei einer Datenschutz-Anfrage können Sie damit belegen, dass Sie gehandelt haben.
create table if not exists protokoll (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete set null,
  was         text not null,        -- export | lead_geloescht | konto_geloescht | av_vertrag | frist_gelaufen
  wer         text,                 -- E-Mail des Handelnden
  anzahl      integer,              -- betroffene Datensätze
  hinweis     text,
  created_at  timestamptz not null default now()
);

create index if not exists protokoll_tenant_idx on protokoll (tenant_id, created_at desc);
alter table protokoll enable row level security;

-- Löschfrist braucht einen Index, sonst wird der nächtliche Lauf langsam.
create index if not exists leads_alt_idx on leads (ts);
