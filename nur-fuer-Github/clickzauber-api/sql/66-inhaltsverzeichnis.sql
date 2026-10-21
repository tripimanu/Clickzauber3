-- 66 · Inhaltsverzeichnis mit runden Kacheln (seit 08.10.2026)
-- Einstellungen je Betrieb: an/aus, Waschen & Föhnen (Preis, Dauer) und die Zuschläge in Prozent je Haar-Angabe.
-- Die Leistungen selbst (Kategorie, Haare, Farbe, Waschen, ab-Preis, Hinweis) stehen wie bisher in termin_setup.leistungen.
-- Einmal in Supabase → SQL Editor ausführen. Ohne diese Spalte speichert das Cockpit die Leistungen, aber nicht die Zuschläge.
alter table termin_setup add column if not exists salon jsonb;
