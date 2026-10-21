-- 50: Termin-Abläufe ohne Lücken. Nach 49 ausführen, vor dem Hochladen der neuen lib/-Dateien.
-- WhatsApp-Text, den der Betrieb noch nicht als gesendet bestätigt hat
alter table termine add column if not exists bescheid text;
-- Wann der Betrieb zuletzt an diesen Termin erinnert wurde (nächtliche Push-Nachricht)
alter table termine add column if not exists erinnert_am timestamptz;
