-- 58: Kalender-Ausfall melden (03.10.2026). Nach 57 ausführen, vor dem Hochladen der neuen lib/-Dateien.
-- Fällt die Echtzeit-Verbindung aus oder holt das Kalender-Abo nichts mehr ab, bekommt der Betrieb
-- einmal Push und Mail. Diese Spalten merken sich, dass er schon Bescheid weiß.
alter table kalender_direkt add column if not exists gemeldet_am timestamptz;
alter table einstellungen add column if not exists kal_abo_gemeldet_am timestamptz;
