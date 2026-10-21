-- 65 — Funktionen je Betrieb (js/cz-funktionen.js, lib/einstellungen.js, lib/konto-admin.js, seit 07.10.2026)
-- Alle Betriebe haben dieselbe Software. Was ein Betrieb davon sieht, steht hier, z. B. { "netzwerk": false, "damen_herren": true }.
-- Fehlt ein Schlüssel, gilt der Standard aus js/cz-funktionen.js.
-- funktionen_am: letzte Änderung. Das Cockpit übernimmt sie ohne Neuladen.
-- neu_laden_am: „Jetzt bei ihm neu laden“ auf der Plattform-Seite. Das Cockpit lädt sich danach einmal neu, sobald niemand tippt.
alter table einstellungen add column if not exists funktionen jsonb not null default '{}'::jsonb;
alter table einstellungen add column if not exists funktionen_am timestamptz;
alter table einstellungen add column if not exists neu_laden_am timestamptz;
