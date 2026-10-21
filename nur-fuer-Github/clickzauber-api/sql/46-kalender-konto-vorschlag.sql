-- 46: Ein Kalender-Abo je Konto (für alle Formulare) und „Andere Uhrzeit vorschlagen“.
-- Nach 45 ausführen, vor dem Hochladen der neuen lib/-Dateien.

-- Kalender-Abo auf Konto-Ebene. Der Schlüssel gilt für alle Formulare des Betriebs.
alter table einstellungen add column if not exists kal_abo_key text;
alter table einstellungen add column if not exists kal_abo_abruf_am timestamptz;       -- letzter Abruf durch den Kalender
alter table einstellungen add column if not exists kal_abo_bestaetigt_am timestamptz;  -- Probe-Termin gesehen und bestätigt

-- Uhrzeit-Termine: Betrieb schlägt eine andere Zeit vor, Gast bestätigt per Link.
alter table termine add column if not exists vorschlag_von timestamptz;  -- ursprünglich gewünschter Beginn
alter table termine add column if not exists gast_key text;              -- Schlüssel für den Bestätigungs-Link

alter table termine drop constraint if exists termine_status_check;
alter table termine add constraint termine_status_check
  check (status in ('wunsch','vorschlag','fest','abgelehnt','abgesagt'));

-- Auch ein Vorschlag hält die Zeit frei, bis der Gast antwortet.
alter table termine drop constraint if exists termine_keine_ueberschneidung;
alter table termine add constraint termine_keine_ueberschneidung
  exclude using gist (personal_id with =, tstzrange(start, ende, '[)') with &&)
  where (status in ('wunsch','vorschlag','fest') and personal_id is not null);
