// GET /api/nacht          → von Vercel Cron einmal täglich aufgerufen (Bearer CRON_SECRET)
// GET /api/nacht?key=…    → manuell zum Prüfen (CRON_KEY)
// GET /api/nacht?nur=termine&key=… → stündlich: nur Erinnerungen an offene Termine
// Ein einziger Cron für alle Nachtaufgaben. Der Hobby-Tarif von Vercel erlaubt nur
// zwei Cron-Einträge und nur tägliche Zeitpläne — deshalb laufen sie hier hintereinander.
// Ein Fehler in einer Aufgabe stoppt die übrigen nicht.
import { cors, db, MAIL_KEY, MAIL_FROM, MAIL_TO } from '../lib/_lib.js';
import { terminePflege } from '../lib/_termin-pflege.js';
import nachfassen, { nachfassenLauf } from '../lib/nachfassen.js';
import kalenderSync from '../lib/kalender-sync.js';
import loeschfrist from '../lib/loeschfrist.js';
import bewertung from '../lib/bewertung.js';
import monatsbericht from '../lib/monatsbericht.js';
import kostenlos from '../lib/kostenlos.js';
import mahnung from '../lib/mahnung.js';
import wochenbericht from '../lib/wochenbericht.js';
import { alleAktualisieren } from '../lib/_vertrauen.js';
import { alleNachziehen } from '../lib/_kalender-direkt.js';
import { aboPruefen } from '../lib/_kalender-lesen.js';
import { demoZugaengePflege, betreiberPush } from '../lib/demo-zugang.js';
import { historiePflege } from '../lib/_historie.js';
import { papierkorbPflege } from '../lib/widget-loeschen.js';
import { vertriebTerminePflege } from '../lib/vertrieb-termin.js';
import { testPflege } from '../lib/einladung.js';

function shim() {
  const r = { _code: 0, _body: null };
  r.setHeader = () => r;
  r.status = (c) => { r._code = c; return r; };
  r.json = (b) => { r._body = b; return r; };
  r.send = (b) => { r._body = b; return r; };
  r.end = () => r;
  return r;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const geheim = process.env.CRON_SECRET || process.env.CRON_KEY || '';
  const bearer = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  const frage = req.query?.key || '';
  if (!geheim || (bearer !== geheim && frage !== geheim)) {
    return res.status(401).json({ error: 'kein Zugriff' });
  }

  // Stündlich (GitHub Actions, .github/workflows/erinnern.yml): an offene Termine erinnern,
  // dazu Wiedervorlagen und Nachfassen (lib/nachfassen.js, sql/57).
  // Vercel Hobby erlaubt nur tägliche Crons, deshalb kommt der stündliche Aufruf von außen.
  if (req.query?.nur === 'termine') {
    try {
      const stuendlich = await terminePflege({ stuendlich: true });
      const nf = await nachfassenLauf().catch((e) => ({ error: String((e && e.message) || e) }));
      // Termin-Links für Interessenten (sql/64): ab 17 Uhr an morgige Gespräche erinnern.
      const vt = await vertriebTerminePflege({ stuendlich: true }).catch((e) => ({ error: String((e && e.message) || e) }));
      // Fehler als 500 melden: Dann schlägt der Lauf in GitHub Actions fehl, und GitHub schickt eine Mail.
      const teilFehler = !!((nf && nf.error) || (vt && vt.error));
      return res.status(teilFehler ? 500 : 200).json({ ok: !teilFehler, stuendlich, nachfassen: nf, vertrieb_termine: vt });
    }
    catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }
  }

  // Die Unteraufgaben prüfen selbst gegen CRON_KEY — Wert direkt mitgeben.
  const key = process.env.CRON_KEY || geheim;
  const jetzt = new Date();

  const aufgaben = [
    ['nachfassen', nachfassen],
    ['kalender-sync', kalenderSync],
    ['loeschfrist', loeschfrist],
    ['bewertung', bewertung],
    ['kostenlos', kostenlos],
    ['mahnung', mahnung],
    // Profilbesuche im Netzwerk (sql/41) nur 30 Tage aufheben.
    ['netz-besuche', async (rq, r) => {
      const grenze = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      const { error } = await db.from('netz_besuch').delete().lt('tag', grenze);
      r.status(error ? 500 : 200).json({ ok: !error });
    }],
    // Feedback aus der Demo (sql/54) nach 12 Monaten löschen.
    ['demo-feedback', async (rq, r) => {
      const grenze = new Date(Date.now() - 365 * 864e5).toISOString();
      const { error } = await db.from('demo_feedback').delete().lt('created_at', grenze);
      r.status(error ? 500 : 200).json({ ok: !error, fehler: error ? error.message : undefined });
    }],
    // Fehlversuche beim Anmelden (sql/70) und Bremse (sql/71) nach einem Tag löschen. Gebraucht wird höchstens die letzte Stunde.
    ['anmelde-versuche', async (rq, r) => {
      const grenze = new Date(Date.now() - 864e5).toISOString();
      const { error } = await db.from('anmelde_versuche').delete().lt('am', grenze);
      r.status(error ? 500 : 200).json({ ok: !error, fehler: error ? error.message : undefined });
    }],
    ['bremse', async (rq, r) => {
      const grenze = new Date(Date.now() - 864e5).toISOString();
      const { error } = await db.from('bremse').delete().lt('am', grenze);
      r.status(error ? 500 : 200).json({ ok: !error, fehler: error ? error.message : undefined });
    }],
    // Vertrauenspunkte und Rangliste (sql/44): auch Betriebe, die das Cockpit länger nicht öffnen.
    // Dazu: Monatssieger am 1., Aufstiegs-Nachrichten, Rabatt bei Stripe (sql/45).
    // Echtzeit-Kalender (sql/48): einmal täglich alles vollständig abgleichen, falls tagsüber etwas hängen blieb.
    ['kalender-direkt', async (rq, r) => { const e = await alleNachziehen(); r.status(200).json({ ok: true, ...e }); }],
    // Kalender-Abo seit 3 Tagen nicht abgeholt: einmal Push und Mail (sql/58).
    ['kalender-abo', async (rq, r) => { const e = await aboPruefen(); r.status(200).json({ ok: true, ...e }); }],
    ['vertrauen', async (rq, r) => { const e = await alleAktualisieren(); r.status(200).json({ ok: true, ...e }); }],
    // Termine (sql/50): Abgelaufenes aufräumen, an offene Antworten und nicht informierte Kunden erinnern.
    ['termine-pflege', async (rq, r) => { const e = await terminePflege({ stuendlich: false }); r.status(200).json({ ok: true, ...e }); }],
    // Demo-Zugänge (sql/55): Mail einen Tag vor Ablauf, 30 Tage nach Ablauf löschen (mit allen Klicks).
    ['demo-zugaenge', async (rq, r) => { const e = await demoZugaengePflege(); r.status(200).json({ ok: true, ...e }); }],
    // Historie (seit 05.10.2026): vergangene Kunden nach 30 Tagen löschen, sieben Tage vorher Bescheid geben.
    ['historie', async (rq, r) => { const e = await historiePflege(); r.status(200).json({ ok: true, ...e }); }],
    // Termin-Links für Interessenten (sql/64): an morgige Gespräche erinnern, nach 12 Monaten löschen.
    ['vertrieb-termine', async (rq, r) => { const e = await vertriebTerminePflege({ stuendlich: false }); r.status(200).json({ ok: true, ...e }); }],
    // Testzugänge aus dem Einladungs-Link (sql/67): zwei Tage vor Ende Push und Mail an den Betreiber.
    ['test-ende', async (rq, r) => { const e = await testPflege(); r.status(200).json({ ok: true, ...e }); }],
    // Papierkorb (sql/74): Formulare, die länger als 30 Tage gelöscht sind, endgültig weg (mit Anfragen und Terminen).
    ['papierkorb', async (rq, r) => { const e = await papierkorbPflege(); r.status(e.ok ? 200 : 500).json(e); }],
  ];
  // Montags (Berliner Zeit) der Wochenbericht an den Betreiber.
  if (new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Europe/Berlin' }) === 'Mon') aufgaben.push(['wochenbericht', wochenbericht]);
  if (jetzt.getUTCDate() === 1) aufgaben.push(['monatsbericht', monatsbericht]);

  const ergebnis = {};
  for (const [name, fn] of aufgaben) {
    const r = shim();
    try {
      await fn({ method: 'GET', query: { key }, headers: {} }, r);
      ergebnis[name] = Object.assign(
        { code: r._code },
        r._body && typeof r._body === 'object' ? r._body : {}
      );
    } catch (e) {
      ergebnis[name] = { code: 500, error: String((e && e.message) || e) };
    }
  }

  // Seit 15.10.2026: Scheitert eine Aufgabe, steht das nicht mehr nur in der Antwort (die liest niemand), sondern
  // kommt als Push und Mail beim Betreiber an. Vorher meldete der Nachtlauf immer „ok“, auch wenn z. B. die Löschfrist scheiterte.
  const gescheitert = Object.entries(ergebnis).filter(([, e]) => e.code >= 400 || e.ok === false);
  if (gescheitert.length) {
    const zeilen = gescheitert.map(([n, e]) => n + ': ' + (e.error || (Array.isArray(e.fehler) ? e.fehler.join(' | ') : '') || 'Fehler ' + e.code));
    await betreiberPush('Nachtlauf: ' + gescheitert.length + ' Aufgabe(n) gescheitert', gescheitert.map(([n]) => n).join(', '), 'clickzauber-plattform.html');
    await fehlerMail(zeilen, jetzt).catch(() => null);
  }
  return res.status(gescheitert.length ? 500 : 200).json({ ok: !gescheitert.length, lauf: jetzt.toISOString(), gescheitert: gescheitert.map(([n]) => n), ergebnis });
}

async function fehlerMail(zeilen, jetzt) {
  if (!MAIL_KEY) return;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: MAIL_FROM, to: [MAIL_TO], subject: 'clickzauber Nachtlauf: Aufgaben gescheitert',
      html: '<p>Im Nachtlauf vom ' + jetzt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + ' sind diese Aufgaben gescheitert:</p><ul>'
        + zeilen.map((z) => '<li>' + esc(z) + '</li>').join('') + '</ul><p>Die übrigen Aufgaben sind gelaufen. Bitte im Chat mit Claude nachsehen lassen.</p>'
    })
  });
}
