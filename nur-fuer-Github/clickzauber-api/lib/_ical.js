// Kalender-Anbindung: iCal-Feed einlesen und belegte Tage und Zeiten ableiten.
// Funktioniert mit Google Kalender, Outlook, Apple Kalender und jedem ICS-Export.
// Seit 03.10.2026:
//   · wiederkehrende Termine (RRULE: täglich, wöchentlich, monatlich, jährlich, mit Ausnahmen und Einzeländerungen)
//   · Zeitzonen (TZID) richtig umgerechnet, ohne Angabe gilt Europe/Berlin
//   · ein Termin bis 0 Uhr sperrt den Folgetag nicht mehr
//   · zusätzlich die genauen Zeiten (für Friseur & Co.) und ganztägige Tage
//   · Einträge, die clickzauber selbst geschrieben hat, zählen nicht

const BER = 'Europe/Berlin';
const WIN = { 'w. europe standard time': BER, 'romance standard time': 'Europe/Paris', 'central europe standard time': 'Europe/Budapest', 'central european standard time': 'Europe/Warsaw', 'gmt standard time': 'Europe/London', 'utc': 'UTC' };
const TAG = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * @param {string} url  webcal:// oder https:// Adresse des Feeds
 * @returns {Promise<{tage:string[], ganz:string[], zeiten:Array, termine:number, fehler:string|null}>}
 */
export async function icalLesen(url, opt = {}) {
  const ziel = String(url || '').trim().replace(/^webcal:\/\//i, 'https://');
  if (!/^https:\/\//i.test(ziel)) return leer('Adresse muss mit https:// beginnen');
  let text;
  try {
    const r = await fetch(ziel, { headers: { 'User-Agent': 'clickzauber/1.0', Accept: 'text/calendar,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(opt.timeout || 12000) });
    if (!r.ok) return leer(`Kalender antwortet mit ${r.status}`);
    text = await r.text();
  } catch (e) {
    return leer('Kalender nicht erreichbar');
  }
  if (!/BEGIN:VCALENDAR/i.test(text)) return leer('Das ist kein Kalender-Feed (kein ICS-Format)');
  return icalAuswerten(text, opt);
}

function leer(fehler) { return { tage: [], ganz: [], zeiten: [], termine: 0, fehler }; }

/**
 * Wertet ICS-Text aus (auch mehrere VCALENDAR hintereinander, z. B. aus iCloud).
 * tage:   jeder Tag, an dem etwas steht (für Formulare mit ganzen Tagen)
 * ganz:   Tage mit ganztägigen Terminen (für Formulare mit Uhrzeit)
 * zeiten: [startMs, endeMs, titel] der nächsten 90 Tage, nur Termine mit Uhrzeit
 */
export function icalAuswerten(text, opt = {}) {
  const monate = opt.monate || 18;
  const jetzt = Date.now();
  const abTag = berlinTag(jetzt);
  const grenzeMs = jetzt + monate * 31 * 864e5;
  const zeitGrenze = jetzt + (opt.zeitTage || 90) * 864e5;
  const tage = new Set(), ganz = new Set(), zeiten = [];
  let termine = 0;

  const evs = [...vevents(text)].map(felder);
  // Einzeln geänderte Termine einer Serie (RECURRENCE-ID): in der Serie auslassen.
  const ersetzt = {};
  evs.forEach((f) => { const u = wert(f, 'UID'); if (f['RECURRENCE-ID'] && u) (ersetzt[u] = ersetzt[u] || new Set()).add(schluessel(f['RECURRENCE-ID'][0])); });

  for (const f of evs) {
    if (wert(f, 'STATUS').toUpperCase() === 'CANCELLED') continue;
    if (wert(f, 'TRANSP').toUpperCase() === 'TRANSPARENT') continue;
    if (/@clickzauber\.de$/i.test(wert(f, 'UID')) || /über clickzauber/i.test(text1(wert(f, 'DESCRIPTION')))) continue;
    const st = f.DTSTART && f.DTSTART[0];
    if (!st) continue;
    const s0 = zeitpunkt(st);
    if (!s0) continue;
    let dauer;
    const en = f.DTEND && f.DTEND[0] ? zeitpunkt(f.DTEND[0]) : null;
    if (s0.ganz) dauer = en && en.ganz ? Math.max(1, tageZwischen(s0.datum, en.datum)) : (dauerVon(wert(f, 'DURATION'), true) || 1);
    else dauer = en && !en.ganz ? Math.max(60e3, en.ms - s0.ms) : (dauerVon(wert(f, 'DURATION'), false) || 0);

    const aus = new Set([...(f['RECURRENCE-ID'] ? [] : (ersetzt[wert(f, 'UID')] || [])), ...(f.EXDATE || []).flatMap((x) => x.wert.split(',').map((v) => schluessel({ wert: v, params: x.params })))]);
    const titel = text1(wert(f, 'SUMMARY')).slice(0, 120);
    const rrule = f['RECURRENCE-ID'] ? '' : wert(f, 'RRULE');
    let gezaehlt = false;
    for (const vorkommen of serie(s0, rrule, grenzeMs)) {
      if (aus.has(vorkommen.k)) continue;
      if (s0.ganz) {
        const bisTag = plusTag(vorkommen.datum, dauer - 1);
        if (bisTag < abTag) continue;
        if (!gezaehlt) { termine++; gezaehlt = true; }
        for (let t = vorkommen.datum < abTag ? abTag : vorkommen.datum, n = 0; t <= bisTag && n < 400; t = plusTag(t, 1), n++) { tage.add(t); ganz.add(t); }
      } else {
        const a = vorkommen.ms, b = a + dauer;
        if (b <= jetzt) continue;
        if (!gezaehlt) { termine++; gezaehlt = true; }
        // Letzter Tag: der Tag der letzten Minute vor dem Ende — ein Termin bis 0 Uhr sperrt den Folgetag nicht.
        const von = berlinTag(Math.max(a, jetzt)), bis = berlinTag(Math.max(a, b - 1));
        for (let t = von, n = 0; t <= bis && n < 400; t = plusTag(t, 1), n++) tage.add(t);
        if (a < zeitGrenze && zeiten.length < 2000) zeiten.push([a, Math.max(b, a + 60e3), titel]);
      }
    }
  }
  zeiten.sort((x, y) => x[0] - y[0]);
  return { tage: [...tage].sort(), ganz: [...ganz].sort(), zeiten, termine, fehler: null };
}

/* ── Zerlegen ─────────────────────────────────────────────────────── */
function* vevents(text) {
  const t = String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').replace(/BEGIN:VALARM[\s\S]*?END:VALARM/gi, '');
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  let m;
  while ((m = re.exec(t))) yield m[1];
}
function felder(roh) {
  const out = {};
  for (const zeile of roh.split('\n')) {
    const i = zeile.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = zeile.slice(0, i).split(';');
    const k = name.trim().toUpperCase();
    if (!k) continue;
    (out[k] = out[k] || []).push({ wert: zeile.slice(i + 1).trim(), params: params.join(';') });
  }
  return out;
}
const wert = (f, k) => (f[k] && f[k][0] ? f[k][0].wert : '');
const text1 = (s) => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
function param(p, name) { const m = new RegExp('(?:^|;)' + name + '=("?)([^;"]+)\\1', 'i').exec(p || ''); return m ? m[2] : ''; }
function zone(tzid) {
  const z = String(tzid || '').trim();
  if (!z) return BER;
  if (WIN[z.toLowerCase()]) return WIN[z.toLowerCase()];
  const ohne = z.replace(/^\/[^/]*\/[^/]*\//, '');   // „/mozilla.org/20050126_1/Europe/Berlin“
  try { new Intl.DateTimeFormat('en-US', { timeZone: ohne }); return ohne; } catch { return BER; }
}

/* Zeitpunkt aus DTSTART, DTEND, EXDATE …: { ganz, datum } oder { ms, wand:[y,m,d,h,mi,s], tz } */
function zeitpunkt(x) {
  const v = String(x.wert || '').trim(), p = x.params || '';
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m || /VALUE=DATE(?!-)/i.test(p)) { m = m || v.match(/^(\d{4})(\d{2})(\d{2})/); if (!m) return null; return { ganz: true, datum: m[1] + '-' + m[2] + '-' + m[3] }; }
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/);
  if (!m) return null;
  const w = [+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0)];
  if (m[7] === 'Z') { const ms = Date.UTC(w[0], w[1] - 1, w[2], w[3], w[4], w[5]); return { ms, wand: wandIn(ms, BER), tz: BER }; }
  const tz = zone(param(p, 'TZID'));
  return { ms: utcVon(w, tz), wand: w, tz };
}
function schluessel(x) {
  const z = zeitpunkt(x);
  if (!z) return '';
  return z.ganz ? z.datum : String(Math.round(z.ms / 60e3));
}

/* ── Wiederholungen ───────────────────────────────────────────────── */
function* serie(s0, rrule, grenzeMs) {
  const k0 = s0.ganz ? s0.datum : String(Math.round(s0.ms / 60e3));
  if (!rrule) { yield s0.ganz ? { datum: s0.datum, k: k0 } : { ms: s0.ms, k: k0 }; return; }
  const r = {};
  rrule.split(';').forEach((t) => { const [a, b] = t.split('='); if (a && b) r[a.toUpperCase()] = b.toUpperCase(); });
  const freq = r.FREQ, intv = Math.max(1, parseInt(r.INTERVAL, 10) || 1), anzahl = parseInt(r.COUNT, 10) || 0;
  let bisMs = grenzeMs;
  if (r.UNTIL) { const u = zeitpunkt({ wert: r.UNTIL, params: /^\d{8}$/.test(r.UNTIL) ? 'VALUE=DATE' : '' }); if (u) bisMs = Math.min(bisMs, u.ganz ? Date.parse(u.datum + 'T23:59:59Z') : u.ms); }
  const byday = (r.BYDAY || '').split(',').filter(Boolean).map((x) => { const m = x.match(/^([+-]?\d+)?([A-Z]{2})$/); return m ? { n: m[1] ? +m[1] : 0, wd: TAG.indexOf(m[2]) } : null; }).filter((x) => x && x.wd >= 0);
  const bymd = (r.BYMONTHDAY || '').split(',').filter(Boolean).map(Number);
  const bymon = (r.BYMONTH || '').split(',').filter(Boolean).map(Number);
  const [y0, m0, d0] = s0.ganz ? s0.datum.split('-').map(Number) : s0.wand.slice(0, 3);
  const start = iso(y0, m0, d0);
  let n = 0, schutz = 0;
  const raus = (datum) => {
    if (s0.ganz) return { datum, k: datum, ms: Date.parse(datum + 'T00:00:00Z') };
    const [y, mo, d] = datum.split('-').map(Number);
    const ms = utcVon([y, mo, d, s0.wand[3], s0.wand[4], s0.wand[5]], s0.tz);
    return { ms, k: String(Math.round(ms / 60e3)) };
  };
  const kandidaten = (y, mo) => {
    const tageIm = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    let liste = [];
    if (bymd.length) liste = bymd.map((d) => (d < 0 ? tageIm + d + 1 : d)).filter((d) => d >= 1 && d <= tageIm);
    else if (byday.length) {
      byday.forEach(({ n: nr, wd }) => {
        const alle = [];
        for (let d = 1; d <= tageIm; d++) if (new Date(Date.UTC(y, mo - 1, d)).getUTCDay() === wd) alle.push(d);
        if (!nr) liste.push(...alle); else { const d = nr > 0 ? alle[nr - 1] : alle[alle.length + nr]; if (d) liste.push(d); }
      });
    } else if (d0 <= tageIm) liste = [d0];
    return [...new Set(liste)].sort((a, b) => a - b).map((d) => iso(y, mo, d));
  };
  const lauf = function* () {
    if (freq === 'DAILY') { for (let t = start; ; t = plusTag(t, intv)) yield t; }
    else if (freq === 'WEEKLY') {
      const wds = byday.length ? byday.map((b) => b.wd) : [new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay()];
      const wd0 = new Date(Date.UTC(y0, m0 - 1, d0)).getUTCDay();
      let montag = plusTag(start, -((wd0 + 6) % 7));
      for (;;) {
        for (const wd of [...wds].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))) yield plusTag(montag, (wd + 6) % 7);
        montag = plusTag(montag, 7 * intv);
      }
    } else if (freq === 'MONTHLY') {
      for (let i = 0; ; i += intv) { const mm = m0 - 1 + i; yield* kandidaten(y0 + Math.floor(mm / 12), (mm % 12) + 1); }
    } else if (freq === 'YEARLY') {
      for (let i = 0; ; i += intv) {
        const y = y0 + i;
        if (bymon.length && (byday.length || bymd.length)) { for (const mo of bymon.sort((a, b) => a - b)) yield* kandidaten(y, mo); }
        else { const mo = bymon[0] || m0; if (d0 <= new Date(Date.UTC(y, mo, 0)).getUTCDate()) yield iso(y, mo, d0); }
      }
    }
  };
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) { yield raus(start); return; }
  for (const datum of lauf()) {
    if (++schutz > 4000) return;
    if (datum < start) continue;
    const v = raus(datum);
    if (v.ms > bisMs) return;
    n++;
    if (anzahl && n > anzahl) return;
    yield v;
  }
}

/* ── Hilfen für Zeit und Datum ────────────────────────────────────── */
function dauerVon(s, ganz) {
  const m = String(s || '').match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!m) return 0;
  const tage = (+m[1] || 0) * 7 + (+m[2] || 0);
  if (ganz) return tage || 1;
  return ((tage * 24 + (+m[3] || 0)) * 60 + (+m[4] || 0)) * 60e3 + (+m[5] || 0) * 1000;
}
function versatz(tz, ms) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const g = (t) => +p.find((x) => x.type === t).value;
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - ms;
}
export function utcVon(w, tz = BER) {
  const roh = Date.UTC(w[0], w[1] - 1, w[2], w[3] || 0, w[4] || 0, w[5] || 0);
  let t = roh - versatz(tz, roh);
  t = roh - versatz(tz, t);
  return t;
}
function wandIn(ms, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const g = (t) => +p.find((x) => x.type === t).value;
  return [g('year'), g('month'), g('day'), g('hour') % 24, g('minute'), g('second')];
}
export function berlinTag(ms) { return new Date(ms).toLocaleDateString('sv-SE', { timeZone: BER }); }
function iso(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function plusTag(t, n) { const d = new Date(t + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function tageZwischen(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
