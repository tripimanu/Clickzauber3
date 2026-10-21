-- clickzauber SQL 22 — mehrere Betriebe eines Kontos zu einem zusammenfuehren.
--
-- Ausgangslage (Ihre Zaehlung 16): fuer tripi.manu@gmail.com stehen drei Zeilen
-- in "tenants" — mit 5, 1 und 0 Widgets. Das Cockpit zeigt nur die Widgets des
-- Betriebs, an dem das Konto haengt. Alles, was an den anderen beiden haengt,
-- ist unsichtbar: Widgets, Anfragen, Kennzahlen.
--
-- Dieses Skript waehlt den Betrieb mit den meisten Widgets als Ziel, haengt
-- Widgets, Anfragen, Ereignisse und das Konto dort ein und loescht die leeren
-- Betriebe. E-Mail unten pruefen. Laeuft gefahrlos mehrfach.

-- 1) Widgets umhaengen
with betriebe as (
  select t.id, t.created_at
    from tenants t
   where t.email = 'tripi.manu@gmail.com'
      or t.id in (select tenant_id from users where email = 'tripi.manu@gmail.com')
), ziel as (
  select b.id
    from betriebe b
    left join widgets w on w.tenant_id = b.id
   group by b.id, b.created_at
   order by count(w.id) desc, b.created_at
   limit 1
)
update widgets
   set tenant_id = (select id from ziel)
 where tenant_id in (select id from betriebe);

-- 2) Anfragen umhaengen
with betriebe as (
  select t.id, t.created_at
    from tenants t
   where t.email = 'tripi.manu@gmail.com'
      or t.id in (select tenant_id from users where email = 'tripi.manu@gmail.com')
), ziel as (
  select b.id from betriebe b
    left join widgets w on w.tenant_id = b.id
   group by b.id, b.created_at
   order by count(w.id) desc, b.created_at
   limit 1
)
update leads
   set tenant_id = (select id from ziel)
 where tenant_id in (select id from betriebe);

-- 3) Ereignisse (Klicks im Widget) umhaengen
with betriebe as (
  select t.id, t.created_at
    from tenants t
   where t.email = 'tripi.manu@gmail.com'
      or t.id in (select tenant_id from users where email = 'tripi.manu@gmail.com')
), ziel as (
  select b.id from betriebe b
    left join widgets w on w.tenant_id = b.id
   group by b.id, b.created_at
   order by count(w.id) desc, b.created_at
   limit 1
)
update events
   set tenant_id = (select id from ziel)
 where tenant_id in (select id from betriebe);

-- 4) Einstellungen mitnehmen, falls der Ziel-Betrieb noch keine hat
with betriebe as (
  select t.id, t.created_at
    from tenants t
   where t.email = 'tripi.manu@gmail.com'
      or t.id in (select tenant_id from users where email = 'tripi.manu@gmail.com')
), ziel as (
  select b.id from betriebe b
    left join widgets w on w.tenant_id = b.id
   group by b.id, b.created_at
   order by count(w.id) desc, b.created_at
   limit 1
)
update einstellungen
   set tenant_id = (select id from ziel)
 where tenant_id in (select id from betriebe)
   and tenant_id <> (select id from ziel)
   and not exists (select 1 from einstellungen e2 where e2.tenant_id = (select id from ziel));

-- 5) Konto auf den Ziel-Betrieb setzen
with betriebe as (
  select t.id, t.created_at
    from tenants t
   where t.email = 'tripi.manu@gmail.com'
      or t.id in (select tenant_id from users where email = 'tripi.manu@gmail.com')
), ziel as (
  select b.id from betriebe b
    left join widgets w on w.tenant_id = b.id
   group by b.id, b.created_at
   order by count(w.id) desc, b.created_at
   limit 1
)
update users
   set tenant_id = (select id from ziel)
 where email = 'tripi.manu@gmail.com';

-- 6) Die jetzt leeren Betriebe desselben Kontos loeschen
delete from tenants t
 where t.email = 'tripi.manu@gmail.com'
   and t.id not in (select tenant_id from users where tenant_id is not null)
   and not exists (select 1 from widgets w where w.tenant_id = t.id);

-- 7) Kontrolle: hier muss genau eine Zeile stehen, mit allen Widgets daran
select t.id, t.name, t.email, count(w.id) as widgets
  from tenants t
  left join widgets w on w.tenant_id = t.id
 where t.email = 'tripi.manu@gmail.com'
 group by t.id, t.name, t.email
 order by widgets desc;
