-- clickzauber: Anmeldung (E-Mail-Code), Profil & Abo. Nach dem Haupt-Schema ausführen.

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  verified      boolean default false,
  token         text,                       -- Session-Token (nach Verifizierung)
  vorname       text,
  nachname      text,
  firma         text,
  strasse       text,
  plz_ort       text,
  telefon       text,
  ustid         text,
  website       text,
  plan          text,                       -- 'start' | 'duo' | 'unlim'
  cycle         text,                       -- 'monthly' | 'yearly'
  plan_status   text default 'inaktiv',     -- 'inaktiv' | 'aktiv'
  stripe_customer text,
  stripe_sub    text,
  created_at    timestamptz default now()
);

-- Kurzlebige Anmelde-Codes (6-stellig)
create table if not exists auth_codes (
  id          bigint generated always as identity primary key,
  email       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  used        boolean default false,
  created_at  timestamptz default now()
);
create index if not exists auth_codes_email_idx on auth_codes(email, created_at desc);

-- Widget an einen User binden (Self-Service). Bestehende Spalten bleiben.
alter table widgets add column if not exists user_id uuid references users(id);
