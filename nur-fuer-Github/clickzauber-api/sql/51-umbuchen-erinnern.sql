-- 51: Kunde bucht selbst um, Erinnerung am Vortag. Nach 50 ausführen, vor dem Hochladen der neuen lib/-Dateien.
-- Umbuchung: neuer Termin (Anfrage) zeigt auf den bisherigen. Der bisherige bleibt fest, bis der Betrieb annimmt.
alter table termine add column if not exists ersetzt uuid references termine(id) on delete set null;
create index if not exists termine_ersetzt on termine (ersetzt) where ersetzt is not null;
-- Wann der Kunde am Vortag per WhatsApp erinnert wurde
alter table termine add column if not exists gast_erinnert timestamptz;
