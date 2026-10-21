// Den eigenen Kalender des Betriebs lesen, damit das Formular dort nichts mehr anbietet (seit 03.10.2026).
//
// Zwei Quellen, beide landen in widgets.belegung (siehe _kaltage.js):
//   1. Kalender-Adresse (iCal-Feed), je Formular eingetragen      → kal_tage, kal_ganz, kal_zeiten
//   2. Echtzeit-Verbindung Google / Outlook / iCloud (sql/48)      → dk_tage, dk_ganz, dk_zeiten (in jedes Formular des Kontos)
// Was clickzauber selbst in den Kalender geschrieben hat, zählt nicht.
//
// Wann gelesen wird:
//   · alle 15 Minuten (GitHub Actions → /api/kalender-sync, .github/workflows/kalender.yml)
//   · direkt vor jeder Anfrage, wenn der Stand älter als 10 Minuten ist (lib/lead.js, kalFrischFuer)
//   · nach „Jetzt abgleichen“ und nach dem Verbinden (lib/kalender-direkt.js)
// Fällt etwas aus, bekommt der Betrieb einmal Push und Mail (kalenderAlarm).
//
// Mitarbeiter: Steht im Titel eines Termins der Name eines Mitarbeiters, sperrt er nur dessen Zeiten.
// Sonst gilt er für alle.
import { db } from './_lib.js';
import { icalLesen, icalAuswerten, utcVon, berlinTag } from './_ical.js';
import { zugriff, entschluesseln, verschluesseln } from './_kalender-direkt.js';
import { pushSenden } from './_push.js';
import { betriebMail } from './nachfassen.js';

const ALT_MIN = 12;           // jünger als das wird beim 15-Minuten-Lauf übersprungen
const MONATE = 12;            // so weit voraus wird gelesen
const ZEIT_TAGE = 90;         // genaue Zeiten (Friseur & Co.) so weit voraus

export async function kalenderAlarm(tid, titel, text) {
  const url = 'clickzauber-cockpit-live.html#belegung';
  await pushSenden(tid, { titel, text, url, tag: 'cz-kalender' }).catch(() => 0);
  await betriebMail(tid, titel, text, url, 'Diese Nachricht kommt nur einmal. Ist alles wieder verbunden, meldet sich clickzauber erst beim nächsten Ausfall.').catch(() => false);
}

// ── Belegung eines Formulars ergänzen, ohne gleichzeitige Änderungen (Buchungen) zu überschreiben ──
async function belegungSetzen(id, patch) {
  const { data } = await db.from('widgets').select('belegung').eq('id', id).maybeSingle();
  const b = { ...((data && data.belegung) || {}) };
  for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete b[k]; else b[k] = v; }
  await db.from('widgets').update({ belegung: b }).eq('id', id);
  return b;
}

// ── Mitarbeiter zuordnen: Name im Titel → nur dieser Mitarbeiter ──
async function personalVon(tid) {
  const { data } = await db.from('personal').select('id, name, aktiv').eq('tenant_id', tid).then((r) => r, () => ({ data: [] }));
  return (data || []).filter((p) => p.aktiv !== false && p.name).map((p) => ({ id: p.id, wort: String(p.name).trim().split(/\s+/)[0].toLowerCase() })).filter((p) => p.wort.length >= 3);
}
function zuordnen(zeiten, personal) {
  return zeiten.map(([a, b, titel]) => {
    const t = ' ' + String(titel || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
    const ids = personal.filter((p) => t.includes(' ' + p.wort + ' ')).map((p) => p.id);
    return [a, b, ids.length ? ids : null];
  });
}

// ── 1. Kalender-Adresse eines Formulars lesen ──
export async function feedLesen(w, opt = {}) {
  const bel = w.belegung || {};
  const r = await icalLesen(bel.kal_url, { timeout: opt.timeout || 8000, monate: 18, zeitTage: ZEIT_TAGE });
  const jetzt = new Date().toISOString();
  if (r.fehler) {
    const seit = bel.kal_fehler_seit || jetzt;
    const patch = { kal_fehler: r.fehler, kal_fehler_seit: seit, kal_stand: jetzt };
    // Erst melden, wenn es nicht nur ein kurzer Aussetzer war (zwei Läufe, mindestens 30 Minuten).
    if (opt.melden && !bel.kal_fehler_gemeldet && Date.now() - Date.parse(seit) > 30 * 60e3 && w.tenant_id) {
      patch.kal_fehler_gemeldet = jetzt;
      await kalenderAlarm(w.tenant_id, 'Ihr Kalender lässt sich nicht mehr lesen', 'Die Kalender-Adresse im Formular „' + (w.name || w.slug) + '“ funktioniert nicht mehr (' + r.fehler + '). Bis das behoben ist, sperrt das Formular nur die Tage, die zuletzt bekannt waren. Bitte im Cockpit unter „Kalender“ die Adresse neu eintragen.');
    }
    await belegungSetzen(w.id, patch);
    return { ok: false };
  }
  const personal = w.tenant_id ? await personalVon(w.tenant_id) : [];
  await belegungSetzen(w.id, { kal_tage: r.tage, kal_ganz: r.ganz, kal_zeiten: zuordnen(r.zeiten, personal), kal_termine: r.termine, kal_stand: jetzt, kal_fehler: null, kal_fehler_seit: undefined, kal_fehler_gemeldet: undefined });
  return { ok: true };
}

// ── 2. Echtzeit-Verbindung lesen ──
async function direktLesen(v, z) {
  const ab = new Date(Date.now() - 864e5), bis = new Date(Date.now() + MONATE * 31 * 864e5);
  const auth = await zugriff(v, z);
  const H = { Authorization: auth };
  const tage = new Set(), ganz = new Set(), zeiten = [];
  const heute = berlinTag(Date.now()), zeitGrenze = Date.now() + ZEIT_TAGE * 864e5;
  const ganztags = (von, bisEx) => { for (let t = von < heute ? heute : von, n = 0; t < bisEx && n < 400; t = plus(t, 1), n++) { tage.add(t); ganz.add(t); } };
  const mitZeit = (a, b, titel) => {
    if (!(b > Date.now())) return;
    for (let t = berlinTag(Math.max(a, Date.now())), n = 0; t <= berlinTag(Math.max(a, b - 1)) && n < 400; t = plus(t, 1), n++) tage.add(t);
    if (a < zeitGrenze && zeiten.length < 2000) zeiten.push([a, b, String(titel || '').slice(0, 120)]);
  };

  if (v.art === 'google') {
    let seite = '', runde = 0;
    do {
      const q = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', timeMin: ab.toISOString(), timeMax: bis.toISOString(), maxResults: '2500', fields: 'nextPageToken,items(status,transparency,start,end,summary,extendedProperties/private/cz)' });
      if (seite) q.set('pageToken', seite);
      const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(v.kalender_id || 'primary') + '/events?' + q, { headers: H, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('Google ' + r.status);
      const j = await r.json();
      for (const e of j.items || []) {
        if (e.status === 'cancelled' || e.transparency === 'transparent') continue;
        if (e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.cz) continue;   // von clickzauber
        if (e.start && e.start.date) ganztags(e.start.date, (e.end && e.end.date) || plus(e.start.date, 1));
        else if (e.start && e.start.dateTime) mitZeit(Date.parse(e.start.dateTime), Date.parse(e.end && e.end.dateTime) || Date.parse(e.start.dateTime) + 36e5, e.summary);
      }
      seite = j.nextPageToken || '';
    } while (seite && ++runde < 3);
  } else if (v.art === 'microsoft') {
    const { data: eig } = await db.from('kalender_eintrag').select('fremd_id').eq('tenant_id', v.tenant_id);
    const eigene = new Set((eig || []).map((x) => x.fremd_id));
    let url = 'https://graph.microsoft.com/v1.0/me/calendarView?' + new URLSearchParams({ startDateTime: ab.toISOString(), endDateTime: bis.toISOString(), $top: '500', $select: 'id,subject,start,end,isAllDay,showAs,isCancelled' }), runde = 0;
    while (url && runde++ < 4) {
      const r = await fetch(url, { headers: { ...H, Prefer: 'outlook.timezone="W. Europe Standard Time"' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error('Outlook ' + r.status);
      const j = await r.json();
      for (const e of j.value || []) {
        if (e.isCancelled || e.showAs === 'free' || eigene.has(e.id)) continue;
        const s = String((e.start && e.start.dateTime) || ''), en = String((e.end && e.end.dateTime) || '');
        if (e.isAllDay) ganztags(s.slice(0, 10), en.slice(0, 10) || plus(s.slice(0, 10), 1));
        else { const a = ortszeit(s), b = ortszeit(en); if (a) mitZeit(a, b || a + 36e5, e.subject); }
      }
      url = j['@odata.nextLink'] || '';
    }
  } else if (v.art === 'icloud') {
    // Alle Kalender des Kontos, außer dem eigenen Kalender „clickzauber“.
    const eigen = String(v.kalender_id || '');
    const home = eigen.replace(/[^/]+\/?$/, '');
    if (!home) throw new Error('iCloud: Kalender nicht gefunden');
    const p = await dav(home, 'PROPFIND', auth, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>', 1);
    if (p.code === 401) throw new Error('iCloud 401');
    const hrefs = p.text.split(/<[^>]*response[\s>]/i).filter((x) => /<[^>]*:?calendar[\s/>]/i.test(x) && !/inbox|outbox|notification/i.test(x))
      .map((x) => (/<[^>]*href[^>]*>([^<]+)</i.exec(x) || [])[1]).filter(Boolean).map((h) => new URL(h, home).href.replace(/\/?$/, '/'))
      .filter((h) => h !== eigen.replace(/\/?$/, '/') && h !== home).slice(0, 8);
    const st = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    let ics = '';
    for (const h of hrefs) {
      const r = await dav(h, 'REPORT', auth, '<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="' + st(ab) + '" end="' + st(bis) + '"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>', 1);
      if (r.code >= 400) continue;
      const teile = r.text.match(/<[^>]*calendar-data[^>]*>([\s\S]*?)<\/[^>]*calendar-data>/gi) || [];
      ics += teile.map((t) => t.replace(/^<[^>]*>|<\/[^>]*>$/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&#13;/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')).join('\n');
    }
    const e = icalAuswerten(ics, { monate: MONATE, zeitTage: ZEIT_TAGE });
    e.tage.forEach((t) => tage.add(t)); e.ganz.forEach((t) => ganz.add(t)); zeiten.push(...e.zeiten);
  }
  zeiten.sort((x, y) => x[0] - y[0]);
  return { tage: [...tage].sort(), ganz: [...ganz].sort(), zeiten };
}
async function dav(url, methode, auth, body, tiefe) {
  const r = await fetch(url, { method: methode, headers: { Authorization: auth, 'Content-Type': 'application/xml; charset=utf-8', Depth: String(tiefe == null ? 0 : tiefe) }, body, signal: AbortSignal.timeout(8000) });
  return { code: r.status, text: await r.text().catch(() => '') };
}
function ortszeit(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/); return m ? utcVon([+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0)]) : 0; }
function plus(t, n) { const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// Echtzeit-Verbindung eines Kontos lesen und in alle Formulare schreiben.
export async function kontoLesen(tid, opt = {}) {
  const { data: v } = await db.from('kalender_direkt').select('*').eq('tenant_id', tid).maybeSingle().then((r) => r, () => ({ data: null }));
  if (!v || !v.aktiv) return null;
  const z = entschluesseln(v.zugang);
  const { data: ws } = await db.from('widgets').select('id').eq('tenant_id', tid);
  const jetzt = new Date().toISOString();
  let erg;
  try {
    if (!z) throw new Error('Zugang fehlt');
    const r = await direktLesen(v, z);
    if (z.geaendert) { delete z.geaendert; await db.from('kalender_direkt').update({ zugang: verschluesseln(z) }).eq('tenant_id', tid); }
    const zt = zuordnen(r.zeiten, await personalVon(tid));
    for (const w of ws || []) await belegungSetzen(w.id, { dk_tage: r.tage, dk_ganz: r.ganz, dk_zeiten: zt, dk_stand: jetzt, dk_fehler: null });
    erg = { ok: true, tage: r.tage.length };
  } catch (e) {
    const f = String((e && e.message) || e).slice(0, 160);
    for (const w of ws || []) await belegungSetzen(w.id, { dk_fehler: f, dk_stand: jetzt });
    erg = { ok: false, fehler: f };
  }
  if (opt.melden) {
    const { ausfallMelden } = await import('./_kalender-direkt.js');
    await ausfallMelden(tid, v, erg.ok ? v.fehler : erg.fehler).catch(() => {});
  }
  return erg;
}

// ── Der 15-Minuten-Lauf ──
export async function kalenderAuffrischen(opt = {}) {
  const ende = Date.now() + (opt.zeit || 8000);
  const grenze = Date.now() - (opt.alle ? 0 : ALT_MIN * 60e3);
  const erg = { feeds: 0, konten: 0, fehler: 0 };

  const { data: feeds } = await db.from('widgets').select('id, slug, name, tenant_id, belegung').not('belegung->>kal_url', 'is', null).limit(500);
  const faellig = (feeds || []).filter((w) => w.belegung && w.belegung.kal_url && !(Date.parse(w.belegung.kal_stand || 0) > grenze))
    .sort((a, b) => (Date.parse(a.belegung.kal_stand || 0) || 0) - (Date.parse(b.belegung.kal_stand || 0) || 0));
  for (let i = 0; i < faellig.length && Date.now() < ende - 2500; i += 6) {
    const r = await Promise.all(faellig.slice(i, i + 6).map((w) => feedLesen(w, { melden: true, timeout: Math.min(7000, ende - Date.now() - 500) }).catch(() => ({ ok: false }))));
    r.forEach((x) => { if (x.ok) erg.feeds++; else erg.fehler++; });
  }

  const { data: konten } = await db.from('kalender_direkt').select('tenant_id').eq('aktiv', true).then((r) => r, () => ({ data: [] }));
  for (const k of konten || []) {
    if (Date.now() > ende - 2500) break;
    const { data: w1 } = await db.from('widgets').select('belegung').eq('tenant_id', k.tenant_id).limit(1).maybeSingle();
    if (Date.parse((w1 && w1.belegung && w1.belegung.dk_stand) || 0) > grenze) continue;
    const r = await kontoLesen(k.tenant_id, { melden: true }).catch(() => null);
    if (r && r.ok) erg.konten++; else erg.fehler++;
  }
  return erg;
}

// ── Direkt vor einer Anfrage: ist der Stand älter als 10 Minuten, schnell neu lesen (höchstens 3,5 Sekunden). ──
export async function kalFrischFuer(slug, maxMin = 10) {
  const { data: w } = await db.from('widgets').select('id, slug, name, tenant_id, belegung').eq('slug', slug).maybeSingle();
  if (!w) return null;
  const b = w.belegung || {}, alt = Date.now() - maxMin * 60e3, auf = [];
  if (b.kal_url && !(Date.parse(b.kal_stand || 0) > alt)) auf.push(feedLesen(w, { timeout: 3000 }).catch(() => null));
  if (w.tenant_id && (b.dk_stand ? Date.parse(b.dk_stand) <= alt : true)) {
    const { data: v } = await db.from('kalender_direkt').select('aktiv').eq('tenant_id', w.tenant_id).maybeSingle().then((r) => r, () => ({ data: null }));
    if (v && v.aktiv) auf.push(kontoLesen(w.tenant_id).catch(() => null));
  }
  if (!auf.length) return b;
  await Promise.race([Promise.all(auf), new Promise((r) => setTimeout(r, 3500))]);
  const { data: neu } = await db.from('widgets').select('belegung').eq('id', w.id).maybeSingle();
  return (neu && neu.belegung) || b;
}

// ── Nachts: Kalender-Abo eingerichtet, aber seit 3 Tagen nicht mehr abgeholt? Einmal Bescheid geben (sql/58). ──
export async function aboPruefen() {
  const grenze = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data, error } = await db.from('einstellungen').select('tenant_id, kal_abo_abruf_am, kal_abo_gemeldet_am')
    .not('kal_abo_bestaetigt_am', 'is', null).lt('kal_abo_abruf_am', grenze).limit(300);
  if (error) return { hinweis: 'sql/58 fehlt' };
  const { data: dk } = await db.from('kalender_direkt').select('tenant_id').eq('aktiv', true).then((r) => r, () => ({ data: [] }));
  const mitDirekt = new Set((dk || []).map((x) => x.tenant_id));
  let n = 0;
  for (const e of data || []) {
    if (mitDirekt.has(e.tenant_id)) continue;
    if (e.kal_abo_gemeldet_am && e.kal_abo_gemeldet_am > e.kal_abo_abruf_am) continue;
    await kalenderAlarm(e.tenant_id, 'Ihr Kalender holt keine Termine mehr ab', 'Seit dem ' + new Date(e.kal_abo_abruf_am).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) + ' hat Ihr Kalender das clickzauber-Abo nicht mehr abgerufen. Neue Termine fehlen dort also. Vielleicht wurde das Abo gelöscht. Bitte im Cockpit unter „Kalender“ neu einrichten.');
    await db.from('einstellungen').update({ kal_abo_gemeldet_am: new Date().toISOString() }).eq('tenant_id', e.tenant_id);
    n++;
  }
  return { gemeldet: n };
}
