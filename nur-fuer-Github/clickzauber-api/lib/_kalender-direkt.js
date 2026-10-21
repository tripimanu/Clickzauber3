// Echtzeit-Kalender: clickzauber schreibt Termine selbst in den Kalender des Betriebs,
// statt zu warten, bis der Kalender die Abo-Adresse abholt (Apple: bis 15 Min., Google: bis 24 Std.).
//   google    → Google Kalender (OAuth, Hauptkalender)
//   microsoft → Outlook / Microsoft 365 (OAuth)
//   icloud    → Apple iCloud (CalDAV mit App-Passwort, eigener Kalender „clickzauber“)
// Ein einziger Abgleich für alles: kalenderNachziehen(tenant) vergleicht, was im Kalender
// stehen soll, mit dem, was clickzauber dort schon eingetragen hat, und schreibt nur Änderungen.
// Aufgerufen nach jeder Änderung an Terminen oder Buchungen und nachts als Sicherheitsnetz.
import { db, GEHEIM } from './_lib.js';
import { lokalText, plusTage, heuteBerlin } from './_termine.js';
import crypto from 'crypto';

const SCHL = crypto.createHash('sha256').update(GEHEIM).digest();
export function verschluesseln(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', SCHL, iv);
  const d = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), d].map((b) => b.toString('base64')).join('.');
}
export function entschluesseln(s) {
  try {
    const [iv, tag, d] = String(s).split('.').map((x) => Buffer.from(x, 'base64'));
    const c = crypto.createDecipheriv('aes-256-gcm', SCHL, iv); c.setAuthTag(tag);
    return JSON.parse(Buffer.concat([c.update(d), c.final()]).toString('utf8'));
  } catch { return null; }
}

export const GOOGLE_OK = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const MS_OK = !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
export const MS_SCOPE = 'offline_access Calendars.ReadWrite User.Read';
const TZ = 'Europe/Berlin';
const ICLOUD = 'https://caldav.icloud.com';
const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';

// ── Was soll im Kalender stehen? ─────────────────────────────────────
async function sollListe(tid) {
  const ab = new Date(Date.now() - 864e5).toISOString();
  const [{ data: tm }, { data: ws }] = await Promise.all([
    db.from('termine').select('id, lead_id, start, ende, status, name, telefon, email, leistung, personal_name, nachricht, hinweis')
      .eq('tenant_id', tid).in('status', ['wunsch', 'vorschlag', 'fest']).gte('ende', ab).order('start').limit(600)
      .then((r) => r, () => ({ data: [] })),
    db.from('widgets').select('slug, name, belegung').eq('tenant_id', tid)
  ]);
  const soll = [];
  (tm || []).forEach((x) => {
    const vor = { wunsch: 'Anfrage: ', vorschlag: 'Vorschlag offen: ' }[x.status] || '';
    const info = [];
    if (x.status === 'wunsch') info.push('Noch nicht bestätigt. Im Cockpit annehmen oder ablehnen.');
    if (x.status === 'vorschlag') info.push('Sie haben diese Zeit vorgeschlagen. Der Kunde hat noch nicht geantwortet.');
    if (x.hinweis) info.push(x.hinweis);
    if (x.telefon) info.push('Telefon: ' + x.telefon);
    if (x.email) info.push('E-Mail: ' + x.email);
    if (x.nachricht) info.push(x.nachricht);
    if (x.lead_id && x.status !== 'fest') info.push('Annehmen, ablehnen oder andere Zeit: ' + SITE + '/clickzauber-cockpit-live.html#anfrage-' + x.lead_id);
    info.push('Über clickzauber.');
    soll.push({ q: 't:' + x.id, titel: vor + (x.name || 'Kunde') + (x.leistung ? ' · ' + x.leistung : '') + (x.personal_name ? ' · ' + x.personal_name : ''),
      text: info.join('\n'), start: x.start, ende: x.ende, fest: x.status === 'fest' });
  });
  const heute = heuteBerlin(), mehrere = (ws || []).length > 1;
  (ws || []).forEach((w) => {
    const buch = (w.belegung && w.belegung.buchungen && typeof w.belegung.buchungen === 'object') ? w.belegung.buchungen : {};
    Object.keys(buch).forEach((tag) => {
      if (tag < plusTage(heute, -1)) return;
      (buch[tag] || []).forEach((x, i) => {
        if (!x || x.storniert) return;
        const info = [];
        if (x.telefon) info.push('Telefon: ' + x.telefon);
        if (x.email) info.push('E-Mail: ' + x.email);
        if (x.wert) info.push('Auftragswert: ' + Number(x.wert).toLocaleString('de-DE') + ' EUR');
        if (x.notiz) info.push(x.notiz);
        info.push('Formular: ' + (w.name || w.slug), 'Eingeplant über clickzauber.');
        soll.push({ q: 'b:' + w.slug + ':' + tag + ':' + (x.lead || i),
          titel: (x.name || 'Kundentermin') + (x.raum && x.raum !== 'Hauptraum' ? ' · ' + x.raum : '') + (mehrere ? ' · ' + (w.name || w.slug) : ''),
          text: info.join('\n'), tag, zeit: x.zeit || null, bis: x.bis || null, fest: true });
      });
    });
  });
  soll.forEach((e) => { e.h = crypto.createHash('sha1').update(JSON.stringify([e.titel, e.text, e.start, e.ende, e.tag, e.zeit, e.bis, e.fest])).digest('hex').slice(0, 16); });
  return soll;
}

// Beginn/Ende als Ortszeit (für Google und Outlook) und als UTC (für iCloud)
function zeiten(e) {
  if (e.start) {
    const a = lokalText(e.start), b = lokalText(e.ende);
    return { ganz: false, von: a.datum + 'T' + a.zeit + ':00', bis: b.datum + 'T' + b.zeit + ':00', vonUtc: new Date(e.start), bisUtc: new Date(e.ende) };
  }
  if (e.zeit) {
    const bis = e.bis || (String(Math.min(23, +e.zeit.slice(0, 2) + 4)).padStart(2, '0') + e.zeit.slice(2));
    return { ganz: false, von: e.tag + 'T' + e.zeit + ':00', bis: e.tag + 'T' + bis + ':00', ortVon: [e.tag, e.zeit], ortBis: [e.tag, bis] };
  }
  return { ganz: true, von: e.tag, bis: plusTage(e.tag, 1) };
}

// ── Anbieter ─────────────────────────────────────────────────────────
async function formPost(url, felder) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(felder).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Anmeldung beim Kalender abgelaufen (' + (j.error || r.status) + ')');
  return j;
}
async function zugriff(v, z) {
  if (v.art === 'icloud') return 'Basic ' + Buffer.from(z.appleid + ':' + z.passwort).toString('base64');
  if (z.access && z.ablauf && z.ablauf > Date.now() + 60e3) return 'Bearer ' + z.access;
  const j = v.art === 'google'
    ? await formPost('https://oauth2.googleapis.com/token', { client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: z.refresh, grant_type: 'refresh_token' })
    : await formPost('https://login.microsoftonline.com/common/oauth2/v2.0/token', { client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET, refresh_token: z.refresh, grant_type: 'refresh_token', scope: MS_SCOPE });
  z.access = j.access_token; z.ablauf = Date.now() + (+j.expires_in || 3000) * 1000;
  if (j.refresh_token) z.refresh = j.refresh_token;   // Microsoft tauscht ihn bei jedem Mal
  z.geaendert = true;
  return 'Bearer ' + z.access;
}

function googleEvent(e) {
  const t = zeiten(e);
  return { summary: e.titel, description: e.text, status: e.fest ? 'confirmed' : 'tentative',
    start: t.ganz ? { date: t.von } : { dateTime: t.von, timeZone: TZ }, end: t.ganz ? { date: t.bis } : { dateTime: t.bis, timeZone: TZ },
    extendedProperties: { private: { cz: e.q } }, source: { title: 'clickzauber', url: 'https://clickzauber.de' } };
}
function msEvent(e) {
  const t = zeiten(e);
  return { subject: e.titel, body: { contentType: 'text', content: e.text }, isAllDay: t.ganz, showAs: e.fest ? 'busy' : 'tentative',
    start: { dateTime: t.ganz ? t.von + 'T00:00:00' : t.von, timeZone: TZ }, end: { dateTime: t.ganz ? t.bis + 'T00:00:00' : t.bis, timeZone: TZ } };
}
const ie = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const st = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function icsEvent(e, uid) {
  const t = zeiten(e), z = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//clickzauber//Echtzeit//DE', 'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + st(new Date())];
  if (t.ganz) z.push('DTSTART;VALUE=DATE:' + t.von.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + t.bis.replace(/-/g, ''));
  else if (t.vonUtc) z.push('DTSTART:' + st(t.vonUtc), 'DTEND:' + st(t.bisUtc));
  else z.push('DTSTART;TZID=' + TZ + ':' + t.von.replace(/[-:]/g, ''), 'DTEND;TZID=' + TZ + ':' + t.bis.replace(/[-:]/g, ''));
  z.push('SUMMARY:' + ie(e.titel), 'DESCRIPTION:' + ie(e.text), 'STATUS:' + (e.fest ? 'CONFIRMED' : 'TENTATIVE'), 'END:VEVENT', 'END:VCALENDAR');
  return z.join('\r\n') + '\r\n';
}

async function anbieter(v, z, was, e, fremd) {
  const auth = await zugriff(v, z);
  const H = { Authorization: auth };
  if (v.art === 'google') {
    const basis = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(v.kalender_id || 'primary') + '/events';
    if (was === 'weg') { const r = await fetch(basis + '/' + encodeURIComponent(fremd), { method: 'DELETE', headers: H }); if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error('Google ' + r.status); return null; }
    if (was === 'neu') { const r = await fetch(basis, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(googleEvent(e)) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error('Google ' + r.status); return j.id; }
    const r = await fetch(basis + '/' + encodeURIComponent(fremd), { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(googleEvent(e)) });
    if (r.status === 404 || r.status === 410) return anbieter(v, z, 'neu', e);   // im Kalender von Hand gelöscht → neu anlegen
    if (!r.ok) throw new Error('Google ' + r.status); return fremd;
  }
  if (v.art === 'microsoft') {
    const basis = 'https://graph.microsoft.com/v1.0/me/events';
    if (was === 'weg') { const r = await fetch(basis + '/' + encodeURIComponent(fremd), { method: 'DELETE', headers: H }); if (!r.ok && r.status !== 404) throw new Error('Outlook ' + r.status); return null; }
    if (was === 'neu') { const r = await fetch(basis, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(msEvent(e)) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error('Outlook ' + r.status); return j.id; }
    const r = await fetch(basis + '/' + encodeURIComponent(fremd), { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(msEvent(e)) });
    if (r.status === 404) return anbieter(v, z, 'neu', e);
    if (!r.ok) throw new Error('Outlook ' + r.status); return fremd;
  }
  // iCloud: eine Datei je Termin im Kalender „clickzauber“
  const pfad = fremd || (v.kalender_id + 'cz-' + crypto.createHash('sha1').update(v.tenant_id + e.q).digest('hex').slice(0, 24) + '.ics');
  if (was === 'weg') { const r = await fetch(pfad, { method: 'DELETE', headers: H }); if (!r.ok && r.status !== 404) throw new Error('iCloud ' + r.status); return null; }
  const uid = pfad.split('/').pop().replace(/\.ics$/, '') + '@clickzauber.de';
  const r = await fetch(pfad, { method: 'PUT', headers: { ...H, 'Content-Type': 'text/calendar; charset=utf-8' }, body: icsEvent(e, uid) });
  if (!r.ok) throw new Error('iCloud ' + r.status);
  return pfad;
}

export { zugriff };

// ── iCloud einrichten: Kalender „clickzauber“ finden oder anlegen ────────
async function dav(url, methode, auth, body, tiefe) {
  const r = await fetch(url, { method: methode, headers: { Authorization: auth, 'Content-Type': 'application/xml; charset=utf-8', Depth: String(tiefe == null ? 0 : tiefe) }, body });
  return { code: r.status, text: await r.text().catch(() => '') };
}
const hrefIn = (xml, tag) => { const m = new RegExp('<[^>]*' + tag + '[^>]*>\\s*<[^>]*href[^>]*>([^<]+)<', 'i').exec(xml); return m ? m[1].trim() : null; };
export async function icloudEinrichten(appleid, passwort) {
  const auth = 'Basic ' + Buffer.from(appleid + ':' + passwort).toString('base64');
  const p1 = await dav(ICLOUD + '/', 'PROPFIND', auth, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>');
  if (p1.code === 401) return { fehler: 'Apple-ID oder App-Passwort stimmt nicht. Bitte ein App-Passwort verwenden, nicht das normale Passwort.' };
  const principal = hrefIn(p1.text, 'current-user-principal');
  if (!principal) return { fehler: 'iCloud hat nicht geantwortet. Bitte in einer Minute erneut versuchen.' };
  const p2 = await dav(new URL(principal, ICLOUD).href, 'PROPFIND', auth, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>');
  const home = hrefIn(p2.text, 'calendar-home-set');
  if (!home) return { fehler: 'Der iCloud-Kalender wurde nicht gefunden. Ist iCloud-Kalender auf dem iPhone eingeschaltet?' };
  const homeUrl = new URL(home, ICLOUD).href.replace(/\/?$/, '/');
  const ziel = homeUrl + 'clickzauber/';
  const mk = await dav(ziel, 'MKCALENDAR', auth, '<?xml version="1.0"?><c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/"><d:set><d:prop><d:displayname>clickzauber</d:displayname><a:calendar-color>#2F7D59FF</a:calendar-color><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:set></c:mkcalendar>');
  if (mk.code === 201 || mk.code === 405) return { kalender: ziel };   // 405 = gibt es schon
  // Anlegen nicht erlaubt: den ersten vorhandenen Kalender nehmen
  const p3 = await dav(homeUrl, 'PROPFIND', auth, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', 1);
  const teile = p3.text.split(/<[^>]*response[\s>]/i).filter((x) => /calendar/i.test(x) && !/inbox|outbox|notification/i.test(x));
  const h = teile.map((x) => (/<[^>]*href[^>]*>([^<]+)</i.exec(x) || [])[1]).filter(Boolean)[0];
  return h ? { kalender: new URL(h, homeUrl).href.replace(/\/?$/, '/') } : { fehler: 'In iCloud ließ sich kein Kalender anlegen.' };
}

// ── Der Abgleich ─────────────────────────────────────────────────────
export async function kalenderNachziehen(tid, opt = {}) {
  if (!tid) return null;
  let v;
  try {
    const { data, error } = await db.from('kalender_direkt').select('*').eq('tenant_id', tid).maybeSingle();
    if (error || !data || !data.aktiv) return null;   // ohne sql/48 oder nicht verbunden
    v = data;
  } catch { return null; }
  // Sperre: laufen zwei Änderungen gleichzeitig, übernimmt der erste Lauf auch die zweite.
  const jetzt = new Date();
  const { data: gesperrt } = await db.from('kalender_direkt').update({ laeuft_bis: new Date(jetzt.getTime() + 25e3).toISOString(), nochmal: false })
    .eq('tenant_id', tid).or('laeuft_bis.is.null,laeuft_bis.lt.' + jetzt.toISOString()).select('tenant_id');
  if (!gesperrt || !gesperrt.length) { await db.from('kalender_direkt').update({ nochmal: true }).eq('tenant_id', tid); return { spaeter: true }; }

  const z = entschluesseln(v.zugang);
  if (!z) { await db.from('kalender_direkt').update({ fehler: 'Bitte den Kalender neu verbinden.', laeuft_bis: null }).eq('tenant_id', tid); return { fehler: true }; }
  const bis = Date.now() + (opt.zeit || 9000), grenze = opt.max || 60;
  let n = 0, fehler = null, runde = 0;
  try {
    do {
      runde++;
      const [soll, { data: ist }] = await Promise.all([sollListe(tid), db.from('kalender_eintrag').select('quelle, fremd_id, hash').eq('tenant_id', tid)]);
      const istMap = {}; (ist || []).forEach((x) => { istMap[x.quelle] = x; });
      const sollQ = new Set(soll.map((e) => e.q));
      const arbeit = [
        ...soll.filter((e) => !istMap[e.q]).map((e) => ['neu', e]),
        ...soll.filter((e) => istMap[e.q] && istMap[e.q].hash !== e.h).map((e) => ['aendern', e]),
        ...(ist || []).filter((x) => !sollQ.has(x.quelle)).map((x) => ['weg', x])
      ];
      for (const [was, e] of arbeit) {
        if (n >= grenze || Date.now() > bis) break;
        n++;
        if (was === 'weg') {
          await anbieter(v, z, 'weg', null, e.fremd_id);
          await db.from('kalender_eintrag').delete().eq('tenant_id', tid).eq('quelle', e.quelle);
        } else {
          const id = await anbieter(v, z, was, e, was === 'aendern' ? istMap[e.q].fremd_id : null);
          await db.from('kalender_eintrag').upsert({ tenant_id: tid, quelle: e.q, fremd_id: id, hash: e.h, updated_at: new Date().toISOString() });
        }
      }
      const { data: noch } = await db.from('kalender_direkt').select('nochmal').eq('tenant_id', tid).maybeSingle();
      if (!(noch && noch.nochmal) || runde >= 3 || Date.now() > bis) break;
      await db.from('kalender_direkt').update({ nochmal: false }).eq('tenant_id', tid);
    } while (true);
  } catch (e) { fehler = String((e && e.message) || e).slice(0, 200); console.error('kalender-direkt', tid, fehler); }
  const upd = { laeuft_bis: null, stand: new Date().toISOString(), fehler };
  if (z.geaendert) { delete z.geaendert; upd.zugang = verschluesseln(z); }
  await db.from('kalender_direkt').update(upd).eq('tenant_id', tid);
  await ausfallMelden(tid, v, fehler).catch(() => {});
  return { ok: !fehler, schritte: n, fehler };
}

// Fällt die Verbindung aus (Zugang entzogen, App-Passwort geändert), erfährt es der Betrieb einmal per Push und Mail.
// Wieder in Ordnung: Merker zurücksetzen. Ohne sql/58 (Spalte gemeldet_am) passiert einfach nichts.
export async function ausfallMelden(tid, v, fehler) {
  if (fehler && !v.gemeldet_am) {
    const { error } = await db.from('kalender_direkt').update({ gemeldet_am: new Date().toISOString() }).eq('tenant_id', tid);
    if (error) return;
    const { kalenderAlarm } = await import('./_kalender-lesen.js');
    await kalenderAlarm(tid, 'Kalender-Verbindung unterbrochen', 'clickzauber kommt nicht mehr an Ihren ' + ({ google: 'Google Kalender', microsoft: 'Outlook-Kalender', icloud: 'iCloud-Kalender' }[v.art] || 'Kalender') + '. Neue Termine erscheinen dort nicht, und Ihre eigenen Termine sperren im Formular nichts. Bitte im Cockpit unter „Kalender“ neu verbinden.');
  } else if (!fehler && v.gemeldet_am) {
    await db.from('kalender_direkt').update({ gemeldet_am: null }).eq('tenant_id', tid).then(() => {}, () => {});
  }
}

// Beim Trennen: was clickzauber eingetragen hat, wieder entfernen (so viel in der Zeit geht).
export async function kalenderAufraeumen(tid) {
  const { data: v } = await db.from('kalender_direkt').select('*').eq('tenant_id', tid).maybeSingle();
  if (!v) return;
  const z = entschluesseln(v.zugang);
  const { data: ist } = await db.from('kalender_eintrag').select('quelle, fremd_id').eq('tenant_id', tid);
  const bis = Date.now() + 8000;
  if (z) for (const x of ist || []) { if (Date.now() > bis) break; try { await anbieter(v, z, 'weg', null, x.fremd_id); } catch {} }
  await db.from('kalender_eintrag').delete().eq('tenant_id', tid);
  await db.from('kalender_direkt').delete().eq('tenant_id', tid);
  // Gelesene Termine aus diesem Kalender sperren nichts mehr.
  const { data: ws } = await db.from('widgets').select('id, belegung').eq('tenant_id', tid);
  for (const w of ws || []) {
    const b = { ...(w.belegung || {}) };
    if (!('dk_tage' in b) && !('dk_zeiten' in b)) continue;
    ['dk_tage', 'dk_ganz', 'dk_zeiten', 'dk_stand', 'dk_fehler'].forEach((k) => delete b[k]);
    await db.from('widgets').update({ belegung: b }).eq('id', w.id);
  }
}

// Nachts: alle verbundenen Konten einmal vollständig abgleichen.
export async function alleNachziehen() {
  const { data } = await db.from('kalender_direkt').select('tenant_id').eq('aktiv', true).then((r) => r, () => ({ data: [] }));
  let ok = 0;
  for (const x of data || []) { const r = await kalenderNachziehen(x.tenant_id, { zeit: 20000, max: 300 }).catch(() => null); if (r && r.ok) ok++; }
  return { konten: (data || []).length, ok };
}
