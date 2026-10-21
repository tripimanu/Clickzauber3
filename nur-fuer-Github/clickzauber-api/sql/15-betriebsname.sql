-- clickzauber SQL 15 — Name des Betriebs setzen.
-- Beim Anmelden wird der Mandant unter der E-Mail-Adresse angelegt. Deshalb stand
-- in der Bestaetigungsmail an den Gast "bei tripi.manu@gmail.com" statt des
-- Betriebsnamens. lib/lead.js blendet eine E-Mail jetzt aus - hier kommt der
-- richtige Name hinein.
--
-- 'clickzauber' unten durch den Namen ersetzen, der beim Gast stehen soll.

update tenants
   set name = 'clickzauber'
 where name is null or name like '%@%';

-- Kontrolle
select id, name, email from tenants;
