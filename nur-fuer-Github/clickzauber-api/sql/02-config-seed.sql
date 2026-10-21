-- clickzauber: erste Widget-Config anlegen (nach dem Haupt-Schema ausführen).
-- Ohne eine veröffentlichte Version liefert /api/config nichts.
-- Läuft gefahrlos mehrfach: legt nichts doppelt an.

insert into widget_versions (widget_id, version, config_json, published_at)
select 'clickzauberhochzeit', 1, '{
  "version": 1,
  "theme": { "accent": "#1f8a5b", "radius": 14, "font": "Space Grotesk" },
  "steps": [
    { "key": "anlass", "frage": "Was planen Sie?", "typ": "auswahl",
      "optionen": [
        { "label": "Freie Trauung am See", "score": 20 },
        { "label": "Standesamt + Feier", "score": 15 },
        { "label": "Firmenfeier", "score": 10 }
      ] },
    { "key": "gaeste", "frage": "Wie viele Gäste?", "typ": "auswahl",
      "optionen": [
        { "label": "bis 50", "score": 5 },
        { "label": "50–120", "score": 15 },
        { "label": "über 120", "score": 20 }
      ] },
    { "key": "zeit", "frage": "Wann ungefähr?", "typ": "auswahl",
      "optionen": [
        { "label": "Hauptsaison (Mai–Sep)", "score": 20 },
        { "label": "Nebensaison", "score": 10 },
        { "label": "Noch offen", "score": 5 }
      ] }
  ],
  "lead": { "felder": ["name","email","telefon"], "consent": true }
}'::jsonb, now()
where not exists (
  select 1 from widget_versions
  where widget_id = 'clickzauberhochzeit' and version = 1
);
