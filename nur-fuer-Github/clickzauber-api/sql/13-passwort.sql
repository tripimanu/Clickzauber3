-- clickzauber SQL 13 — Anmeldung mit Passwort statt Code.
-- Nach 09-sessions.sql ausführen. Bestehende Konten bleiben unangetastet:
-- Wer noch kein Passwort hat, vergibt beim ersten Anmelden eines.

alter table users add column if not exists password_hash text;

-- Links aus E-Mails: Adresse bestätigen und Passwort neu setzen.
create table if not exists email_tokens (
  id          bigint generated always as identity primary key,
  email       text not null,
  token       text unique not null,
  zweck       text not null,             -- 'bestaetigen' | 'passwort'
  used        boolean default false,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);
create index if not exists email_tokens_token_idx on email_tokens(token);
create index if not exists email_tokens_email_idx on email_tokens(email, created_at desc);

-- Abgelaufene Links haben keinen Zweck mehr und enthalten E-Mail-Adressen.
delete from email_tokens where expires_at < now() - interval '7 days';
