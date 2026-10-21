-- clickzauber: Papierkorb für Formulare (21.10.2026). Nach 73-architekt-ki.sql ausführen.
-- Löschen im Cockpit setzt status = 'papierkorb' (Formular ist vom Netz, Anfragen und Termine bleiben).
-- Zurückholen setzt status_vorher wieder ein. Nach 30 Tagen löscht der Nachtlauf endgültig (lib/widget-loeschen.js).
alter table widgets add column if not exists geloescht_am timestamptz;
alter table widgets add column if not exists status_vorher text;
create index if not exists widgets_papierkorb_idx on widgets (geloescht_am) where status = 'papierkorb';
-- Formulare ohne Stand gelten schon heute als nicht live (lib/config.js). Damit die Filter „nicht im Papierkorb“ sie mitzählen: Entwurf.
update widgets set status = 'entwurf' where status is null;
