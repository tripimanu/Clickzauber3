-- 62: Links für Facebook-Gruppen und Versand-Protokoll (05.10.2026). Nach 61 ausführen. Darf mehrmals laufen.
-- demo_qr.art: 'qr' (Visitenkarte, Flyer) oder 'link' (clickzauber.de/g/2001, z. B. für eine Facebook-Gruppe).
--   Ein Link startet die Demo sofort, ohne Angaben. Kontakt hinterlässt der Besucher später selbst.
--   branche 'wahl': Der Besucher wählt seine Branche selbst.
-- demo_qr.aufrufe: wie oft der Link oder QR-Code geöffnet wurde, auch wiederholt.
-- demo_zugaenge.quelle: 'link' bei Demos aus einem Link (sonst leer: persönlicher Link oder QR-Code).
-- demo_zugaenge.verschickt: wann und wie ein persönlicher Link verschickt wurde (WhatsApp, kopiert).
alter table demo_qr add column if not exists art text not null default 'qr';
alter table demo_qr add column if not exists aufrufe int not null default 0;
alter table demo_zugaenge add column if not exists quelle text;
alter table demo_zugaenge add column if not exists verschickt jsonb not null default '[]'::jsonb;
