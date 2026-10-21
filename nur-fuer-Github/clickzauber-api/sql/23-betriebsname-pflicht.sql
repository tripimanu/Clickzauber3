-- clickzauber SQL 23 — Name des Betriebs: Platzhalter raus, künftig gesperrt.
--
-- Anlass: in tenants.name stand "DEIN BETRIEBSNAME" — der Platzhalter aus der
-- Beispiel-Abfrage in SQL 15. Er stand damit in jeder Bestätigungsmail an die
-- Gäste ("Ihre Anfrage bei DEIN BETRIEBSNAME").
--
-- Im SQL Editor von Supabase einmal ausführen. Schritt 1 anpassen!

-- 1) Den echten Namen setzen. 'clickzauber' ersetzen.
update tenants
   set name = 'clickzauber'
 where id = '2e239ac6-c0f1-492a-9e00-6f9b70bfce92';

-- 2) Kontrolle: hier muss der echte Name stehen.
select id, name, email from tenants order by name;

-- 3) Riegel: Platzhalter, E-Mail-Adressen und leere Namen kommen nicht mehr in
--    die Tabelle. Ein Schreibversuch scheitert dann mit einem Fehler, statt
--    still in einer Gast-Mail zu landen.
alter table tenants drop constraint if exists tenants_name_echt;
alter table tenants add  constraint tenants_name_echt check (
  name is null or (
    length(btrim(name)) >= 2
    and position('@' in name) = 0
    and btrim(lower(name)) not in (
      'dein betriebsname','ihr betriebsname','mein betriebsname',
      'betriebsname','firmenname','name des betriebs',
      'platzhalter','test','tbd','todo'
    )
  )
);

-- 4) Sitzen noch irgendwo Platzhalter? Diese Abfrage muss leer bleiben.
select id, name from tenants
 where name is not null
   and ( length(btrim(name)) < 2
      or position('@' in name) > 0
      or btrim(lower(name)) in ('dein betriebsname','ihr betriebsname','betriebsname','test','platzhalter') );
