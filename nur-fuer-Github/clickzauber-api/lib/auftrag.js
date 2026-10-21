// /api/auftrag — Food Truck, Catering, Foto & Co.
//   GET  ?aktion=km&w=<formular>&plz=<plz>        oeffentlich: Anfahrt in km ab der PLZ im Profil des Betriebs
//   POST { token, aktion:'ausweich', id, tage }   Betreiber: zwei oder drei Ausweichtage vorschlagen -> Link fuer den Kunden
//   GET  ?aktion=ausweich&l=<id>&k=<schluessel>   oeffentlich: Vorschlag ansehen
//   POST { aktion:'ausweich-wahl', l, k, tag }    oeffentlich: Kunde waehlt einen Tag -> Push an den Betrieb
//   POST { aktion:'ausweich-wahl', l, k, tag:'keiner', wunsch, text }  oeffentlich: kein Tag passt -> Push an den Betrieb
//   POST { aktion:'gast-link', token, id }        Link „Absagen oder anderen Tag wünschen“ für die Bestätigung
//   GET  { aktion:'gast', l, k }                  oeffentlich: Stand der Anfrage für meine-anfrage.html
//   POST { aktion:'gast', l, k, was:'absage'|'verschieben', wunsch, text }  oeffentlich -> Push an den Betrieb
//   GET  ?aktion=adresse&w=<formular>&q=<text>    oeffentlich: Adressvorschlaege (OpenStreetMap/Photon, mit GOOGLE_MAPS_KEY: Google)
//   GET  ?aktion=ort&w=<formular>&id=<place>      oeffentlich: nur Google, Adresse + km zum gewaehlten Vorschlag
// Die IP des Kunden geht nicht an den Adressdienst: Die Anfrage stellt dieser Server.
import { createHmac } from 'crypto';
import { db, cors, userByToken, body, GEHEIM } from './_lib.js';
import { meineAnfrage } from './anfrage.js';
import { plzKm, plzAus, plzPunkt, punktKm } from './_plz.js';
import { pushSenden, betriebMelden } from './_push.js';
import { gastLink, gastSchluessel } from './_gastlink.js';
import { wartelisteMelden } from './_warteliste.js';
import { setupLaden, lokalText } from './_termine.js';
import { kalenderNachziehen } from './_kalender-direkt.js';

const istIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
function schluessel(id) {
  return createHmac('sha256', GEHEIM).update('ausweich:' + id).digest('hex').slice(0, 20);
}
function deTag(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getUTCDay()] + ', ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.';
}
async function betriebName(tid) {
  const { data } = await db.from('users').select('firma, vorname, nachname, plz_ort').eq('tenant_id', tid).order('created_at').limit(1);
  const u = data && data[0];
  return { name: u ? (u.firma || [u.vorname, u.nachname].filter(Boolean).join(' ')) : '', plz: u ? plzAus(u.plz_ort) : null };
}

async function betriebVonWidget(w) {
  const { data: wd } = await db.from('widgets').select('tenant_id').eq('slug', w).maybeSingle();
  return wd ? betriebName(wd.tenant_id) : null;
}
async function holeJson(url, opt) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 3000);
  try { const r = await fetch(url, Object.assign({ signal: ac.signal }, opt || {})); return r.ok ? await r.json() : null; }
  catch (e) { return null; } finally { clearTimeout(t); }
}
function photonText(p) {
  const strasse = [p.street || (p.type === 'street' ? p.name : ''), p.housenumber].filter(Boolean).join(' ');
  const name = p.name && p.type !== 'street' && p.type !== 'house' && p.type !== 'city' && p.name !== p.street ? p.name : '';
  const ort = [p.postcode, p.city || p.town || p.village || (p.type === 'city' ? p.name : '') || p.district].filter(Boolean).join(' ');
  return [name, strasse, ort].filter(Boolean).join(', ');
}
const VORSCHLAG = new Map();

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const p = req.method === 'POST' ? body(req) : (req.query || {});
  const aktion = String(p.aktion || '');

  if (req.method === 'GET' && aktion === 'km') {
    const plz = plzAus(p.plz), w = String(p.w || '');
    if (!plz || !w) return res.status(400).json({ ok: false, error: 'plz oder formular fehlt' });
    const b = await betriebVonWidget(w);
    if (!b) return res.status(404).json({ ok: false });
    const km = b.plz ? plzKm(b.plz, plz) : null;
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).json({ ok: km != null, km });
  }

  if (req.method === 'GET' && aktion === 'adresse') {
    const q = String(p.q || '').trim().slice(0, 120), w = String(p.w || ''), sess = String(p.s || '').slice(0, 60);
    if (q.length < 3 || !w) return res.status(400).json({ ok: false });
    const key = w + '|' + q.toLowerCase(), alt = VORSCHLAG.get(key);
    if (alt && Date.now() - alt.t < 6 * 3600e3) return res.status(200).json(alt.v);
    const b = await betriebVonWidget(w);
    if (!b) return res.status(404).json({ ok: false });
    const mitte = b.plz ? plzPunkt(b.plz) : null, google = process.env.GOOGLE_MAPS_KEY;
    let liste = [];
    if (google) {
      const anfrage = { input: q, languageCode: 'de', includedRegionCodes: ['de', 'at', 'ch'] };
      if (sess) anfrage.sessionToken = sess;
      if (mitte) anfrage.locationBias = { circle: { center: { latitude: mitte[0], longitude: mitte[1] }, radius: 50000 } };
      const j = await holeJson('https://places.googleapis.com/v1/places:autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': google }, body: JSON.stringify(anfrage) });
      liste = ((j && j.suggestions) || []).map((s) => s.placePrediction).filter(Boolean).slice(0, 5)
        .map((x) => ({ t: String((x.text && x.text.text) || '').replace(/, Deutschland$/, ''), id: x.placeId }));
    } else {
      const j = await holeJson('https://photon.komoot.io/api/?lang=de&limit=10&q=' + encodeURIComponent(q) + (mitte ? '&lat=' + mitte[0] + '&lon=' + mitte[1] : ''),
        { headers: { 'User-Agent': 'clickzauber.de Adressvorschlaege im Anfrageformular' } });
      const gesehen = new Set();
      for (const f of (j && j.features) || []) {
        const pr = f.properties || {};
        if (!['DE', 'AT', 'CH'].includes(pr.countrycode)) continue;
        const t = photonText(pr);
        if (!t || gesehen.has(t)) continue;
        gesehen.add(t);
        const c = f.geometry && f.geometry.coordinates;
        liste.push({ t, km: b.plz && c ? punktKm(b.plz, c[1], c[0]) : null });
        if (liste.length >= 5) break;
      }
    }
    const v = { ok: true, liste, quelle: google ? 'google' : 'osm' };
    if (VORSCHLAG.size > 800) VORSCHLAG.clear();
    VORSCHLAG.set(key, { t: Date.now(), v });
    return res.status(200).json(v);
  }

  if (req.method === 'GET' && aktion === 'ort') {
    const id = String(p.id || ''), w = String(p.w || ''), sess = String(p.s || '').slice(0, 60), google = process.env.GOOGLE_MAPS_KEY;
    if (!google || !/^[\w-]{10,300}$/.test(id) || !w) return res.status(400).json({ ok: false });
    const b = await betriebVonWidget(w);
    if (!b) return res.status(404).json({ ok: false });
    const j = await holeJson('https://places.googleapis.com/v1/places/' + encodeURIComponent(id) + '?languageCode=de' + (sess ? '&sessionToken=' + encodeURIComponent(sess) : ''),
      { headers: { 'X-Goog-Api-Key': google, 'X-Goog-FieldMask': 'formattedAddress,location' } });
    if (!j || !j.location) return res.status(200).json({ ok: false });
    return res.status(200).json({ ok: true, t: String(j.formattedAddress || '').replace(/, Deutschland$/, ''), km: b.plz ? punktKm(b.plz, j.location.latitude, j.location.longitude) : null });
  }

  if (req.method === 'POST' && aktion === 'ausweich') {
    const user = await userByToken(p.token);
    if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
    const lead = await meineAnfrage(p.id, user);
    if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });
    const heute = new Date().toISOString().slice(0, 10);
    const tage = (Array.isArray(p.tage) ? p.tage : []).filter((t) => istIso(t) && t >= heute).slice(0, 3);
    if (!tage.length) return res.status(400).json({ ok: false, error: 'Bitte mindestens einen Tag waehlen.' });
    const answers = Object.assign({}, lead.answers || {}, { _ausweich: { tage, am: new Date().toISOString() } });
    const { error } = await db.from('leads').update({ answers }).eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, link: 'https://clickzauber.de/ausweich.html?l=' + lead.id + '&k=' + schluessel(lead.id) });
  }

  if (req.method === 'POST' && aktion === 'gast-link') {
    const user = await userByToken(p.token);
    if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
    const lead = await meineAnfrage(p.id, user);
    if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });
    return res.status(200).json({ ok: true, link: gastLink(lead.id) });
  }

  // Der Gast sagt ab oder wünscht einen anderen Tag. Bei ganzen Tagen (Location, Food Truck …) ändert sich der Stand nicht von selbst:
  // Der Betrieb bekommt eine Push-Nachricht und entscheidet im Cockpit (Tag freigeben, Absage vormerken, umbuchen).
  // Seit 09.10.2026: Hat die Anfrage Uhrzeit-Termine (Friseur, Kosmetik …), sagt „absage“ sie sofort ab, genau wie der Absage-Link
  // aus der Bestätigung (lib/termine.js): Termine „abgesagt“, Anfrage „Verloren“, Zeit wieder frei, Warteliste, Kalender.
  // Ausnahme: kurzfristig (innerhalb absage_std): dann bleibt es eine Meldung, der Betrieb entscheidet.
  if (aktion === 'gast') {
    const id = String(p.l || ''), k = String(p.k || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || k !== gastSchluessel(id)) return res.status(404).json({ ok: false, error: 'Link ungueltig' });
    const { data: lead } = await db.from('leads').select('id, tenant_id, name, termin, answers, status, verlauf').eq('id', id).maybeSingle();
    if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });
    const b = await betriebName(lead.tenant_id);
    // Schon bearbeitet (der Betrieb hat danach etwas eingetragen)? Dann darf der Gast erneut absagen oder verschieben.
    const g0 = (lead.answers || {})._gast || null;
    const g = g0 && !(Array.isArray(lead.verlauf) ? lead.verlauf : []).some((v) => v.am > g0.am && v.wer && v.wer !== 'Gast') ? g0 : null;
    if (req.method === 'GET') {
      const vergangen = !!(lead.termin && String(lead.termin).slice(0, 10) < new Date().toISOString().slice(0, 10));
      return res.status(200).json({ ok: true, betrieb: b.name, name: String(lead.name || '').split(' ')[0], termin: lead.termin, fest: lead.status === 'gebucht', zu: lead.status === 'verloren', vergangen, gemeldet: g });
    }
    if (lead.status === 'verloren') return res.status(400).json({ ok: false, error: 'Diese Anfrage ist schon abgeschlossen.' });
    if (lead.termin && String(lead.termin).slice(0, 10) < new Date().toISOString().slice(0, 10)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon vorbei.' });
    const was = p.was === 'verschieben' ? 'verschieben' : p.was === 'absage' ? 'absage' : '';
    if (!was) return res.status(400).json({ ok: false, error: 'Bitte wählen Sie, was Sie möchten.' });
    // Doppelt getippt: dieselbe Meldung binnen 10 Minuten nicht noch einmal melden.
    if (g && g.was === was && Date.now() - Date.parse(g.am) < 600e3) return res.status(200).json({ ok: true, gemeldet: g });
    const heute = new Date().toISOString().slice(0, 10);
    const wunsch = was === 'verschieben' && istIso(p.wunsch) && p.wunsch >= heute ? String(p.wunsch) : null;
    const text = String(p.text || '').trim().slice(0, 300) || null;
    const jetzt = new Date().toISOString();
    const answers = Object.assign({}, lead.answers, { _gast: { was, am: jetzt, wunsch, text } });
    const verlauf = [...(Array.isArray(lead.verlauf) ? lead.verlauf : []), { am: jetzt, was: 'gast', wert: (was === 'absage' ? 'Gast möchte absagen' : 'Gast möchte verschieben' + (wunsch ? ' auf ' + deTag(wunsch) : '')) + (text ? ' · ' + text : ''), wer: 'Gast' }];
    // Uhrzeit-Termine dieser Anfrage, die noch kommen
    let tm = [];
    if (was === 'absage') {
      const r = await db.from('termine').select('id, start, status, tenant_id').eq('lead_id', id).in('status', ['wunsch', 'vorschlag', 'fest']).gt('start', jetzt).then((x) => x, () => ({ data: [] }));
      tm = r.data || [];
    }
    let sofort = false;
    if (tm.length) {
      const ctx = await setupLaden(lead.tenant_id).catch(() => null);
      const std = ctx && ctx.setup && ctx.setup.absage_std != null ? +ctx.setup.absage_std : 1;
      const erster = Math.min(...tm.map((t) => Date.parse(t.start)));
      sofort = erster - Date.now() >= std * 3600e3;
    }
    if (sofort) {
      const ids = tm.map((t) => t.id);
      await db.from('termine').update({ status: 'abgesagt', status_am: jetzt }).in('id', ids).in('status', ['wunsch', 'vorschlag', 'fest']).then(() => {}, () => {});
      await db.from('termine').update({ bescheid: null }).in('id', ids).then(() => {}, () => {});
      await db.from('termine').update({ status: 'abgesagt', status_am: jetzt }).in('ersetzt', ids).in('status', ['wunsch', 'vorschlag']).then(() => {}, () => {});
      verlauf[verlauf.length - 1].wert = 'Gast hat abgesagt' + (text ? ' · ' + text : '');
      const { error } = await db.from('leads').update({ answers, verlauf, status: 'verloren', status_am: jetzt }).eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      const tage = [...new Set(tm.map((t) => lokalText(t.start).datum))];
      for (const d of tage) await wartelisteMelden(lead.tenant_id, d, null).catch(() => {});
      await kalenderNachziehen(lead.tenant_id).catch(() => null);
      const w = lokalText(tm.slice().sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0].start);
      const bald = Math.min(...tm.map((t) => Date.parse(t.start))) - Date.now() < 24 * 3600e3;
      await betriebMelden(lead.tenant_id, {
        titel: bald ? 'Kurzfristig abgesagt' : 'Termin abgesagt',
        text: (lead.name || 'Ein Kunde') + ' hat den Termin am ' + deTag(w.datum) + ' um ' + w.zeit + ' Uhr abgesagt. Die Zeit ist wieder frei.' + (text ? ' „' + text + '“' : ''),
        url: 'clickzauber-cockpit-live.html#anfrage-' + id, tag: 'cz-gast-' + id
      }).catch(() => {});
      return res.status(200).json({ ok: true, gemeldet: answers._gast, abgesagt: true });
    }
    const { error } = await db.from('leads').update({ answers, verlauf }).eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    await betriebMelden(lead.tenant_id, {
      titel: was === 'absage' ? (lead.name || 'Ein Gast') + ' möchte absagen' : (lead.name || 'Ein Gast') + ' möchte verschieben',
      text: (lead.termin ? 'Termin ' + deTag(String(lead.termin).slice(0, 10)) + '. ' : '') + (wunsch ? 'Wunsch: ' + deTag(wunsch) + '. ' : '') + (text ? '„' + text + '“ ' : '') + 'Jetzt antworten.',
      url: 'clickzauber-cockpit-live.html#anfrage-' + id, tag: 'cz-gast-' + id
    }).catch(() => {});
    return res.status(200).json({ ok: true, gemeldet: answers._gast });
  }

  if (aktion === 'ausweich' || aktion === 'ausweich-wahl') {
    const id = String(p.l || ''), k = String(p.k || '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || k !== schluessel(id)) return res.status(404).json({ ok: false, error: 'Link ungueltig' });
    const { data: lead } = await db.from('leads').select('id, tenant_id, name, termin, answers, status').eq('id', id).maybeSingle();
    const aw = lead && lead.answers && lead.answers._ausweich;
    if (!lead || !aw) return res.status(404).json({ ok: false, error: 'Kein Vorschlag vorhanden' });
    const b = await betriebName(lead.tenant_id);
    // Inzwischen abgesagt oder an einem anderen Tag fest: der Vorschlag gilt nicht mehr.
    const vorbeiAw = lead.status === 'verloren' ? 'zu' : lead.status === 'gebucht' && !aw.gewaehlt ? 'fest' : null;
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, betrieb: b.name, name: String(lead.name || '').split(' ')[0], termin: lead.termin, tage: aw.tage || [], gewaehlt: aw.gewaehlt || null, keiner: !!aw.keiner, vorbei: vorbeiAw });
    }
    if (vorbeiAw) return res.status(410).json({ ok: false, error: vorbeiAw === 'zu' ? 'Dieser Vorschlag gilt nicht mehr. Bitte melden Sie sich direkt beim Betrieb.' : 'Ihr Termin steht schon fest. Bei Fragen melden Sie sich bitte direkt beim Betrieb.' });
    const tag = String(p.tag || '');
    if (aw.gewaehlt) return res.status(200).json({ ok: true, gewaehlt: aw.gewaehlt });
    if (aw.keiner) return res.status(200).json({ ok: true, keiner: true });
    // Keiner der Tage passt: festhalten, Betrieb bekommt Push und kann neue Tage vorschlagen oder absagen.
    if (tag === 'keiner') {
      const heute = new Date().toISOString().slice(0, 10);
      const wunsch = istIso(p.wunsch) && p.wunsch >= heute ? String(p.wunsch) : null;
      const text = String(p.text || '').trim().slice(0, 300) || null;
      const answers = Object.assign({}, lead.answers, { _ausweich: Object.assign({}, aw, { keiner: { am: new Date().toISOString(), wunsch, text } }) });
      const { error } = await db.from('leads').update({ answers }).eq('id', id);
      if (error) return res.status(500).json({ ok: false, error: error.message });
      await betriebMelden(lead.tenant_id, { titel: 'Kein Ausweichtag passt', text: (lead.name || 'Ein Kunde') + (wunsch ? ' wünscht sich stattdessen ' + deTag(wunsch) + '.' : ' kann an keinem der Tage.') + ' Jetzt antworten.', url: 'clickzauber-cockpit-live.html#anfrage-' + id, tag: 'cz-auftrag-' + id }).catch(() => {});
      return res.status(200).json({ ok: true, keiner: true });
    }
    if (!(aw.tage || []).includes(tag)) return res.status(400).json({ ok: false, error: 'Dieser Tag steht nicht zur Wahl.' });
    const answers = Object.assign({}, lead.answers, { _ausweich: Object.assign({}, aw, { gewaehlt: tag, gewaehlt_am: new Date().toISOString() }) });
    const { error } = await db.from('leads').update({ answers, termin: tag, status: 'neu' }).eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    await betriebMelden(lead.tenant_id, { titel: 'Ausweichtermin gewählt', text: (lead.name || 'Ein Kunde') + ' möchte am ' + deTag(tag) + ' kommen. Jetzt bestätigen.', url: 'clickzauber-cockpit-live.html#anfrage-' + id, tag: 'cz-auftrag-' + id }).catch(() => {});
    return res.status(200).json({ ok: true, gewaehlt: tag });
  }
  return res.status(400).json({ ok: false, error: 'unbekannte Aktion' });
}
