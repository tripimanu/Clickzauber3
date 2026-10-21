-- clickzauber: gemeinsame Bremse gegen Massenanfragen (15.10.2026). Nach 70-anmelde-bremse.sql ausführen.
-- Jeder gebremste Aufruf (Formular absenden, Registrieren, Passwort vergessen, Demo, Feedback …) schreibt eine Zeile.
-- lib/_lib.js gebremst() zählt die Zeilen eines Schlüssels im Zeitfenster. Gezählt wird hier, nicht im Speicher,
-- weil Vercel viele Server-Instanzen startet und jede sonst nur ihre eigenen Aufrufe sähe.
-- Der Schlüssel enthält die Art und eine IP-Adresse, E-Mail-Adresse oder einen Code. Der Nachtlauf löscht nach einem Tag.
create table if not exists bremse (
  id          bigserial primary key,
  schluessel  text not null,
  am          timestamptz not null default now()
);
create index if not exists bremse_schluessel_idx on bremse (schluessel, am);
alter table bremse enable row level security;
