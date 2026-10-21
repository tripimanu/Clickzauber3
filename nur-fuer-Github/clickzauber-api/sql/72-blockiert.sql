-- 72 · Blockieren (seit 15.10.2026)
-- Ein Betrieb blockiert eine Person, die ihn mit Anfragen stört. Gespeichert wird nur ein Fingerabdruck (sha256 mit Geheimnis),
-- nie Telefon, E-Mail oder Anschluss selbst. Anschluss (ip) gilt 24 Stunden, alles andere bis zur Freigabe.
create table if not exists blockiert (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  gruppe uuid not null,
  art text not null check (art in ('tel', 'mail', 'geraet', 'ip')),
  hash text not null,
  bis timestamptz,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists blockiert_suche on blockiert (tenant_id, hash);
create index if not exists blockiert_gruppe on blockiert (tenant_id, gruppe);
alter table blockiert enable row level security;

-- Fingerabdruck von Handy und Anschluss je Anfrage, damit „Blockieren“ beides sperren kann
alter table leads add column if not exists geraet_h text;
alter table leads add column if not exists ip_h text;
