-- 06 — Eigenes Kontaktbuch (Vertrieb). Nur der Betreiber greift darauf zu.
-- In Supabase → SQL Editor ausführen. Idempotent.

-- id ist text, weil das Cockpit auch offline Einträge anlegt und dabei eigene Kennungen vergibt.
create table if not exists kontakte (
  id          text primary key,
  firma       text,
  name        text,
  email       text,
  telefon     text,
  ort         text,
  stufe       text default 'notiz',   -- notiz | angesprochen | demo | angebot | kunde | abgesagt
  notiz       text,
  wert        text,                   -- geschätzter Auftragswert, wie eingetippt
  naechster   text,                   -- nächster Schritt
  plan        text,                   -- angepeilter Tarif
  cycle       text,                   -- monthly | yearly
  angelegt    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists kontakte_zeit_idx  on kontakte (updated_at desc);
create index if not exists kontakte_stufe_idx on kontakte (stufe);

-- Zugriff ausschließlich über die API mit dem service_role-Schlüssel.
alter table kontakte enable row level security;
