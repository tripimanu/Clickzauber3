-- 05 — Funnel-Antworten und Empfehlungen.
-- In Supabase → SQL Editor ausführen. Idempotent.

create table if not exists interesse (
  email              text primary key,
  anfragen_monat     text,          -- "5–15"
  auftragswert       text,          -- "12.000–25.000 €"
  auftragswert_zahl  numeric,       -- 18000 (für Auswertung)
  erfolgskriterium   text,          -- was der Interessent selbst als Erfolg nennt
  nutzungsdauer      text,          -- Testen | Eine Saison | Dauerhaft
  empfehlungscode    text,          -- eigener Code, den er weitergeben kann
  geworben_von       text,          -- Code, über den er kam
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists interesse_code_idx    on interesse (empfehlungscode);
create index if not exists interesse_geworben_idx on interesse (geworben_von) where geworben_von is not null;
create index if not exists interesse_zeit_idx    on interesse (updated_at desc);

alter table interesse enable row level security;
