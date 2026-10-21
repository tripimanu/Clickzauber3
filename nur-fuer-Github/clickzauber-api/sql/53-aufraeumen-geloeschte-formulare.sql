-- 53 · Aufräumen: Mitarbeiter, Termin-Einstellungen und Termine von gelöschten Formularen
-- Gefahrlos mehrfach ausführbar. Betrifft nur Betriebe, die KEIN Formular mit Uhrzeit-Terminen mehr haben,
-- sowie Termine, deren Formular es nicht mehr gibt.
-- Die Einstellungen eines Formulars stehen in widget_versions.config_json (neueste Version zählt).

delete from termine t
where t.widget_id is not null
  and not exists (select 1 from widgets w where w.slug = t.widget_id);

with mit_termin as (
  select distinct w.tenant_id
  from widgets w
  join lateral (
    select v.config_json from widget_versions v
    where v.widget_id = w.slug
    order by v.version desc
    limit 1
  ) v on true
  where exists (
    select 1 from jsonb_array_elements(coalesce(v.config_json->'steps', '[]'::jsonb)) s
    where s->>'typ' = 'termin'
  )
)
, ohne as (
  select te.id as tenant_id from tenants te
  where te.id not in (select tenant_id from mit_termin where tenant_id is not null)
)
, a as (delete from termine where tenant_id in (select tenant_id from ohne) returning 1)
, b as (delete from personal where tenant_id in (select tenant_id from ohne) returning 1)
, c as (delete from termin_setup where tenant_id in (select tenant_id from ohne) returning 1)
select (select count(*) from a) as termine_weg, (select count(*) from b) as mitarbeiter_weg, (select count(*) from c) as einstellungen_weg;
