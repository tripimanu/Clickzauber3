-- 44: Vertrauenspunkte, Vertrauensabzeichen und Rangliste
-- Punkte: einmalige Missionen + 2 je Anfrage + 10 je Abschluss. Berechnet nur der Server (lib/_vertrauen.js),
-- damit niemand im Browser schummeln kann. Einmal gezählte Anfragen bleiben gezählt, auch wenn die
-- Löschfrist die Anfrage später entfernt. Idempotent, kann mehrfach laufen. Vor dem GitHub-Upload ausführen.

-- Stand je Betrieb
create table if not exists vertrauen (
  tenant_id        uuid primary key references tenants(id) on delete cascade,
  punkte           integer not null default 0,
  anfragen         integer not null default 0,     -- gezählte Anfragen (je Gast-Adresse einmal)
  abschluesse      integer not null default 0,     -- gebucht oder Angebot angenommen
  missionen        text[]  not null default '{}',  -- erfüllte Missionen, nie wieder entfernt
  missions_punkte  integer not null default 0,
  aktualisiert     timestamptz not null default now()
);
alter table vertrauen enable row level security;
create index if not exists vertrauen_punkte_idx on vertrauen (punkte desc);

-- Welche Anfrage schon gezählt wurde (true = zählt, false = geprüft, zählt nicht)
alter table leads add column if not exists vt_anfrage boolean;
alter table leads add column if not exists vt_abschluss boolean;
create index if not exists leads_vt_neu_idx on leads (tenant_id) where vt_anfrage is null;

-- Land für die Rangliste (Deutschland, Österreich, Schweiz) und die Wahl, ob man dort erscheint
alter table netz_profil add column if not exists land text not null default 'DE';
alter table netz_profil add column if not exists rang_zeigen boolean not null default true;

-- Punkte gutschreiben — in einem Schritt, damit zwei gleichzeitige Aufrufe nichts doppelt zählen.
-- 2 und 10 stehen auch in lib/_vertrauen.js (PRO_ANFRAGE, PRO_ABSCHLUSS). Beide zusammen ändern.
create or replace function cz_vertrauen_buchen(tid uuid, plus_anfragen int, plus_abschluesse int, neue_missionen text[], mp int)
returns vertrauen language sql as $$
  insert into vertrauen as v (tenant_id, anfragen, abschluesse, missionen, missions_punkte, punkte, aktualisiert)
  values (tid, plus_anfragen, plus_abschluesse, neue_missionen, mp, mp + plus_anfragen * 2 + plus_abschluesse * 10, now())
  on conflict (tenant_id) do update set
    anfragen        = v.anfragen + plus_anfragen,
    abschluesse     = v.abschluesse + plus_abschluesse,
    missionen       = array(select distinct unnest(v.missionen || neue_missionen)),
    missions_punkte = greatest(v.missions_punkte, mp),
    punkte          = greatest(v.missions_punkte, mp) + (v.anfragen + plus_anfragen) * 2 + (v.abschluesse + plus_abschluesse) * 10,
    aktualisiert    = now()
  returning *;
$$;
revoke all on function cz_vertrauen_buchen(uuid, int, int, text[], int) from anon, authenticated;

-- Rangliste: nur Betriebe mit sichtbarem Profil, die nicht gesperrt sind und mitmachen wollen.
-- Erst entfernen: 45 erweitert die Liste um Spalten. Ohne diese Zeile scheitert ein zweiter Lauf von 44
-- mit „cannot drop columns from view“. 45 legt die erweiterte Fassung danach wieder an.
drop view if exists vertrauen_rang;
create or replace view vertrauen_rang with (security_invoker = true) as
  select v.tenant_id, v.punkte, p.name, p.branche, p.ort, p.plz, coalesce(p.land, 'DE') as land, p.titelbild, p.personbild
  from vertrauen v join netz_profil p on p.tenant_id = v.tenant_id
  where p.sichtbar and not coalesce(p.gesperrt, false) and coalesce(p.rang_zeigen, true) and v.punkte > 0;
revoke all on vertrauen_rang from anon, authenticated;

-- Kontrolle
select count(*) as betriebe_mit_punkten from vertrauen;
