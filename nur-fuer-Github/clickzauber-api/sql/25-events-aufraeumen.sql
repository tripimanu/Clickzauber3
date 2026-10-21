-- 25 — Statistikdaten aufräumen: Klickspuren nach 13 Monaten löschen.
-- In Supabase → SQL Editor ausführen. Idempotent.
--
-- WAS HIER GELÖSCHT WIRD
-- Nur die Tabelle `events` — eine Zeile je Klick im Formular. Darin stehen
-- Schrittnummer, die Beschriftung des gedrückten Antwort-Knopfes, eine
-- zufällige Sitzungsnummer und der Zeitstempel. Keine Namen, keine
-- E-Mail-Adressen, kein Freitext.
--
-- WAS HIER NICHT GELÖSCHT WIRD
-- Die Anfragen (`leads`). Die haben ihre eigene, vom Betrieb selbst gesetzte
-- Frist — siehe lib/loeschfrist.js. Diese Datei fasst sie nicht an.
--
-- WARUM 13 MONATE
-- Der längste Zeitraum im Cockpit ist „Jahr" = 365 Tage. 395 Tage lassen einen
-- Monat Luft, damit jede Auswertung vollständig bleibt. Der Betreiber merkt
-- von der Aufräumung nichts.

-- Für die Suche nach altem Datum braucht es einen Index auf ts allein.
-- Die vorhandenen Indizes beginnen mit widget_id bzw. tenant_id und helfen
-- hier nicht: ohne diesen Index läse Postgres die ganze Tabelle.
create index if not exists events_ts_idx on events (ts);

-- Stapelweises Löschen. Ein einzelnes DELETE über Millionen Zeilen läuft in
-- die Zeitgrenze der Serverless-Funktion; in Stapeln von 50.000 bleibt jeder
-- Schritt kurz. Die Obergrenze von 500.000 je Nacht verhindert, dass der
-- allererste Lauf zu lange dauert — der Rest folgt in den nächsten Nächten.
create or replace function events_aufraeumen(
  maxtage integer default 395,
  stapel  integer default 50000,
  obergrenze integer default 500000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  weg integer := 0;
  n   integer;
begin
  loop
    delete from events
     where ctid in (
       select ctid from events
        where ts < now() - (maxtage || ' days')::interval
        limit stapel
     );
    get diagnostics n = row_count;
    weg := weg + n;
    exit when n = 0 or weg >= obergrenze;
  end loop;
  return weg;
end;
$$;

-- Nur der Server (Service-Rolle) darf das aufrufen, nicht der offene Zugang.
revoke all on function events_aufraeumen(integer, integer, integer) from public, anon, authenticated;
