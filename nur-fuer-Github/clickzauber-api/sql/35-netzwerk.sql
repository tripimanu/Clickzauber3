-- 35: Vernetzen — Profile, Kontakte, Nachrichten, Gefällt mir, Partner im Widget
-- Nur für angemeldete Betriebe. Im Monatspreis enthalten, keine Provision, kein Geld über clickzauber.
-- Idempotent, kann mehrfach laufen.

-- Profil je Betrieb
create table if not exists netz_profil (
  tenant_id     uuid primary key references tenants(id) on delete cascade,
  name          text,
  branche       text,                    -- hochzeit | foodtruck | catering | foto | floristik | deko | musik | friseur | tagung | sonstige
  ort           text,
  plz           text,
  umkreis_km    integer,
  text          text,
  person_name   text,
  person_rolle  text,
  titelbild     text,                    -- öffentliche Adresse im Speicher „netz“
  personbild    text,
  bilder        jsonb not null default '[]'::jsonb,   -- [{ id, url }]
  sichtbar      boolean not null default true,        -- im Bereich Vernetzen auffindbar
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
-- Eckdaten als Kacheln im Profil, z. B. [{ wert: '16 A', label: 'Strom' }]. Bilder mit text/am sind Beiträge.
alter table netz_profil add column if not exists eckdaten jsonb not null default '[]'::jsonb;
create index if not exists netz_profil_branche_idx on netz_profil (branche);
create index if not exists netz_profil_plz_idx on netz_profil (plz);

-- Kontakte: von fragt an, an bestätigt
create table if not exists netz_verbindung (
  id             uuid primary key default gen_random_uuid(),
  von            uuid not null references tenants(id) on delete cascade,
  an             uuid not null references tenants(id) on delete cascade,
  status         text not null default 'offen',   -- offen | ok | abgelehnt
  created_at     timestamptz not null default now(),
  beantwortet_at timestamptz,
  unique (von, an)
);
create index if not exists netz_verbindung_an_idx on netz_verbindung (an, status);

-- Nachrichten zwischen Betrieben
create table if not exists netz_nachricht (
  id          uuid primary key default gen_random_uuid(),
  von         uuid not null references tenants(id) on delete cascade,
  an          uuid not null references tenants(id) on delete cascade,
  text        text not null,
  gelesen_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists netz_nachricht_paar_idx on netz_nachricht (von, an, created_at desc);
create index if not exists netz_nachricht_an_idx on netz_nachricht (an, gelesen_at);

-- Gefällt mir: für das Profil (bild = '') oder ein einzelnes Bild (bild = Bild-ID)
create table if not exists netz_like (
  von         uuid not null references tenants(id) on delete cascade,
  ziel        uuid not null references tenants(id) on delete cascade,
  bild        text not null default '',
  created_at  timestamptz not null default now(),
  primary key (von, ziel, bild)
);

-- Partner, die ein Betrieb in seinem Widget zeigt. Der Partner muss zustimmen.
create table if not exists netz_partner (
  tenant_id    uuid not null references tenants(id) on delete cascade,
  partner_id   uuid not null references tenants(id) on delete cascade,
  reihenfolge  integer not null default 0,
  zugestimmt   boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (tenant_id, partner_id)
);

-- Blockieren und Melden
create table if not exists netz_block (
  von         uuid not null references tenants(id) on delete cascade,
  an          uuid not null references tenants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (von, an)
);
create table if not exists netz_meldung (
  id          uuid primary key default gen_random_uuid(),
  von         uuid references tenants(id) on delete set null,
  ziel        uuid references tenants(id) on delete cascade,
  bild        text,
  grund       text,
  erledigt_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Weiterleiten von Anfragen: Gast stimmt im Formular zu, Herkunft wird vermerkt
alter table leads add column if not exists weiter_ok boolean not null default false;
alter table leads add column if not exists weitergeleitet jsonb not null default '[]'::jsonb;  -- [{ an, name, am }]
alter table leads add column if not exists herkunft_tenant uuid;

alter table netz_profil     enable row level security;
alter table netz_verbindung enable row level security;
alter table netz_nachricht  enable row level security;
alter table netz_like       enable row level security;
alter table netz_partner    enable row level security;
alter table netz_block      enable row level security;
alter table netz_meldung    enable row level security;

-- Speicher für Profilbilder. Öffentlich lesbar, geschrieben wird nur über die API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('netz', 'netz', true, 2097152, array['image/jpeg','image/webp','image/png'])
on conflict (id) do nothing;
