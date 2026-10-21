-- 26 — Sonderpreise: ausgehandelte Preise je Kunde.
-- In Supabase → SQL Editor ausführen. Idempotent.
--
-- WOZU
-- Der Listenpreis ist der Wunsch, nicht die Grenze. Sagt ein Betrieb „mehr als
-- 100 € geht bei mir nicht", soll er für 100 € unterschreiben können. Dieser
-- Preis wird hier hinterlegt und gilt ab dann für ihn — im Bezahlfenster, auf
-- der Rechnung und im Cockpit.
--
-- WARUM AN DER E-MAIL UND NICHT AM KONTO
-- Verhandelt wird, bevor jemand ein Konto hat. Der Preis hängt deshalb an der
-- E-Mail-Adresse: Sie tragen ihn im Vertriebs-Blatt ein, und sobald sich diese
-- Adresse anmeldet, greift er von selbst. Kein zweiter Handgriff, kein
-- Vergessen, keine Gutscheincodes, die weitergereicht werden können.

create table if not exists sonderpreise (
  email        text primary key,          -- immer klein geschrieben
  plan         text not null,             -- für welchen Tarif: start | duo | unlim | pilot
  monat        numeric(8,2),              -- Monatspreis in Euro, null = Listenpreis
  jahr         numeric(9,2),              -- Jahrespreis; leer = 10 × Monatspreis
  notiz        text,                      -- warum, für Ihr Gedächtnis
  angelegt_am  timestamptz not null default now(),
  angelegt_von text,
  geaendert_am timestamptz
);

-- Die Suche läuft immer über die klein geschriebene Adresse.
create index if not exists sonderpreise_email_idx on sonderpreise (lower(email));

alter table sonderpreise enable row level security;

-- Kein öffentlicher Zugriff: hier steht, wer wie viel zahlt.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sonderpreise') then
    create policy sonderpreise_kein_anon on sonderpreise for all using (false);
  end if;
end $$;
