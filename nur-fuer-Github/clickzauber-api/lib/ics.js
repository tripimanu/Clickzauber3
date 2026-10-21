// GET /api/ics?t=BETRIEB&k=SCHLÜSSEL  → Termin-Feed des ganzen Kontos zum Abonnieren
// GET /api/ics?w=FORMULAR&k=SCHLÜSSEL → ältere Adressen, liefern jetzt ebenfalls das ganze Konto
//
// Der Betreiber trägt die Adresse EINMAL in Apple Kalender, Google Kalender oder
// Outlook ein. Danach erscheinen alle Termine aus ALLEN Formularen des Kontos von
// selbst dort: fest eingeplante Tage (Hochzeit, Catering …) und Uhrzeit-Termine
// (Friseur & Co.), auch neue Terminwünsche, solange sie offen sind.
// Neue Formulare brauchen keine neue Verbindung.
//
// Bis der Betreiber im Cockpit bestätigt, steht ein Probe-Termin im Feed. Jeder
// Abruf wird vermerkt: so sieht das Cockpit, dass der Kalender verbunden ist.
import { db } from './_lib.js';

const BER = 'Europe/Berlin';

export default async function handler(req, res) {
  const key = String(req.query.k || '');
  let tid = String(req.query.t || '');
  const slug = String(req.query.w || req.query.widget || '');
  if ((!tid && !slug) || key.length < 20) return text(res, 400, 'Kennung oder Schlüssel fehlt.');

  let ein = null;
  if (tid) {
    const { data } = await db.from('einstellungen').select('tenant_id, kal_abo_key, kal_abo_bestaetigt_am, kal_abo_abruf_am').eq('tenant_id', tid).maybeSingle();
    if (!data || data.kal_abo_key !== key) return text(res, 403, 'Schlüssel stimmt nicht.');
    ein = data;
  } else {
    // Alte Adresse je Formular: Schlüssel des Formulars oder des Kontos gilt.
    const { data: w } = await db.from('widgets').select('tenant_id, belegung').eq('slug', slug).maybeSingle();
    if (!w || !w.tenant_id) return text(res, 404, 'Unbekannt.');
    tid = w.tenant_id;
    const { data } = await db.from('einstellungen').select('tenant_id, kal_abo_key, kal_abo_bestaetigt_am, kal_abo_abruf_am').eq('tenant_id', tid).maybeSingle().then((r) => r, () => ({}));
    ein = data || null;
    const wKey = w.belegung && w.belegung.abo_key;
    if (key !== wKey && !(ein && ein.kal_abo_key === key)) return text(res, 403, 'Schlüssel stimmt nicht.');
  }

  // Abruf vermerken (höchstens alle zehn Minuten ein Schreibzugriff).
  if (ein && (!ein.kal_abo_abruf_am || Date.now() - Date.parse(ein.kal_abo_abruf_am) > 600e3)) {
    await db.from('einstellungen').update({ kal_abo_abruf_am: new Date().toISOString() }).eq('tenant_id', tid).then(() => {}, () => {});
  }

  const [{ data: t }, { data: ws }, { data: tm }] = await Promise.all([
    db.from('tenants').select('name').eq('id', tid).maybeSingle(),
    db.from('widgets').select('slug, name, belegung').eq('tenant_id', tid),
    db.from('termine').select('id, start, ende, status, name, telefon, email, leistung, personal_name, nachricht, widget_id')
      .eq('tenant_id', tid).in('status', ['wunsch', 'vorschlag', 'fest', 'abgesagt'])
      .gte('start', new Date(Date.now() - 60 * 864e5).toISOString()).order('start').limit(3000)
      .then((r) => r, () => ({ data: [] }))
  ]);
  const betrieb = (t && t.name && !/@/.test(t.name)) ? t.name : 'clickzauber';
  const jetzt = stempel(new Date());
  const zeilen = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//clickzauber//Termine//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc('clickzauber · ' + betrieb), 'X-WR-TIMEZONE:' + BER,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M'
  ];

  // Probe-Termin: bleibt, bis der Betreiber im Cockpit „Ist da“ tippt.
  if (!(ein && ein.kal_abo_bestaetigt_am)) {
    const heute = new Date().toLocaleDateString('sv-SE', { timeZone: BER });
    zeilen.push('BEGIN:VEVENT', 'UID:cz-probe-' + tid + '@clickzauber.de', 'DTSTAMP:' + jetzt,
      'DTSTART;VALUE=DATE:' + heute.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + naechsterTag(heute),
      'SUMMARY:' + esc('✓ clickzauber ist verbunden'),
      'DESCRIPTION:' + esc('Dieser Probe-Termin zeigt: Ihr Kalender empfängt die Termine aus clickzauber. Tippen Sie im Cockpit unter Kalender auf „Ist da“. Danach verschwindet er.'),
      'TRANSP:TRANSPARENT', 'END:VEVENT');
  }

  // 1) Fest eingeplante Tage aus allen Formularen
  (ws || []).forEach((w) => {
    const bel = (w.belegung && typeof w.belegung === 'object') ? w.belegung : {};
    const buch = (bel.buchungen && typeof bel.buchungen === 'object') ? bel.buchungen : {};
    const mehrere = (ws || []).length > 1;
    Object.keys(buch).sort().forEach((tag) => {
      (buch[tag] || []).forEach((x, i) => {
        // Kennung über die Anfrage, nicht über die Reihenfolge: sonst rutschen Einträge, wenn ein früherer am selben Tag wegfällt.
        const teile = ['BEGIN:VEVENT', 'UID:cz-' + w.slug + '-' + tag + '-' + String(x.lead || i).replace(/[^\w-]/g, '') + '@clickzauber.de', 'DTSTAMP:' + jetzt];
        if (x.zeit) teile.push('DTSTART:' + utc(tag, x.zeit), 'DTEND:' + utc(tag, x.bis || plus(x.zeit, 4)));
        else teile.push('DTSTART;VALUE=DATE:' + tag.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + naechsterTag(tag));
        const titel = (x.storniert ? 'Abgesagt: ' : '') + (x.name || 'Kundentermin')
          + (x.raum && x.raum !== 'Hauptraum' ? ' · ' + x.raum : '') + (mehrere ? ' · ' + (w.name || w.slug) : '');
        teile.push('SUMMARY:' + esc(titel));
        const info = [];
        if (x.telefon) info.push('Telefon: ' + x.telefon);
        if (x.email) info.push('E-Mail: ' + x.email);
        if (x.wert) info.push('Auftragswert: ' + Number(x.wert).toLocaleString('de-DE') + ' EUR');
        if (x.notiz) info.push(x.notiz);
        info.push('Formular: ' + (w.name || w.slug), 'Eingeplant über clickzauber.');
        teile.push('DESCRIPTION:' + esc(info.join('\n')));
        if (x.raum && x.raum !== 'Hauptraum') teile.push('LOCATION:' + esc(x.raum));
        teile.push('STATUS:' + (x.storniert ? 'CANCELLED' : 'CONFIRMED'), 'END:VEVENT');
        zeilen.push(...teile);
      });
    });
  });

  // 2) Uhrzeit-Termine (Friseur, Nagelstudio, Kosmetik …)
  (tm || []).forEach((x) => {
    const vor = { wunsch: 'Anfrage: ', vorschlag: 'Vorschlag offen: ', abgesagt: 'Abgesagt: ' }[x.status] || '';
    const titel = vor + (x.name || 'Kunde') + (x.leistung ? ' · ' + x.leistung : '') + (x.personal_name ? ' · ' + x.personal_name : '');
    const info = [];
    if (x.status === 'wunsch') info.push('Noch nicht bestätigt. Im Cockpit annehmen oder ablehnen.');
    if (x.status === 'vorschlag') info.push('Sie haben eine andere Uhrzeit vorgeschlagen. Der Kunde hat noch nicht geantwortet.');
    if (x.telefon) info.push('Telefon: ' + x.telefon);
    if (x.email) info.push('E-Mail: ' + x.email);
    if (x.nachricht) info.push(x.nachricht);
    info.push('Über clickzauber.');
    zeilen.push('BEGIN:VEVENT', 'UID:cz-t-' + x.id + '@clickzauber.de', 'DTSTAMP:' + jetzt,
      'DTSTART:' + stempel(new Date(x.start)), 'DTEND:' + stempel(new Date(x.ende)),
      'SUMMARY:' + esc(titel), 'DESCRIPTION:' + esc(info.join('\n')),
      'STATUS:' + (x.status === 'fest' ? 'CONFIRMED' : x.status === 'abgesagt' ? 'CANCELLED' : 'TENTATIVE'), 'END:VEVENT');
  });

  zeilen.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="clickzauber.ics"');
  res.setHeader('Cache-Control', 'private, max-age=120');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(zeilen.map(falten).join('\r\n') + '\r\n');
}

function text(res, code, s) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(code).send(s);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
// iCalendar erlaubt höchstens 75 Oktetts je Zeile; längere werden umgebrochen (nach Bytes, wegen Umlauten).
function falten(zeile) {
  const enc = new TextEncoder();
  if (enc.encode(zeile).length <= 73) return zeile;
  const teile = []; let akt = '', n = 0;
  for (const ch of zeile) {
    const b = enc.encode(ch).length;
    if (n + b > 73) { teile.push(akt); akt = ''; n = 0; }
    akt += ch; n += b;
  }
  teile.push(akt);
  return teile.join('\r\n ');
}
function pad(n) { return String(n).padStart(2, '0'); }
function stempel(d) {
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
}
// Deutsche Ortszeit nach UTC (Sommerzeit: letzter Sonntag März bis letzter Sonntag Oktober, 01:00 UTC).
function utc(tag, zeit) {
  const [y, m, d] = tag.split('-').map(Number);
  const [hh, mm] = String(zeit).split(':').map(Number);
  const roh = Date.UTC(y, m - 1, d, hh, mm);
  return stempel(new Date(roh - (sommerzeit(y, roh) ? 2 : 1) * 3600e3));
}
function letzterSonntag(jahr, monat) {
  const d = new Date(Date.UTC(jahr, monat + 1, 0));
  return Date.UTC(jahr, monat, d.getUTCDate() - d.getUTCDay(), 1, 0);
}
function sommerzeit(jahr, ms) { return ms >= letzterSonntag(jahr, 2) && ms < letzterSonntag(jahr, 9); }
function plus(zeit, stunden) {
  const [hh, mm] = String(zeit).split(':').map(Number);
  return pad(Math.min(23, hh + stunden)) + ':' + pad(mm);
}
function naechsterTag(tag) {
  const [y, m, d] = tag.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + 1));
  return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate());
}
