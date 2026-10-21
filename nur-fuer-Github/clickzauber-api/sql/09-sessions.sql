-- clickzauber 09: Sitzungen. Ein Nutzer, mehrere Geräte.
-- Vorher lag genau ein Token in users.token — die Anmeldung am zweiten Gerät
-- hat das erste unbemerkt abgemeldet. Diese Tabelle behebt das.
-- Nach 03-auth-billing.sql ausführen.

create table if not exists sessions (
  token       text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  geraet      text,                                   -- „iPhone · Safari“, nur zur Anzeige
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists sessions_user_idx on sessions(user_id, last_seen desc);

-- Bestehende Einzel-Token übernehmen, damit niemand beim Umstieg rausfliegt.
insert into sessions (token, user_id, geraet)
select token, id, 'übernommen' from users
where token is not null and token <> ''
on conflict (token) do nothing;

alter table sessions enable row level security;
