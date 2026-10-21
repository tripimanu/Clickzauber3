// Gemeinsame Helfer für Uhrzeit-Termine. Alle Zeiten gelten in Europe/Berlin,
// gespeichert wird in UTC. Vercel läuft in UTC — ohne diese Umrechnung wären
// alle Termine im Sommer zwei Stunden verschoben.
import { db } from './_lib.js';
import { kalTage, kalZeiten } from './_kaltage.js';
import { randomUUID } from 'crypto';

const TZ = 'Europe/Berlin';
export const istIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const istZeit = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
const pad = (n) => String(n).padStart(2, '0');
export const minuten = (z) => { const [h, m] = z.split(':').map(Number); return h * 60 + m; };
export const alsZeit = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

export const STANDARD_ZEITEN = { 1: [['09:00', '18:00']], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '18:00']], 5: [['09:00', '18:00']], 6: [['09:00', '14:00']] };

// Arbeitstage aus dem Konfigurator als Arbeitszeiten (seit 10.10.2026), z. B. [3, 4, 5] = Mi bis Fr. 0 = Sonntag wie in sql/28.
export function zeitenAusTagen(t) {
  if (!Array.isArray(t)) return null;
  const z = {};
  t.map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6).forEach((d) => { z[d] = STANDARD_ZEITEN[d] || [['09:00', '18:00']]; });
  return Object.keys(z).length ? z : null;
}

/* Öffnungszeiten aus dem Konfigurator (seit 13.10.2026): { Wochentag: [[von, bis], …] }, 0 = Sonntag. Ungültiges fällt weg. */
export function zeitenPruefen(z) {
  if (!z || typeof z !== 'object' || Array.isArray(z)) return null;
  const ok = /^([01]\d|2[0-3]):[0-5]\d$/, r = {};
  for (const k of Object.keys(z)) {
    const d = parseInt(k, 10);
    if (!(d >= 0 && d <= 6) || !Array.isArray(z[k])) continue;
    const iv = z[k].filter((x) => Array.isArray(x) && ok.test(x[0]) && ok.test(x[1]) && x[0] < x[1]).slice(0, 4).map((x) => [x[0], x[1]]);
    if (iv.length) r[d] = iv;
  }
  return Object.keys(r).length ? r : null;
}

/* Beim Speichern: Tage und Uhrzeiten aus dem Konfigurator für alle Mitarbeiter übernehmen, wenn sie sich geändert haben
   (oder die Mitarbeiter-Liste). Danach bietet das Formular nur noch Zeiten in diesem Rahmen an. */
export async function zeitenAbgleich(tenant, altTc, neuTc) {
  const neu = zeitenPruefen(neuTc && neuTc.zeiten);
  if (!tenant || !neu) return;
  const namen = (tc) => (Array.isArray(tc && tc.personal) ? tc.personal : []).map((m) => String((m && m.name) || '').trim()).join('|');
  if (JSON.stringify(zeitenPruefen(altTc && altTc.zeiten)) === JSON.stringify(neu) && namen(altTc) === namen(neuTc)) return;
  await db.from('personal').update({ zeiten: neu }).eq('tenant_id', tenant);
}

const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
function teile(ms) { const p = {}; fmt.formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; }); return p; }
function versatz(ms) { const p = teile(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000; }

// "2026-10-14" + "09:30" in Berlin → Date (UTC)
export function lokal(datum, zeit) {
  const [y, m, d] = datum.split('-').map(Number), [h, mi] = zeit.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let t = guess - versatz(guess);
  const v2 = versatz(t);
  if (guess - v2 !== t) t = guess - v2;
  return new Date(t);
}
export function lokalText(wann) {
  const p = teile(new Date(wann).getTime());
  return { datum: p.year + '-' + p.month + '-' + p.day, zeit: p.hour + ':' + p.minute };
}
export function heuteBerlin() { return lokalText(Date.now()).datum; }
export function plusTage(datum, n) {
  const d = new Date(datum + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* Inhaltsverzeichnis mit runden Kacheln (seit 08.10.2026, public/w.js saRechnen rechnet genauso).
   Zuschläge in Prozent [Zeit, Preis] je Haar-Angabe. Länge und Haarart gelten für Leistungen mit „haar“ (und für Waschen & Föhnen),
   Haarfarbe und „schon gefärbt“ für Leistungen mit „farbe“. Der Salon ändert alles im Cockpit (Termine → Leistungen & Regeln). */
export const SALON_STANDARD = {
  an: false, hinweis: '',
  waschen: { an: true, name: 'Waschen & Föhnen', preis: 30, dauer: 30 },
  z: { kurz: [0, 0], schulter: [20, 15], lang: [40, 30], lockig: [20, 10], dick: [20, 10], duenn: [0, 0], fein: [0, 0],
       blond: [0, 0], hellbraun: [0, 0], dunkelbraun: [20, 15], schwarz: [40, 30], rot: [40, 30], grau: [10, 10], vor: [30, 20] }
};
const SA_LAENGE = ['kurz', 'schulter', 'lang'], SA_STRUKTUR = ['lockig', 'dick', 'duenn', 'fein'], SA_FARBE = ['blond', 'hellbraun', 'dunkelbraun', 'schwarz', 'rot', 'grau'];
const SA_NAME = { kurz: 'kurz', schulter: 'schulterlang', lang: 'lang', lockig: 'lockig', dick: 'dick', duenn: 'dünn', fein: 'fein', blond: 'blond', hellbraun: 'hellbraun', dunkelbraun: 'dunkelbraun', schwarz: 'schwarz', rot: 'rot', grau: 'grau', vor: 'schon gefärbt' };
const prozent = (v) => Math.min(300, Math.max(0, Math.round(+v || 0)));
export function salonPruefen(s) {
  if (!s || typeof s !== 'object') return null;
  const z = {};
  Object.keys(SALON_STANDARD.z).forEach((id) => { const x = s.z && Array.isArray(s.z[id]) ? s.z[id] : SALON_STANDARD.z[id]; z[id] = [prozent(x[0]), prozent(x[1])]; });
  const w = s.waschen && typeof s.waschen === 'object' ? s.waschen : SALON_STANDARD.waschen;
  return {
    an: !!s.an, hinweis: String(s.hinweis || '').trim().slice(0, 240),
    // Reihenfolge im Formular: 'leistung' = zuerst die Behandlung, dann Tag und Uhrzeit. Bild über den Kacheln (nur https).
    reihe: s.reihe === 'leistung' ? 'leistung' : 'tag',
    bild: /^https:\/\/[^\s"'<>]{4,400}$/.test(String(s.bild || '')) ? String(s.bild) : '',
    bildText: String(s.bildText || '').trim().slice(0, 160),
    waschen: { an: w.an !== false, name: String(w.name || '').trim().slice(0, 40) || 'Waschen & Föhnen', preis: Math.min(9999, Math.max(0, +w.preis || 0)), dauer: Math.min(240, Math.max(5, Math.round((+w.dauer || 30) / 5) * 5)) },
    // Wimpern auffüllen (seit 15.10.2026): ab weniger als „prozent“ % oder mehr als „wochen“ Wochen voraussichtlich neues Set. Fotos im Formular, per WhatsApp oder gar nicht.
    wimpern: wimpernPruefen(s.wimpern),
    // Höchstens so viele Anfragen je Gerät und je Anschluss in 24 Stunden (0 = keine Grenze außer der allgemeinen Bremse).
    // Fehlt die Angabe, gelten 3 (seit 15.10.2026, Manuels Wunsch: lieber an, abschaltbar mit 0).
    limit: s.limit == null || s.limit === '' ? 3 : Math.min(20, Math.max(0, parseInt(s.limit, 10) || 0)),
    z
  };
}
/* Auffüll-Leistung (seit 15.10.2026 von selbst an): Name mit „Auffüllen“ und Wimpern im Namen oder in der Kachel. Ausschalten mit wimpern: false. */
export const istWimpern = (l) => !!l && (l.wimpern === true || (l.wimpern !== false && /auff[üu]ll|infill|refill/i.test(String(l.name || '')) && /wimper|lash/i.test(String(l.name || '') + ' ' + String(l.kat || ''))));
export const wimpernAn = (sal) => !!sal && !(sal.wimpern && sal.wimpern.an === false);
export function wimpernPruefen(x) {
  x = x && typeof x === 'object' ? x : {};
  // an: true = eingeschaltet, false = aus, fehlt = von selbst (nur Konten, die es schon vor dem Schalter gab, z. B. Kate Cosmetics). Neue Vorlagen setzen false.
  return { an: x.an === true ? true : x.an === false ? false : undefined, prozent: Math.min(90, Math.max(10, Math.round((+x.prozent || 50) / 10) * 10)), wochen: Math.min(8, Math.max(1, parseInt(x.wochen, 10) || 4)), fotos: ['widget', 'whatsapp', 'aus'].includes(x.fotos) ? x.fotos : 'whatsapp' };
}
// Neuset zu einer Auffüll-Leistung: l.neuset (Name), sonst die Leistung derselben Kachel mit „Neuset“ im Namen und gleichem ersten Wort (z. B. „1:1“, „Volumentechnik“). Wie public/w.js saNs.
const wort = (n) => String(n || '').trim().split(/[\s:]+/)[0].toLowerCase();
export function neusetVon(leistungen, l) {
  if (!istWimpern(l)) return null;
  const n = String(l.neuset || '').trim().toLowerCase();
  return (leistungen || []).find((x) => x && x !== l && (n ? String(x.name || '').trim().toLowerCase() === n
    : (x.kat || '') === (l.kat || '') && /neu\s*-?\s*set|neues set/i.test(x.name || '') && wort(x.name) === wort(l.name))) || null;
}
const WIM_W = { 2: 'vor bis zu 2 Wochen', 3: 'vor 3 Wochen', 4: 'vor 4 Wochen', 5: 'vor 5 Wochen oder länger', 99: 'bei einem anderen Studio oder unbekannt' };
const WIM_P = { 90: 'fast alle (über 80 %)', 70: 'etwa 60 bis 80 %', 50: 'etwa 40 bis 60 %', 30: 'weniger als 40 %' };
// a = { l: Länge, s: [Haarart], f: Farbe, v: 0|1, w: { w: Wochen, p: Prozent, t: Text } } aus dem Formular. Ergebnis: Posten, Dauer (auf 5 Min. aufgerundet, höchstens 8 Std.), Preis.
export function salonRechnen(leistungen, S, ls, a) {
  S = S || SALON_STANDARD; a = a || {};
  const z = S.z || SALON_STANDARD.z, ids = [...new Set((Array.isArray(ls) ? ls : []).map((i) => parseInt(i, 10)).filter((i) => leistungen[i]))].slice(0, 12);
  const laenge = SA_LAENGE.includes(a.l) ? a.l : null, farbe = SA_FARBE.includes(a.f) ? a.f : null;
  const art = (Array.isArray(a.s) ? a.s : []).filter((x) => SA_STRUKTUR.includes(x)).slice(0, 4);
  const hN = ids.some((i) => leistungen[i].haar);
  const zu = (haar, fa) => {
    const r = { d: 0, p: 0, g: [] }, add = (id) => { const x = z[id]; if (x && (x[0] || x[1])) { r.d += x[0]; r.p += x[1]; r.g.push(SA_NAME[id]); } };
    if (haar) { if (laenge) add(laenge); art.forEach(add); }
    if (fa) { if (farbe) add(farbe); if (a.v) add('vor'); }
    return r;
  };
  const posten = [];
  const dazu = (name, d0, p0, x, ab, w) => posten.push({ name, dauer: Math.round(d0 * (100 + x.d) / 100), preis: Math.round(p0 * (100 + x.p) / 100), zuschlag: x.g, zd: x.d, zp: x.p, ab: !!ab, dazu: !!w });
  let wa = false;
  // Wimpern: Angaben prüfen. Ergibt die Regel ein neues Set, wird dessen Zeit reserviert; der Preis bleibt der fürs Auffüllen, das neue Set steht als Hinweis daneben.
  const W = S.wimpern || wimpernPruefen(null), aw = a.w && typeof a.w === 'object' ? a.w : null;
  const ww = aw && WIM_W[parseInt(aw.w, 10)] ? parseInt(aw.w, 10) : null, wp = aw && WIM_P[parseInt(aw.p, 10)] ? parseInt(aw.p, 10) : null;
  const wNeu = ww != null && wp != null && (ww > W.wochen || wp < W.prozent);
  let wimpern = null;
  ids.forEach((i) => {
    const l = leistungen[i], wa0 = wimpernAn(S) && istWimpern(l), ns = wa0 && wNeu ? neusetVon(leistungen, l) : null;
    dazu(String(l.name || ''), Math.max(5, +(ns ? ns.dauer : l.dauer) || 30), Math.max(0, +l.preis || 0), zu(l.haar, l.farbe), l.ab);
    if (ns) posten[posten.length - 1].neuset = { name: String(ns.name || ''), preis: Math.max(0, +ns.preis || 0), dauer: Math.max(5, +ns.dauer || 30), von: String(l.name || '') };
    if (wa0 && !wimpern) wimpern = { w: ww, p: wp, t: String((aw && aw.t) || '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 400), neu: !!ns, neuset: ns ? posten[posten.length - 1].neuset : null };
    if (l.waschen) wa = true;
  });
  if (wa && S.waschen && S.waschen.an !== false) dazu(S.waschen.name || 'Waschen & Föhnen', Math.max(5, +S.waschen.dauer || 30), Math.max(0, +S.waschen.preis || 0), zu(hN, false), false, true);
  const dauer = Math.min(480, Math.ceil(posten.reduce((s, x) => s + x.dauer, 0) / 5) * 5);
  const haare = [...(hN ? [laenge && SA_NAME[laenge], ...art.map((x) => SA_NAME[x])] : []), ...(ids.some((i) => leistungen[i].farbe) ? [farbe && SA_NAME[farbe], a.v ? SA_NAME.vor : null] : [])].filter(Boolean);
  return { posten, dauer, preis: posten.reduce((s, x) => s + x.preis, 0), ab: posten.some((x) => x.ab), haare, wimpern };
}

export async function setupLaden(tenant) {
  const [{ data: ps }, { data: s }] = await Promise.all([
    db.from('personal').select('*').eq('tenant_id', tenant).order('reihenfolge').order('created_at'),
    db.from('termin_setup').select('*').eq('tenant_id', tenant).maybeSingle()
  ]);
  return {
    personal: ps || [],
    setup: {
      leistungen: Array.isArray(s && s.leistungen) ? s.leistungen : [{ name: 'Herrenschnitt', dauer: 30 }, { name: 'Damenschnitt', dauer: 60 }, { name: 'Färben', dauer: 90 }],
      raster: (s && s.raster) || 15,
      vorlauf_std: s && s.vorlauf_std != null ? s.vorlauf_std : 2,
      tage: (s && s.tage) || 42,
      absage_std: s && s.absage_std != null ? s.absage_std : 1,
      // Seit 21.10.2026: Ohne eigene Einstellung (Konto unverändert) gilt der Ablauf wie Uncle’s Salon, blank: zuerst die Leistung als runde Kacheln.
      salon: salonPruefen(s && s.salon) || salonPruefen({ an: true, reihe: 'leistung', waschen: { an: false }, limit: 0 }),
      vorhanden: !!s
    }
  };
}

/* Mitarbeiter und Leistungen aus dem Konfigurator übernehmen, solange im Cockpit nichts eingetragen ist.
   nurErstes (für /api/config): nur wenn Uhrzeit-Termine noch nie eingerichtet wurden. Die neue Zeile in
   termin_setup wirkt dabei als Sperre — zwei gleichzeitige Aufrufe legen die Mitarbeiter nicht doppelt an. */
export async function ausKonfigurator(tenant, tc, nurErstes) {
  if (!tenant || !tc) return false;
  // Seit 10.10.2026 mit Arbeitstagen (tage). Ohne sie gilt der Standard der Tabelle.
  const leute = (Array.isArray(tc.personal) ? tc.personal : []).map((m) => ({ name: String((m && m.name) || '').trim().slice(0, 60), zeiten: zeitenPruefen(tc.zeiten) || zeitenAusTagen(m && m.tage) })).filter((m) => m.name).slice(0, 30);
  // Seit 08.10.2026 auch die Angaben fürs Inhaltsverzeichnis (Kategorie, Haare, Waschen, ab-Preis, Hinweis, Für wen)
  const le = (Array.isArray(tc.leistungen) ? tc.leistungen : []).map((l) => leistungSauber(l)).filter((l) => l.name).slice(0, 30);
  const [{ count, error: e1 }, { data: su, error: e2 }] = await Promise.all([
    db.from('personal').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant),
    db.from('termin_setup').select('tenant_id').eq('tenant_id', tenant).maybeSingle()
  ]);
  if (e1 || e2) return false;                     // sql/28 fehlt
  if (nurErstes && (su || count)) return false;   // im Cockpit schon eingerichtet
  if (!su) {
    const zeile = { tenant_id: tenant, raster: [10, 15, 20, 30, 60].includes(+tc.raster) ? +tc.raster : 15, tage: Math.min(180, Math.max(1, parseInt(tc.tage, 10) || 42)) };
    if (le.length) zeile.leistungen = le;
    const sal = salonPruefen(tc.salon);
    if (sal) zeile.salon = sal;
    let { error } = await db.from('termin_setup').insert(zeile);
    if (error && error.code === '42703' && zeile.salon) { delete zeile.salon; ({ error } = await db.from('termin_setup').insert(zeile)); }   // sql/66 fehlt
    if (error && nurErstes) return false;         // ein anderer Aufruf war schneller
  } else if (!nurErstes && le.length) {
    // Seit 09.10.2026: Leistungen sind im Konfigurator bearbeitbar (Name, Dauer, Preis, ab, Kachel).
    // Der Konfigurator holt beim Öffnen den Stand aus dem Cockpit, deshalb gilt beim Speichern seine Liste.
    await db.from('termin_setup').update({ leistungen: le, updated_at: new Date().toISOString() }).eq('tenant_id', tenant).then(() => {}, () => {});
  }
  // Seit 15.10.2026: Wimpern-Regeln und Höchstzahl Anfragen stellt der Betrieb auch im Konfigurator ein. Übrige Einstellungen fürs Inhaltsverzeichnis bleiben, wie das Cockpit sie hat.
  if (su && !nurErstes && tc.salon && typeof tc.salon === 'object' && (tc.salon.wimpern || tc.salon.limit != null)) {
    const { data: alt } = await db.from('termin_setup').select('salon').eq('tenant_id', tenant).maybeSingle().then((r) => r, () => ({ data: null }));
    if (alt && alt.salon && typeof alt.salon === 'object') {
      const neu = salonPruefen({ ...alt.salon, ...(tc.salon.wimpern ? { wimpern: tc.salon.wimpern } : {}), ...(tc.salon.limit != null ? { limit: tc.salon.limit } : {}) });
      await db.from('termin_setup').update({ salon: neu }).eq('tenant_id', tenant).then(() => {}, () => {});
    }
  }
  if (!count && leute.length) await db.from('personal').insert(leute.map((m, i) => (m.zeiten ? { tenant_id: tenant, name: m.name, reihenfolge: i, zeiten: m.zeiten } : { tenant_id: tenant, name: m.name, reihenfolge: i })));
  return true;
}

/* Namen aus dem Konfigurator ins Cockpit übernehmen, auch nach dem ersten Speichern.
   Übernommen wird nur, was sich im Konfigurator geändert hat (alt → neu). So bleiben Namen,
   die im Cockpit gepflegt wurden, stehen. Platzhalter wie „Mitarbeiter 1“ ersetzt der echte
   Name an derselben Stelle immer. Entfernte Mitarbeiter werden ausgeblendet, nicht gelöscht. */
export async function personalAbgleich(tenant, altTc, neuTc) {
  if (!tenant || !neuTc) return;
  const liste = (tc) => (Array.isArray(tc && tc.personal) ? tc.personal : []).map((m) => String((m && m.name) || '').trim().slice(0, 60));
  const alt = liste(altTc), neu = liste(neuTc).filter(Boolean).slice(0, 30);
  if (!neu.length) return;
  const { data: d0, error } = await db.from('personal').select('id, name, aktiv, reihenfolge').eq('tenant_id', tenant).order('reihenfolge');
  if (error || !d0 || !d0.length) return;
  const rows = d0.slice(), platz = /^mitarbeiter(in)?\s*\d*$/i;
  const hat = (n) => rows.some((r) => r.name === n && r.aktiv !== false);
  const umbenennen = async (r, n) => { await db.from('personal').update({ name: n }).eq('id', r.id).eq('tenant_id', tenant); r.name = n; };
  for (let i = 0; i < Math.max(alt.length, neu.length); i++) {
    const a = alt[i], n = neu[i];
    if (a && n && a !== n && !hat(n)) { const r = rows.find((x) => x.name === a); if (r) await umbenennen(r, n); }
  }
  const aktive = rows.filter((r) => r.aktiv !== false);
  for (let i = 0; i < aktive.length && i < neu.length; i++) {
    if (platz.test(aktive[i].name) && !platz.test(neu[i]) && !hat(neu[i])) await umbenennen(aktive[i], neu[i]);
  }
  let max = rows.reduce((m, r) => Math.max(m, +r.reihenfolge || 0), -1);
  for (const n of neu) {
    if (hat(n) || alt.includes(n)) continue;   // war schon im Konfigurator: im Cockpit bewusst entfernt
    const { data: x } = await db.from('personal').insert({ tenant_id: tenant, name: n, reihenfolge: ++max }).select('id, name, aktiv, reihenfolge').single();
    if (x) rows.push(x);
  }
  for (const a of alt) {
    if (!a || neu.includes(a)) continue;
    const r = rows.find((x) => x.name === a && x.aktiv !== false);
    if (r) await db.from('personal').update({ aktiv: false }).eq('id', r.id).eq('tenant_id', tenant);
  }
}

/* Haarlänge/-dicke: 0 kurz, 1 mittel, 2 lang, 3 sehr dick oder sehr lang.
   Eine Leistung trägt zuschlag: [mittel, lang, sehr dick] in Minuten. */
export const HAAR = ['kurz', 'mittel', 'lang', 'sehr dick / sehr lang'];
export function haarPlus(l, h) {
  const z = Array.isArray(l && l.zuschlag) ? l.zuschlag : null, i = parseInt(h, 10);
  if (!z || !(i >= 1 && i <= 3)) return 0;
  return Math.max(0, Math.min(240, +z[i - 1] || 0));
}

/* Notiz am Kunden: über E-Mail oder Telefonnummer wiedererkennen. */
export function notizSchluessel(email, telefon) {
  const k = [], e = String(email || '').trim().toLowerCase();
  if (/^[^@\s]+@[^@\s]+$/.test(e)) k.push('m:' + e);
  let n = String(telefon || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('0')) n = '49' + n.slice(1);
  if (n.length >= 8) k.push('t:' + n);
  return k;
}
export async function notizFuer(tenant, email, telefon) {
  const k = notizSchluessel(email, telefon);
  if (!tenant || !k.length) return null;
  let { data, error } = await db.from('kunden_notiz').select('notiz, plus_min, nicht_da, updated_at').eq('tenant_id', tenant).in('schluessel', k);
  if (error) ({ data, error } = await db.from('kunden_notiz').select('notiz, plus_min, updated_at').eq('tenant_id', tenant).in('schluessel', k));   // ohne sql/52
  if (error || !data || !data.length) return null;   // ohne sql/47: keine Notizen
  data.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return { notiz: data[0].notiz || '', plus: Math.max(...data.map((x) => +x.plus_min || 0)), nicht_da: Math.max(...data.map((x) => +x.nicht_da || 0)) };
}

export function zeitenVon(p) {
  return (p && p.zeiten && typeof p.zeiten === 'object') ? p.zeiten : STANDARD_ZEITEN;
}

// Freie Anfangszeiten an einem Tag für eine Dauer: [{ z:'09:00', p:[personal_id,…] }]
export async function freieZeiten(tenant, datum, dauer, ctx) {
  const { personal, setup } = ctx;
  if (!istIso(datum) || !(dauer > 0)) return [];
  const heute = heuteBerlin();
  if (datum < heute || datum > plusTage(heute, setup.tage)) return [];
  if (ctx.gesperrt && ctx.gesperrt.includes(datum)) return [];
  // Eigener Kalender des Betriebs (lib/_kalender-lesen.js): ganztägig sperrt den Tag, sonst nur die Zeit.
  // Einmal je Abfrage laden, alle Formulare des Kontos zusammen.
  if (ctx._kal === undefined) {
    const { data: ws } = await db.from('widgets').select('belegung').eq('tenant_id', tenant).then((r) => r, () => ({ data: [] }));
    ctx._kal = { ganz: new Set((ws || []).flatMap((w) => kalTage(w.belegung, true))), zeiten: (ws || []).flatMap((w) => kalZeiten(w.belegung)) };
  }
  if (ctx._kal.ganz.has(datum)) return [];
  const wd = new Date(datum + 'T12:00:00Z').getUTCDay();
  const aktive = personal.filter((p) => p.aktiv !== false);
  if (!aktive.length) return [];
  const tagStart = lokal(datum, '00:00');
  const tagEnde = new Date(tagStart.getTime() + 26 * 3600e3);
  const { data: bel } = await db.from('termine').select('id, personal_id, start, ende')
    .eq('tenant_id', tenant).in('status', ['wunsch', 'vorschlag', 'fest'])
    .lt('start', tagEnde.toISOString()).gt('ende', tagStart.toISOString());
  const frueh = Date.now() + (setup.vorlauf_std || 0) * 3600e3;
  const raster = setup.raster || 15;
  const raus = {};
  aktive.forEach((p) => {
    const bereiche = zeitenVon(p)[wd] || [];
    // ctx.ohne: Termine, die nicht als belegt zählen (beim Umbuchen der eigene Termin)
    const belegt = (bel || []).filter((b) => b.personal_id === p.id && !(ctx.ohne && ctx.ohne.includes(b.id))).map((b) => [+new Date(b.start), +new Date(b.ende)]);
    // Private Termine: mit Mitarbeiter-Namen nur für ihn, sonst für alle.
    ctx._kal.zeiten.forEach((z) => { if (Array.isArray(z) && (!z[2] || z[2].includes(p.id)) && z[1] > +tagStart && z[0] < +tagEnde) belegt.push([z[0], z[1]]); });
    bereiche.forEach((r) => {
      if (!Array.isArray(r) || !istZeit(r[0]) || !istZeit(r[1])) return;
      for (let m = minuten(r[0]); m + dauer <= minuten(r[1]); m += raster) {
        const s = lokal(datum, alsZeit(m)).getTime(), e = s + dauer * 60000;
        if (s < frueh) continue;
        if (belegt.some(([x, y]) => s < y && e > x)) continue;
        (raus[alsZeit(m)] = raus[alsZeit(m)] || []).push(p.id);
      }
    });
  });
  return Object.keys(raus).sort().map((z) => ({ z, p: raus[z] }));
}

/* Eine Leistung so speichern, wie Cockpit und Konfigurator sie liefern (lib/termine.js nutzt dieselbe Prüfung). */
export const NEUSET_SATZ = 'Zeit für ein neues Set eingeplant';
export function leistungSauber(l) {
  l = l || {};
  const r = { name: String(l.name || '').trim().slice(0, 80), dauer: Math.min(480, Math.max(5, Math.round((+l.dauer || 30) / 5) * 5)) };
  if (l.preis !== '' && l.preis != null && isFinite(+l.preis) && +l.preis >= 0) r.preis = +l.preis;
  if (['damen', 'herren', 'kinder'].includes(l.fuer)) r.fuer = l.fuer;
  const kat = String(l.kat || '').trim().slice(0, 40); if (kat) r.kat = kat;
  if (l.haar) r.haar = true;
  if (l.farbe) r.farbe = true;
  if (l.waschen) r.waschen = true;
  if (l.ab) r.ab = true;
  if (l.wimpern === true) r.wimpern = true; else if (l.wimpern === false) r.wimpern = false;   // true/false = von Hand, fehlt = von selbst (istWimpern)
  const ns = String(l.neuset || '').trim().slice(0, 80); if (ns) r.neuset = ns;
  const info = String(l.info || '').trim().slice(0, 200); if (info) r.info = info;
  return r;
}

// Reserviert alle Termine einer Anfrage — ganz oder gar nicht.
// liste: [{ leistung:Index, personal:id|'egal', datum, zeit, name }]
export async function reservieren(tenant, widget, liste, kontakt, gesperrt) {
  const ctx = await setupLaden(tenant);
  ctx.gesperrt = gesperrt || [];
  const gruppe = randomUUID();
  const fertig = [];
  const zurueck = async () => { await db.from('termine').delete().eq('gruppe', gruppe); };
  // Notiz am Kunden (z. B. „dickes Haar, +30 Min.“) gilt für den, der bucht — also Person 1.
  const notiz = await notizFuer(tenant, kontakt.email, kontakt.telefon).catch(() => null);
  const kandidatenVon = async (t, dauer) => {
    const frei = await freieZeiten(tenant, t.datum, dauer, ctx);
    const slot = frei.find((x) => x.z === t.zeit);
    let k = slot ? slot.p.slice() : [];
    if (t.personal && t.personal !== 'egal') k = k.filter((id) => id === t.personal);
    return k;
  };
  for (let i = 0; i < liste.length; i++) {
    const t = liste[i] || {};
    // Inhaltsverzeichnis: mehrere Leistungen, Dauer und Preis rechnet der Server selbst nach (salonRechnen)
    const sr = ctx.setup.salon && ctx.setup.salon.an && Array.isArray(t.leistungen) && t.leistungen.length ? salonRechnen(ctx.setup.leistungen, ctx.setup.salon, t.leistungen, t.salon) : null;
    const l = sr ? ctx.setup.leistungen[parseInt(t.leistungen[0], 10)] : ctx.setup.leistungen[+t.leistung];
    if (!l || (sr && !sr.posten.length) || (!sr && l.beratung) || !istIso(t.datum) || !istZeit(t.zeit)) { await zurueck(); return { ok: false, index: i, grund: 'ungueltig' }; }
    const basis = sr ? sr.dauer : Math.max(5, +l.dauer || 30) + haarPlus(l, t.haar);
    const lName = sr ? sr.posten.filter((x) => !x.dazu).map((x) => x.name).join(' + ') + (sr.posten.some((x) => x.dazu) ? ' + ' + sr.posten.filter((x) => x.dazu).map((x) => x.name).join(' + ') : '') : l.name;
    const extra = i === 0 && notiz ? notiz.plus : 0;
    const hinweis = [];
    if (!sr && Array.isArray(l.zuschlag) && t.haar != null && HAAR[+t.haar]) hinweis.push('Haar: ' + HAAR[+t.haar]);
    if (sr && sr.haare.length) hinweis.push('Haare: ' + sr.haare.join(', '));
    if (sr && sr.wimpern) {
      const wi = sr.wimpern;
      hinweis.push('Wimpern: letztes Auffüllen ' + (WIM_W[wi.w] || '?') + ', noch da: ' + (WIM_P[wi.p] || '?') + (wi.t ? ' · „' + wi.t + '“' : ''));
      // Fester Satz: lib/termine.js (aktion „neuset“) erkennt daran, dass die Zeit fürs neue Set schon eingeplant ist.
      if (wi.neuset) hinweis.push(NEUSET_SATZ + ': ' + wi.neuset.name + (wi.neuset.preis ? ', ' + wi.neuset.preis + ' €' : '') + '. Bitte bestätigen');
    }
    if (sr) hinweis.push('Schätzung: ca. ' + sr.dauer + ' Min.' + (sr.preis > 0 ? ', ' + (sr.ab ? 'ab ' : 'ca. ') + sr.preis + ' €' : ''));
    if (i === 0 && notiz && notiz.notiz) hinweis.push('Notiz: ' + notiz.notiz);
    if (i === 0 && notiz && notiz.nicht_da) hinweis.push(notiz.nicht_da + '× nicht erschienen');
    let dauer = basis + extra;
    let kandidaten = await kandidatenVon(t, dauer);
    // Passt die Extra-Zeit aus der Notiz nicht mehr, zurück auf die normale Dauer — der
    // Gast soll wegen einer internen Notiz nicht abgewiesen werden. Der Betrieb sieht es am Termin.
    if (!kandidaten.length && extra) { dauer = basis; kandidaten = await kandidatenVon(t, dauer); if (kandidaten.length) hinweis.push('+' + extra + ' Min. aus der Notiz passten nicht, bitte prüfen'); }
    const start = lokal(t.datum, t.zeit), ende = new Date(start.getTime() + dauer * 60000);
    let treffer = null;
    for (const pid of kandidaten) {
      const p = ctx.personal.find((x) => x.id === pid);
      const zeile = {
        tenant_id: tenant, widget_id: widget, gruppe, person_nr: i + 1,
        personal_id: pid, personal_name: p ? p.name : null,
        start: start.toISOString(), ende: ende.toISOString(),
        leistung: String(lName || '').slice(0, 300), dauer, status: 'wunsch',
        name: String(t.name || kontakt.name || '').slice(0, 120) || null,
        telefon: kontakt.telefon ? String(kontakt.telefon).slice(0, 40) : null,
        email: kontakt.email ? String(kontakt.email).slice(0, 160) : null,
        nachricht: kontakt.nachricht ? String(kontakt.nachricht).slice(0, 1000) : null
      };
      if (hinweis.length) zeile.hinweis = hinweis.join(' · ').slice(0, 500);
      let { data, error } = await db.from('termine').insert(zeile).select('id').single();
      if (error && error.code === '42703' && zeile.hinweis) { delete zeile.hinweis; ({ data, error } = await db.from('termine').insert(zeile).select('id').single()); }  // sql/47 fehlt
      if (!error) { treffer = { id: data.id, personal: p ? p.name : '', leistung: lName, datum: t.datum, zeit: t.zeit, dauer }; if (sr) { treffer.preis = sr.preis; treffer.posten = sr.posten; if (sr.wimpern) treffer.wimpern = sr.wimpern; } break; }
      if (error.code !== '23P01') { await zurueck(); return { ok: false, index: i, grund: 'fehler' }; }
    }
    if (!treffer) { await zurueck(); return { ok: false, index: i, grund: 'vergeben' }; }
    fertig.push(treffer);
  }
  return { ok: true, gruppe, termine: fertig };
}

/* Stand und Tag der Anfrage aus ihren Uhrzeit-Terminen (seit 14.10.2026). Nach jedem Schritt im Hin und Her aufrufen
   (Vorschlag, andere Zeit vom Kunden, Annehmen, Ablehnen, Absagen, Verschieben, Feierabend, Verfallen):
   fester Termin → „gebucht“ mit dessen Tag (bei offener Umbuchung gilt so weiter der bisherige feste Termin),
   nur offene (Wunsch, Vorschlag) → Tag des nächsten offenen, der Stand bleibt,
   keiner mehr aktiv → „verloren“. Geschrieben wird nur, was sich ändert. */
export async function anfrageNachziehen(leadId) {
  if (!leadId) return;
  try {
    const [{ data: tm, error }, { data: ld }] = await Promise.all([
      db.from('termine').select('start, status').eq('lead_id', leadId).in('status', ['wunsch', 'vorschlag', 'fest']).order('start'),
      db.from('leads').select('status, termin').eq('id', leadId).maybeSingle()
    ]);
    if (error || !ld) return;
    const fest = (tm || []).find((t) => t.status === 'fest'), offen = (tm || [])[0];
    const tag = String(ld.termin || '').slice(0, 10), upd = {};
    if (fest) { if (ld.status !== 'gebucht') upd.status = 'gebucht'; const d = lokalText(fest.start).datum; if (tag !== d) upd.termin = d; }
    else if (offen) { const d = lokalText(offen.start).datum; if (tag !== d) upd.termin = d; }
    else if (ld.status !== 'verloren') upd.status = 'verloren';
    if (upd.status) upd.status_am = new Date().toISOString();
    if (Object.keys(upd).length) await db.from('leads').update(upd).eq('id', leadId);
  } catch (e) { /* Anfrage bleibt, wie sie ist */ }
}
