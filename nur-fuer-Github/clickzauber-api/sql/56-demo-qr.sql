-- 56 — QR-Codes für Demos (lib/demo-zugang.js, Vertrieb-Seite, clickzauber-qr-druck.html).
-- Ein QR-Code ist eine feste Vorlage (clickzauber.de/q/1005) und ändert sich nie.
-- Jeder Scan legt einen eigenen Demo-Zugang an (7 Tage, eigener Verlauf, eigene Sperre).
-- Nummer der Demo: QR-Nummer und laufende Nummer, z. B. 1005-041 = die 41. Demo aus QR-Code 1005.
-- Scannt dasselbe Gerät noch einmal, geht die bisherige Demo weiter (qr_geraet), es wird nicht doppelt gezählt.
-- Nach sql/55 ausführen. Darf mehrmals laufen.

create sequence if not exists demo_qr_nr start 1001;

create table if not exists demo_qr (
  nr int primary key default nextval('demo_qr_nr'),
  notiz text,
  branche text not null default 'friseur',
  max_scans int,
  scans int not null default 0,
  erstellt_am timestamptz not null default now(),
  gesperrt_am timestamptz
);
alter table demo_qr enable row level security;

alter table demo_zugaenge add column if not exists qr_nr int references demo_qr(nr) on delete set null;
alter table demo_zugaenge add column if not exists qr_lfd int;
alter table demo_zugaenge add column if not exists qr_geraet text;
create unique index if not exists demo_zugaenge_qr on demo_zugaenge (qr_nr, qr_lfd) where qr_nr is not null;
create index if not exists demo_zugaenge_qr_geraet on demo_zugaenge (qr_nr, qr_geraet);

-- Zählt einen Scan, solange die Höchstzahl nicht erreicht ist. Gibt die laufende Nummer zurück, sonst nichts.
create or replace function demo_qr_zaehlen(p_nr int) returns int language sql as $$
  update demo_qr set scans = scans + 1
  where nr = p_nr and gesperrt_am is null and (max_scans is null or scans < max_scans)
  returning scans;
$$;
revoke execute on function demo_qr_zaehlen(int) from public, anon, authenticated;
