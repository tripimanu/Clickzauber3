-- 67: Einladungs-Link für vorgebaute Konten (09.10.2026)
-- Manuel baut auf der Plattform ein Konto vor (+ Konto vorbauen). Der Kunde öffnet clickzauber.de/einladung.html?c=CODE,
-- trägt E-Mail und Passwort ein und übernimmt das Konto. Ab dann läuft sein Testzugang 14 Tage (test_bis).
-- Danach bleibt das Cockpit offen, das Formular auf seiner Website geht aus (lib/config.js), bis Manuel verlängert.
alter table users add column if not exists einladung_code text;
alter table users add column if not exists eingeloest_am timestamptz;
alter table users add column if not exists test_bis timestamptz;
alter table users add column if not exists test_erinnert_am timestamptz;  -- zwei Tage vor Ende: Push und Mail an Manuel (api/nacht.js)
create unique index if not exists users_einladung_code on users (einladung_code) where einladung_code is not null;
