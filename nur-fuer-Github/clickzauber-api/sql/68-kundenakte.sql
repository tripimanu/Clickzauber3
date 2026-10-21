-- 68: Kundenübersicht mit Checkliste auf der Plattform (09.10.2026)
-- users.schritte: wann welcher Schritt erledigt ist, je Konto. Zeitpunkte als ISO-Text, nur der erste zählt.
--   Von Manuel abgehakt (lib/konto-admin.js 'schritt'): geprueft („Alles geprüft und getestet“), versendet (Erstversendung, versendet_wie).
--   Vom Server (lib/einladung.js): geoeffnet, aufrufe, zuletzt (Einladungs-Link nach dem Verschicken), formular (Link nach dem Einlösen),
--   live (lib/save.js beim Live schalten).
--   Vom Cockpit des Kunden (js/cz-test.js): home, probe, teilen, formular.
-- Fehlt die Spalte, laufen Einladung und Cockpit weiter wie bisher; nur die Checkliste bleibt leer.
alter table users add column if not exists schritte jsonb not null default '{}'::jsonb;
