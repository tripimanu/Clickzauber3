-- 29: Doppelbuchung ganzer Tage ausschließen
-- Zwei Personen im Cockpit planen gleichzeitig denselben Raum am selben Tag ein:
-- vorher gewannen beide. Jetzt lässt die Datenbank je Formular, Tag und Raum
-- nur einen Eintrag zu. Der zweite Klick bekommt „schon vergeben“.
create table if not exists tages_buchung (
  widget_id  text not null,
  datum      date not null,
  raum       text not null default 'Hauptraum',
  lead       text,
  created_at timestamptz not null default now(),
  primary key (widget_id, datum, raum)
);
alter table tages_buchung enable row level security;
