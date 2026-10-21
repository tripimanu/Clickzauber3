-- Einführungs-Touren (Cockpit, Vernetzen, …): welche Tour eine Person schon gesehen hat.
-- Jede Tour startet nur einmal von selbst — auch auf einem zweiten Gerät nicht erneut.
alter table users add column if not exists touren text[] not null default '{}';

-- Kontrolle
select count(*) as konten, count(*) filter (where cardinality(touren) > 0) as mit_tour from users;
