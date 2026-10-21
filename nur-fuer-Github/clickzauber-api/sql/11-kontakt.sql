-- clickzauber 11: Kontaktangaben für die Gast-Bestätigung und Benachrichtigungs-Rhythmus.
-- Nach 07-einstellungen.sql ausführen.

alter table einstellungen add column if not exists mail_rhythmus text default 'sofort';
alter table einstellungen add column if not exists ansprechpartner text;
alter table einstellungen add column if not exists telefon text;
alter table einstellungen add column if not exists antwort_an text;
alter table einstellungen add column if not exists antwortzeit_stunden int default 0;
