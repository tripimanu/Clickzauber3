-- 48: Echtzeit-Kalender. clickzauber schreibt Termine direkt in Google, Outlook oder iCloud.
-- Nach 47 ausführen, vor dem Hochladen der neuen lib/-Dateien.

create table if not exists kalender_direkt (
  tenant_id    uuid primary key references tenants(id) on delete cascade,
  art          text not null check (art in ('google','microsoft','icloud')),
  konto        text,                 -- angezeigte Adresse, z. B. salon@gmail.com
  zugang       text not null,        -- verschlüsselt (AES-256-GCM), nie im Klartext
  kalender_id  text,                 -- Google: 'primary' · iCloud: Adresse des Kalenders „clickzauber“
  aktiv        boolean not null default true,
  stand        timestamptz,          -- letzter Abgleich
  fehler       text,
  laeuft_bis   timestamptz,          -- Sperre, damit zwei Abgleiche nicht doppelt eintragen
  nochmal      boolean not null default false,
  verbunden_am timestamptz default now()
);
alter table kalender_direkt enable row level security;

-- Was clickzauber schon eingetragen hat: Quelle (Termin oder Buchung) → Kennung beim Anbieter
create table if not exists kalender_eintrag (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  quelle     text not null,
  fremd_id   text,
  hash       text,
  updated_at timestamptz default now(),
  primary key (tenant_id, quelle)
);
alter table kalender_eintrag enable row level security;
