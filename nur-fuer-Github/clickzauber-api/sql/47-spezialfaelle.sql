-- 47: Termine, die länger dauern (Friseur & Co.).
-- Nach 46 ausführen, vor dem Hochladen der neuen lib/-Dateien.

-- Hinweis am Termin, z. B. „Haar: lang“ oder die Kundennotiz zum Zeitpunkt der Buchung.
alter table termine add column if not exists hinweis text;

-- Notiz am Kunden: gilt für alle künftigen Buchungen derselben Person.
-- schluessel = 'm:' + E-Mail (klein) oder 't:' + Telefonnummer (nur Ziffern, mit Ländervorwahl).
create table if not exists kunden_notiz (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  schluessel text not null,
  notiz      text,
  plus_min   int  not null default 0 check (plus_min between 0 and 240),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, schluessel)
);
alter table kunden_notiz enable row level security;

-- Beratung zuerst: Leistung, Wunschtag und Fotos an der Anfrage.
alter table leads add column if not exists beratung jsonb;
alter table leads add column if not exists fotos jsonb;   -- Pfade im Speicher „beratung“

-- Fotos nicht öffentlich: das Cockpit bekommt nur zeitlich begrenzte Links.
insert into storage.buckets (id, name, public) values ('beratung', 'beratung', false)
on conflict (id) do nothing;
