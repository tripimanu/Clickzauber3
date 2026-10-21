-- 31: Warteliste
-- Ist ein Tag oder eine Uhrzeit vergeben, kann sich der Gast eintragen.
-- Wird der Termin wieder frei, bekommt er eine Nachricht.
create table if not exists warteliste (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  widget_id        text not null,
  datum            date not null,
  personal_id      uuid references personal(id) on delete set null,
  name             text,
  email            text,
  telefon          text,
  created_at       timestamptz not null default now(),
  benachrichtigt_am timestamptz
);
create index if not exists warteliste_tenant_idx on warteliste (tenant_id, datum);
create index if not exists warteliste_widget_idx on warteliste (widget_id, datum);
alter table warteliste enable row level security;
