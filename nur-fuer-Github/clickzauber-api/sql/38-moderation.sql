-- Moderation im Netzwerk: automatische Prüfung, Meldungen bearbeiten, Profile sperren.
alter table netz_profil  add column if not exists gesperrt boolean not null default false;
alter table netz_profil  add column if not exists gesperrt_grund text;
alter table netz_meldung add column if not exists status text not null default 'offen';
alter table netz_meldung add column if not exists notiz text;
alter table netz_meldung add column if not exists art text;
alter table netz_meldung add column if not exists auszug text;
alter table netz_like    add column if not exists created_at timestamptz not null default now();

-- Automatisch blockierte Inhalte. Bilder werden nie gespeichert, nur Art, Grund und Zeitpunkt.
create table if not exists netz_moderation (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete set null,
  art         text not null,
  auszug      text,
  kategorien  jsonb not null default '[]'::jsonb,
  grund       text,
  schwer      boolean not null default false,
  status      text not null default 'blockiert',
  created_at  timestamptz not null default now()
);
create index if not exists netz_moderation_zeit on netz_moderation (created_at desc);
create index if not exists netz_meldung_status on netz_meldung (status, created_at desc);
alter table netz_moderation enable row level security;

-- Vermerke nach 12 Monaten löschen (siehe Datenschutzerklärung 9e Abs. 6). Läuft nachts über lib/loeschfrist.js.
