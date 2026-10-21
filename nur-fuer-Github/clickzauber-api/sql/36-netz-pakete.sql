-- 36: Vernetzen — gemeinsame Pakete mit Partnern. Nach sql/35 ausführen. Idempotent.
-- Ein Betrieb stellt bis zu drei Pakete zusammen (z. B. Location + Food Truck + Florist).
-- Wählt der Gast im Formular ein Paket, geht die Anfrage automatisch an alle Partner darin.
create table if not exists netz_paket (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  titel        text not null,
  text         text,
  partner      uuid[] not null default '{}',
  aktiv        boolean not null default true,
  reihenfolge  integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists netz_paket_tenant on netz_paket (tenant_id);
alter table netz_paket enable row level security;

-- Welche Anfrage über ein Paket kam
alter table leads add column if not exists paket_id uuid;
-- Für den Empfehlungs-Zähler: schnell zählen, was von Partnern kam
create index if not exists leads_herkunft on leads (herkunft_tenant) where herkunft_tenant is not null;
