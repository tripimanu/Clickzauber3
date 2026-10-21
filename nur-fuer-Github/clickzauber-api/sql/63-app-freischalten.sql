-- 63: Konten aus der App ohne Tarif (06.10.2026). Nach 62 ausführen.
-- Merkt sich, wann die Mail mit dem Weg zum Tarif rausging (höchstens einmal in 20 Stunden). lib/_app-freischalten.js
alter table users add column if not exists app_hinweis_am timestamptz;
