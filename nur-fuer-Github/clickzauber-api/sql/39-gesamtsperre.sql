-- Gesamtsperre: Konto kann sich nicht mehr anmelden, Widget ist aus. Notiz des Betreibers je Kunde.
alter table users add column if not exists komplett_gesperrt boolean not null default false;
alter table users add column if not exists admin_notiz text;
