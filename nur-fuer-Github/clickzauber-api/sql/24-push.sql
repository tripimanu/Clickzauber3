-- 24 — Push-Nachrichten: welche Geräte eine Anfrage sofort melden sollen.
-- In Supabase → SQL Editor ausführen. Idempotent.
--
-- Ein Gerät (Handy, Tablet, Rechner) meldet sich beim Browser an und bekommt
-- eine eigene Adresse — das "endpoint". Wir speichern sie, damit der Server
-- dieses Gerät später anpiepen kann. Ein Betrieb kann beliebig viele Geräte
-- anmelden; jedes Gerät steht genau einmal in der Tabelle.

create table if not exists push_geraete (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete cascade,
  user_id      uuid,                   -- wer das Gerät angemeldet hat
  endpoint     text not null unique,   -- Adresse des Geräts beim Browser-Hersteller
  p256dh       text not null,          -- Schlüssel zur Verschlüsselung
  auth         text not null,          -- zweiter Schlüsselteil
  geraet       text,                   -- Klartext, damit der Betreiber es erkennt
  fehler       integer default 0,      -- wie oft der Versand scheiterte
  angelegt_am  timestamptz not null default now(),
  zuletzt_am   timestamptz
);

create index if not exists push_geraete_tenant on push_geraete (tenant_id);

alter table push_geraete enable row level security;

-- Kein öffentlicher Zugriff: nur der Server (Service-Rolle) liest und schreibt hier.
-- Die Adressen sind Zugangsdaten — wer sie hat, kann dem Gerät Nachrichten senden.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'push_geraete') then
    create policy push_geraete_kein_anon on push_geraete for all using (false);
  end if;
end $$;
