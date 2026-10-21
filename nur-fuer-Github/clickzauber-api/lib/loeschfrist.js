// GET /api/loeschfrist?key=…  — Cron, täglich. Zwei getrennte Aufgaben:
//   1. Anfragen löschen, deren Aufbewahrungsfrist abgelaufen ist — die Frist
//      legt jeder Betrieb selbst fest (Voreinstellung 24 Monate).
//   2. Klickspuren löschen, die älter als 13 Monate sind — feste Frist für alle.
// Setzt Art. 5 Abs. 1 lit. e DSGVO um (Speicherbegrenzung).
import { db, cors } from './_lib.js';
import { beratungsFotosWeg } from './_fotos.js';

// 395 Tage = 13 Monate. Das Cockpit zeigt höchstens 365 Tage; ein Monat Puffer
// sorgt dafür, dass die Jahresansicht immer vollständig bleibt.
const EVENTS_TAGE = 395;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if ((req.query.key || '') !== process.env.CRON_KEY) return res.status(401).json({ error: 'kein Zugriff' });

  // Seit 15.10.2026: alle Einstellungen lesen, auch „Nie löschen“ (0). Vorher fiel 0 aus der Abfrage heraus und bekam
  // still den Standard von 24 Monaten, die Anfragen wurden also doch gelöscht. Und: Lässt sich eine der beiden Listen
  // nicht lesen, wird nichts gelöscht. Sonst bekäme jeder Betrieb den Standard, auch wer länger aufbewahren will.
  const { data: fristen, error: fe } = await db
    .from('einstellungen')
    .select('tenant_id, loeschfrist_monate')
    .limit(5000);
  if (fe) return res.status(500).json({ ok: false, error: 'Fristen nicht lesbar, nichts gelöscht: ' + fe.message });

  // Ohne eigene Einstellung gilt der Standard von 24 Monaten.
  const { data: alle, error: te } = await db.from('tenants').select('id').limit(5000);
  if (te) return res.status(500).json({ ok: false, error: 'Betriebe nicht lesbar, nichts gelöscht: ' + te.message });
  const gesetzt = new Map((fristen || []).filter((f) => f.loeschfrist_monate != null).map((f) => [f.tenant_id, +f.loeschfrist_monate]));
  const aufgaben = (alle || []).map((t) => ({ tenant: t.id, monate: gesetzt.has(t.id) ? gesetzt.get(t.id) : 24 }));

  let geloescht = 0, betroffen = 0;
  const fehler = [];
  for (const a of aufgaben) {
    if (!a.monate) continue;   // 0 = „Nie löschen“
    const grenze = new Date();
    grenze.setMonth(grenze.getMonth() - a.monate);

    const slugs = await slugsVon(db, a.tenant);
    await beratungsFotosWeg((q) => q.eq('tenant_id', a.tenant).lt('ts', grenze.toISOString()));
    const [eigen, alt] = await Promise.all([
      db.from('leads').delete().eq('tenant_id', a.tenant).lt('ts', grenze.toISOString()).select('id'),
      slugs.length
        ? db.from('leads').delete().is('tenant_id', null).in('widget_id', slugs).lt('ts', grenze.toISOString()).select('id')
        : Promise.resolve({ data: [] })
    ]);
    if (eigen.error || alt.error) fehler.push(a.tenant + ': Anfragen: ' + (eigen.error || alt.error).message);

    // Uhrzeit-Termine: nach derselben Frist, gerechnet ab dem Termin selbst.
    let nt = 0;
    try {
      const { data: tt, error: tf } = await db.from('termine').delete().eq('tenant_id', a.tenant).lt('ende', grenze.toISOString()).select('id');
      if (tf) fehler.push(a.tenant + ': Termine: ' + tf.message);
      nt = (tt || []).length;
    } catch (e) { fehler.push(a.tenant + ': Termine: ' + String((e && e.message) || e)); }

    const n = (eigen.data || []).length + (alt.data || []).length + nt;
    if (!n) continue;
    geloescht += n;
    betroffen++;
    await db.from('protokoll').insert({
      tenant_id: a.tenant, was: 'frist_gelaufen', anzahl: n,
      hinweis: 'Aufbewahrungsfrist ' + a.monate + ' Monate abgelaufen'
    });
  }

  // ── Moderation: Meldungen und blockierte Inhalte nach 12 Monaten löschen ──
  try {
    const jahr = new Date(Date.now() - 365 * 864e5).toISOString();
    await db.from('netz_moderation').delete().lt('created_at', jahr);
    await db.from('netz_meldung').delete().lt('created_at', jahr);
  } catch (e) { /* Tabelle fehlt noch */ }

  // ── Warteliste: Einträge für vergangene Tage braucht niemand mehr ──
  try {
    await db.from('warteliste').delete().lt('datum', new Date(Date.now() - 86400e3).toISOString().slice(0, 10));
  } catch (e) { /* Tabelle fehlt noch */ }

  // ── Klickspuren aufräumen ───────────────────────────────────
  // Betrifft nur die Tabelle `events`: Schritt, gedrückter Antwort-Knopf,
  // Sitzungsnummer, Zeitstempel. Keine Namen, keine Adressen. Ohne diese
  // Aufräumung wächst die Tabelle unbegrenzt — sie ist die mit Abstand
  // größte im System, weil jeder einzelne Klick eine Zeile schreibt.
  //
  // Die Arbeit macht eine Datenbankfunktion (sql/25-events-aufraeumen.sql),
  // weil Löschen in Stapeln dort hingehört und nicht in eine Web-Funktion mit
  // Zeitgrenze. Fehlt die Funktion noch, läuft alles übrige trotzdem durch.
  let spuren = null;
  try {
    const { data, error } = await db.rpc('events_aufraeumen', { maxtage: EVENTS_TAGE });
    spuren = error ? { fehler: error.message } : { geloescht: data || 0, tage: EVENTS_TAGE };
  } catch (e) {
    spuren = { fehler: String((e && e.message) || e) };
  }

  if (fehler.length) return res.status(500).json({ ok: false, betriebe: betroffen, geloescht, spuren, fehler: fehler.slice(0, 20) });
  return res.status(200).json({ ok: true, betriebe: betroffen, geloescht, spuren });
}

/* Anfragen können älter sein als das tenant_id-Feld. Deshalb beide Wege:
   über den Betrieb UND über dessen Widget-Kennungen. */
async function slugsVon(db, tenantId) {
  const { data } = await db.from('widgets').select('slug').eq('tenant_id', tenantId);
  return (data || []).map((w) => w.slug);
}
