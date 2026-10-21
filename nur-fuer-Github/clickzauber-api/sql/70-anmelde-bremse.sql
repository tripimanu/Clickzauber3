-- clickzauber: Bremse gegen Passwort-Raten (15.10.2026). Nach 69-mails-aus.sql ausführen.
-- Jeder Fehlversuch beim Anmelden (falsches Passwort oder unbekannte Adresse) wird hier kurz festgehalten.
-- lib/auth/anmelden.js zählt die Versuche der letzten 15 Minuten je Adresse und je IP-Adresse.
-- Nie das Passwort. Der Nachtlauf (api/nacht.js) löscht alles, was älter als einen Tag ist.
create table if not exists anmelde_versuche (
  id     bigserial primary key,
  email  text not null,
  ip     text,
  am     timestamptz not null default now()
);
create index if not exists anmelde_versuche_email_idx on anmelde_versuche (email, am);
create index if not exists anmelde_versuche_ip_idx on anmelde_versuche (ip, am);
alter table anmelde_versuche enable row level security;
