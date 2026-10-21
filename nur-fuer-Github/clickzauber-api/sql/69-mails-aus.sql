-- clickzauber: Schalter „E-Mails an / aus“ (13.10.2026). Aus = der Betrieb bekommt keine Mail bei neuen Anfragen und Terminen.
-- Push-Mitteilungen, Mails an Gäste und Mails an Manuel bleiben. Nach 68-kundenakte.sql ausführen.
alter table einstellungen add column if not exists mail_betrieb boolean default true;
