-- 12 — Cockpit-Ausbau: Vorlagen, Leistungen, Team, Monatsbericht, Bewertung, Widget-Vergleich.
-- In Supabase → SQL Editor ausführen. Idempotent, kann mehrfach laufen.

-- ── Antwort-Vorlagen ────────────────────────────────────────────────────
-- Textbausteine für Zusage, Absage, Nachfrage. Platzhalter in doppelten
-- geschweiften Klammern werden beim Einsetzen ersetzt: {{vorname}}, {{termin}}, {{summe}}.
create table if not exists vorlagen (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  art         text not null default 'antwort',   -- zusage | absage | nachfrage | antwort
  titel       text not null,
  text        text not null,
  sortierung  integer default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists vorlagen_tenant_idx on vorlagen (tenant_id, sortierung, created_at);
alter table vorlagen enable row level security;

-- ── Preise & Leistungen ─────────────────────────────────────────────────
-- Was der Betrieb anbietet. Speist Angebote und den Richtwert im Widget.
create table if not exists leistungen (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  beschreibung text,
  preis        numeric(10,2),
  einheit      text default 'pauschal',          -- pauschal | pro_person | pro_stunde | pro_tag
  aktiv        boolean default true,
  sortierung   integer default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists leistungen_tenant_idx on leistungen (tenant_id, sortierung, created_at);
alter table leistungen enable row level security;

-- ── Team-Zugänge ────────────────────────────────────────────────────────
-- Drei Rollen: inhaber (alles) · mitarbeiter (bearbeiten, exportieren)
-- · empfang (nur lesen, kein Export).
create table if not exists team (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  email          text not null,
  name           text,
  rolle          text not null default 'mitarbeiter',
  eingeladen_am  timestamptz not null default now(),
  eingeladen_von text,
  aktiv_am       timestamptz,                     -- erste eigene Anmeldung
  unique (tenant_id, email)
);
create index if not exists team_mail_idx on team (lower(email));
alter table team enable row level security;

-- ── Widget-Vergleich (zwei Fragevarianten parallel) ─────────────────────
-- Beide Varianten sind eigene Widgets mit eigenem slug. Die Gruppe hält sie
-- zusammen; w.js verteilt die Besucher hälftig und merkt sich die Wahl.
create table if not exists widget_vergleich (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  slug_a      text not null,
  slug_b      text not null,
  laeuft      boolean default true,
  gestartet   timestamptz not null default now(),
  beendet     timestamptz,
  gewinner    text,
  unique (tenant_id, name)
);
create index if not exists vergleich_slug_idx on widget_vergleich (slug_a, slug_b);
alter table widget_vergleich enable row level security;

-- ── Neue Einstellungen ──────────────────────────────────────────────────
alter table einstellungen add column if not exists monatsbericht     boolean default true;
alter table einstellungen add column if not exists monatsbericht_an  text;
alter table einstellungen add column if not exists bewertung_aktiv   boolean default false;
alter table einstellungen add column if not exists bewertung_url     text;
alter table einstellungen add column if not exists bewertung_tage    integer default 7;
alter table einstellungen add column if not exists bewertung_text    text;

-- ── Bewertungsanfrage: einmal pro Anfrage ───────────────────────────────
alter table leads add column if not exists bewertung_gesendet_at timestamptz;
create index if not exists leads_bewertung_idx on leads (termin) where bewertung_gesendet_at is null;

-- ── Startvorlagen für neue Betriebe ─────────────────────────────────────
-- Legt für jeden Betrieb ohne eigene Vorlagen drei brauchbare an.
insert into vorlagen (tenant_id, art, titel, text, sortierung)
select t.id, v.art, v.titel, v.text, v.sortierung
from tenants t
cross join (values
  ('zusage', 'Zusage mit Angebot',
   E'Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage. Der {{termin}} ist bei uns noch frei — wir würden Ihre Feier gern übernehmen.\n\nNach Ihren Angaben liegen wir bei etwa {{summe}}. Das Angebot mit allen Posten habe ich Ihnen beigelegt; es gilt zwei Wochen.\n\nWenn Sie mögen, zeige ich Ihnen die Räume vorab. Rufen Sie einfach an.\n\nHerzliche Grüße\n{{ansprechpartner}}', 1),
  ('nachfrage', 'Rückfrage vor dem Angebot',
   E'Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage zum {{termin}}. Damit ich Ihnen ein belastbares Angebot machen kann, fehlt mir noch eine Angabe:\n\n— \n\nSchreiben Sie mir einfach kurz zurück, dann haben Sie das Angebot am selben Tag.\n\nHerzliche Grüße\n{{ansprechpartner}}', 2),
  ('absage', 'Freundliche Absage',
   E'Guten Tag {{vorname}},\n\nvielen Dank, dass Sie an uns gedacht haben. Für den {{termin}} sind wir leider schon vergeben.\n\nFalls Sie zeitlich beweglich sind: In der Woche davor und danach haben wir noch Termine frei. Sagen Sie Bescheid, dann halte ich einen für Sie zurück.\n\nHerzliche Grüße\n{{ansprechpartner}}', 3)
) as v(art, titel, text, sortierung)
where not exists (select 1 from vorlagen w where w.tenant_id = t.id);
