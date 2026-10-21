-- 45: Belohnungen zu den Vertrauensabzeichen
-- Glücksanfragen, Freunde werben, Monatssieger mit Krone, Aufstiegs-Nachricht, Rabatt je Stufe.
-- Nach 44 ausführen. Idempotent, kann mehrfach laufen. Vor dem GitHub-Upload ausführen.

alter table vertrauen add column if not exists bonus_punkte integer not null default 0;         -- aus Glücksanfragen
alter table vertrauen add column if not exists bonus_anzahl integer not null default 0;
alter table vertrauen add column if not exists bonus_letzt timestamptz;
alter table vertrauen add column if not exists geworben integer not null default 0;             -- geworbene Betriebe, je 200 Punkte
alter table vertrauen add column if not exists werbe_rabatt_monate integer not null default 0;  -- offene Monate mit 50 %
alter table vertrauen add column if not exists punkte_monat_start integer not null default 0;   -- Stand am 1. des Monats
alter table vertrauen add column if not exists krone_bis date;                                  -- Monatssieger: Krone bis Monatsende
alter table vertrauen add column if not exists krone_region text;                               -- z. B. DE-88
alter table vertrauen add column if not exists kronen integer not null default 0;
alter table vertrauen add column if not exists platz_region integer;                            -- letzter Platz im PLZ-Gebiet
alter table vertrauen add column if not exists rabatt_prozent integer not null default 0;       -- zuletzt bei Stripe gesetzt
update vertrauen set punkte_monat_start = punkte where punkte_monat_start = 0;

-- Freunde werben: fester Code je Betrieb, beim neuen Konto gemerkt, wer geworben hat.
alter table tenants add column if not exists werbe_code text;
create unique index if not exists tenants_werbe_code_idx on tenants (werbe_code) where werbe_code is not null;
alter table users add column if not exists geworben_von uuid references tenants(id) on delete set null;
alter table users add column if not exists werbung_gutgeschrieben boolean not null default false;

-- Punkte gutschreiben. 2, 10, 200 stehen auch in lib/_vertrauen.js. Beide zusammen ändern.
drop function if exists cz_vertrauen_buchen(uuid, int, int, text[], int);
create or replace function cz_vertrauen_buchen(tid uuid, plus_anfragen int, plus_abschluesse int, neue_missionen text[], mp int,
  plus_bonus int default 0, plus_bonus_anzahl int default 0, plus_geworben int default 0)
returns vertrauen language sql as $$
  insert into vertrauen as v (tenant_id, anfragen, abschluesse, missionen, missions_punkte, bonus_punkte, bonus_anzahl, bonus_letzt, geworben, werbe_rabatt_monate, punkte, aktualisiert)
  values (tid, plus_anfragen, plus_abschluesse, neue_missionen, mp, plus_bonus, plus_bonus_anzahl, case when plus_bonus_anzahl > 0 then now() end,
          plus_geworben, plus_geworben, mp + plus_anfragen * 2 + plus_abschluesse * 10 + plus_bonus + plus_geworben * 200, now())
  on conflict (tenant_id) do update set
    anfragen            = v.anfragen + plus_anfragen,
    abschluesse         = v.abschluesse + plus_abschluesse,
    missionen           = array(select distinct unnest(v.missionen || neue_missionen)),
    missions_punkte     = greatest(v.missions_punkte, mp),
    bonus_punkte        = v.bonus_punkte + plus_bonus,
    bonus_anzahl        = v.bonus_anzahl + plus_bonus_anzahl,
    bonus_letzt         = case when plus_bonus_anzahl > 0 then now() else v.bonus_letzt end,
    geworben            = v.geworben + plus_geworben,
    werbe_rabatt_monate = v.werbe_rabatt_monate + plus_geworben,
    punkte              = greatest(v.missions_punkte, mp) + (v.anfragen + plus_anfragen) * 2 + (v.abschluesse + plus_abschluesse) * 10
                          + v.bonus_punkte + plus_bonus + (v.geworben + plus_geworben) * 200,
    aktualisiert        = now()
  returning *;
$$;
revoke all on function cz_vertrauen_buchen(uuid, int, int, text[], int, int, int, int) from anon, authenticated;

-- Monatsanfang: Stand für den nächsten Monatssieger merken
create or replace function cz_vertrauen_monatsstart() returns void language sql as $$
  update vertrauen set punkte_monat_start = punkte;
$$;
revoke all on function cz_vertrauen_monatsstart() from anon, authenticated;

-- Rangliste mit Krone und letztem Platz
drop view if exists vertrauen_rang;
create view vertrauen_rang with (security_invoker = true) as
  select v.tenant_id, v.punkte, p.name, p.branche, p.ort, p.plz, coalesce(p.land, 'DE') as land, p.titelbild, p.personbild,
         v.punkte_monat_start, v.krone_bis, v.krone_region, v.platz_region
  from vertrauen v join netz_profil p on p.tenant_id = v.tenant_id
  where p.sichtbar and not coalesce(p.gesperrt, false) and coalesce(p.rang_zeigen, true) and v.punkte > 0;
revoke all on vertrauen_rang from anon, authenticated;

select count(*) as betriebe_mit_punkten from vertrauen;
