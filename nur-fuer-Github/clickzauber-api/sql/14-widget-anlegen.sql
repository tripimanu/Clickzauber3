-- clickzauber SQL 14 — die fehlende Widget-Zeile anlegen (korrigiert).
-- Zwei Luecken im Schema werden hier geschlossen:
--   a) users hat keine Spalte tenant_id, obwohl die API sie abfragt
--   b) 02-config-seed legt nur die Konfiguration an, nie die Zeile in "widgets"
-- Ohne beides meldet das Cockpit: "Dieses Widget gibt es nicht."
--
-- Vor dem Ausfuehren: E-Mail unten auf Ihre Konto-Adresse pruefen.
-- Laeuft gefahrlos mehrfach.

-- 1) Fehlende Spalte nachruesten
alter table users add column if not exists tenant_id uuid references tenants(id);
create index if not exists users_tenant_idx on users (tenant_id);

-- 2) Betrieb (Mandant) anlegen, falls noch keiner da ist
insert into tenants (name)
select 'clickzauber'
where not exists (select 1 from tenants);

-- 3) Konto mit dem Betrieb verknuepfen
update users
   set tenant_id = (select id from tenants order by created_at limit 1)
 where email = 'tripi.manu@gmail.com'
   and tenant_id is null;

-- 4) Die eigentliche Widget-Zeile
insert into widgets (tenant_id, slug, name, branche, domain, status)
select (select tenant_id from users where email = 'tripi.manu@gmail.com'),
       'clickzauberhochzeit',
       'Hochzeits-Planer',
       'Hochzeitslocation',
       'clickzauber.de',
       'live'
where not exists (select 1 from widgets where slug = 'clickzauberhochzeit');

-- 5) Falls die Zeile schon ohne Mandant existierte: nachtragen
update widgets
   set tenant_id = (select tenant_id from users where email = 'tripi.manu@gmail.com')
 where slug = 'clickzauberhochzeit'
   and tenant_id is null;

-- 6) Kontrolle: hier muss genau eine Zeile mit Ihrer E-Mail stehen
select w.slug, w.name, w.status, w.tenant_id, u.email
  from widgets w
  left join users u on u.tenant_id = w.tenant_id
 where w.slug = 'clickzauberhochzeit';
