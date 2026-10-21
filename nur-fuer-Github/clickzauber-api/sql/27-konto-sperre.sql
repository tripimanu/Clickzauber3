-- 27: Konten sperren (Betreiber-Bremse)
-- Ein gesperrtes Konto liefert kein Widget mehr aus. Daten bleiben erhalten,
-- Entsperren stellt alles wieder her.
alter table users add column if not exists gesperrt_am timestamptz;
alter table users add column if not exists gesperrt_grund text;
