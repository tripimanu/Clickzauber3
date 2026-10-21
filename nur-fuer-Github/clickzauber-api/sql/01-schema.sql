-- 01 — Grundschema. ZUERST ausführen, vor 02, 03 und 04.
-- Supabase → SQL Editor → einfügen → Run. Idempotent, kann mehrfach laufen.

create extension if not exists pgcrypto;

-- ── Betriebe (Mandanten) ────────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  created_at  timestamptz not null default now()
);

-- ── Nutzer und Anmeldecodes: siehe 03-auth-billing.sql ─────────────────
-- (dort vollständig mit Rechnungsanschrift und Abo-Feldern)

-- ── Widgets ─────────────────────────────────────────────────────────────
create table if not exists widgets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  slug        text not null unique,      -- die öffentliche Widget-Kennung (data-cz)
  name        text,
  branche     text,
  domain      text,                      -- Website, auf der es eingebaut ist
  status      text default 'entwurf',    -- entwurf | live | pausiert
  belegung    jsonb default '{}'::jsonb, -- { gesperrt:[], frei:[], wochentage:[] }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Widget-Versionen (die eigentliche Konfiguration) ────────────────────
create table if not exists widget_versions (
  id            uuid primary key default gen_random_uuid(),
  widget_id     text not null,
  version       integer not null default 1,
  config_json   jsonb not null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (widget_id, version)
);

-- ── Anfragen (Leads) ────────────────────────────────────────────────────
create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete set null,
  widget_id       text not null,
  session_id      text,
  name            text,
  email           text,
  phone           text,
  answers         jsonb,
  score           integer,
  value_est       numeric,               -- geschätzter Auftragswert in Euro
  termin          date,                  -- Wunschtermin des Gastes
  status          text default 'neu',
  consent         boolean not null default false,
  nachgefasst_at  timestamptz,
  ts              timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- ── Ereignisse (Trichter-Auswertung) ────────────────────────────────────
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) on delete set null,
  widget_id     text not null,
  session_id    text,
  type          text not null,           -- start | answer | complete | channel
  step          integer,
  answer_key    text,
  answer_value  text,
  ts            timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ── Indizes ─────────────────────────────────────────────────────────────
create index if not exists leads_widget_ts_idx   on leads   (widget_id, ts desc);
create index if not exists leads_tenant_ts_idx   on leads   (tenant_id, ts desc);
create index if not exists events_widget_ts_idx  on events  (widget_id, ts desc);
create index if not exists events_tenant_ts_idx  on events  (tenant_id, ts desc);
create index if not exists widgets_slug_idx      on widgets (slug);
create index if not exists wv_widget_ver_idx     on widget_versions (widget_id, version desc);

-- ── Row Level Security ──────────────────────────────────────────────────
-- Alle Zugriffe laufen über die API mit dem service_role-Schlüssel (umgeht RLS).
-- Der öffentliche anon-Schlüssel sieht dadurch nichts.
alter table tenants         enable row level security;
alter table widgets         enable row level security;
alter table widget_versions enable row level security;
alter table leads           enable row level security;
alter table events          enable row level security;
