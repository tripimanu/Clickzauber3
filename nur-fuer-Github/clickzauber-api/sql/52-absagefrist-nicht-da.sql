-- 52: Frist zum Absagen, „nicht erschienen“, Umbuchen nah am alten Termin. Nach 51 ausführen, vor GitHub.
-- Bis wie viele Stunden vor Beginn Kunden selbst absagen oder umbuchen dürfen (Standard 1)
alter table termin_setup add column if not exists absage_std int not null default 1;
-- Nicht erschienen: am Termin und als Zähler bei der Person
alter table termine add column if not exists nicht_da timestamptz;
alter table kunden_notiz add column if not exists nicht_da int not null default 0;
-- Sperre gegen Doppelbuchung: Eine Umbuchung darf ihren eigenen alten Termin überlappen
-- (14:00 → 14:30), sonst bleibt alles wie bisher geschützt.
create extension if not exists btree_gist;
alter table termine drop constraint if exists termine_keine_ueberschneidung;
alter table termine add constraint termine_keine_ueberschneidung
  exclude using gist (personal_id with =, tstzrange(start, ende, '[)') with &&, (coalesce(ersetzt, id)) with <>)
  where (status in ('wunsch','vorschlag','fest') and personal_id is not null);
