-- 60: Lesen und bestätigen (03.10.2026). Nach 59 ausführen, VOR dem Hochladen zu GitHub.
-- Benachrichtigung, Datenschutzerklärung und Löschfrist zählen als Mission erst, wenn der Betrieb sie
-- im Cockpit ganz unten mit Haken bestätigt hat. Inhalt: { "mail": {"am","von","wert"}, "datenschutz": {...}, "loeschfrist": {...} }
alter table einstellungen add column if not exists bestaetigt jsonb not null default '{}'::jsonb;
