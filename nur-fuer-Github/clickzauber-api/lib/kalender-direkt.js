// Echtzeit-Kalender verbinden (siehe _kalender-direkt.js)
// GET  /api/kalender-direkt?token=…                         → Stand
// POST /api/kalender-direkt { token, aktion:'start', art:'google'|'microsoft' } → { url } zur Anmeldung beim Anbieter
// GET  /api/kalender-zurueck?code=…&state=…                 → Rückkehr vom Anbieter, dann zurück ins Cockpit
// POST /api/kalender-direkt { token, aktion:'icloud', appleid, passwort }
// POST /api/kalender-direkt { token, aktion:'jetzt' }        → sofort abgleichen und eigene Termine neu lesen
// POST /api/kalender-direkt { token, aktion:'trennen' }      → Einträge entfernen, Verbindung löschen
import { db, cors, body, userByToken, rolleVon, darf, GEHEIM } from './_lib.js';
import crypto from 'crypto';
import { kontoLesen } from './_kalender-lesen.js';
import { verschluesseln, kalenderNachziehen, kalenderAufraeumen, icloudEinrichten, GOOGLE_OK, MS_OK, MS_SCOPE } from './_kalender-direkt.js';

const API_HOST = process.env.API_HOST || 'https://clickzauber-api.vercel.app';
const SITE = process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de';
const ZURUECK = API_HOST + '/api/kalender-zurueck';
const zeichen = (s) => crypto.createHmac('sha256', GEHEIM).update('kal.' + s).digest('hex').slice(0, 32);
const cockpit = (q) => SITE + '/clickzauber-cockpit-live.html?kal=' + q + '#kalender';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? body(req) : req.query;

  if (req.method === 'GET' && (p.aktion === 'zurueck' || p.code || p.error)) return zurueck(req, res, p);

  const user = await userByToken(p.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const tid = user.tenant_id;

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const [{ data: v, error }, { data: w1 }] = await Promise.all([
      db.from('kalender_direkt').select('art, konto, aktiv, stand, fehler, verbunden_am').eq('tenant_id', tid).maybeSingle(),
      db.from('widgets').select('belegung').eq('tenant_id', tid).limit(1).maybeSingle()
    ]);
    const bw = (w1 && w1.belegung) || {};
    return res.status(200).json({ ok: true, bereit: !error, google: GOOGLE_OK, microsoft: MS_OK, icloud: true,
      verbunden: !!(v && v.aktiv), art: v ? v.art : null, konto: v ? v.konto : null, stand: v ? v.stand : null, fehler: v ? v.fehler : null, seit: v ? v.verbunden_am : null,
      // Umgekehrt: eigene Termine, die clickzauber aus diesem Kalender gelesen hat (lib/_kalender-lesen.js)
      gelesen: bw.dk_stand || null, lese_fehler: bw.dk_fehler || null, gelesen_tage: Array.isArray(bw.dk_tage) ? bw.dk_tage.length : 0 });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const rolle = await rolleVon(user);
  if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Mit Ihrem Zugang können Sie das nicht ändern.' });

  if (p.aktion === 'start') {
    const ts = Date.now(), state = [p.art, tid, ts, zeichen(p.art + '.' + tid + '.' + ts)].join('.');
    if (p.art === 'google' && GOOGLE_OK) {
      const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: ZURUECK, response_type: 'code', access_type: 'offline', prompt: 'consent',
        include_granted_scopes: 'true', scope: 'https://www.googleapis.com/auth/calendar.events openid email', state });
      return res.status(200).json({ ok: true, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + q });
    }
    if (p.art === 'microsoft' && MS_OK) {
      const q = new URLSearchParams({ client_id: process.env.MS_CLIENT_ID, redirect_uri: ZURUECK, response_type: 'code', response_mode: 'query', prompt: 'select_account', scope: MS_SCOPE, state });
      return res.status(200).json({ ok: true, url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + q });
    }
    return res.status(400).json({ ok: false, error: 'Diese Verbindung ist bei clickzauber noch nicht freigeschaltet.' });
  }

  if (p.aktion === 'icloud') {
    const appleid = String(p.appleid || '').trim(), pw = String(p.passwort || '').replace(/\s/g, '');
    if (!/@/.test(appleid) || pw.length < 12) return res.status(400).json({ ok: false, error: 'Bitte Apple-ID und das App-Passwort (16 Zeichen) eintragen.' });
    const r = await icloudEinrichten(appleid, pw);
    if (r.fehler) return res.status(400).json({ ok: false, error: r.fehler });
    const erg = await speichern(tid, 'icloud', appleid, { appleid, passwort: pw }, r.kalender);
    if (erg) return res.status(500).json({ ok: false, error: erg });
    const s = await kalenderNachziehen(tid, { zeit: 20000, max: 200 });
    await kontoLesen(tid).catch(() => null);
    return res.status(200).json({ ok: true, art: 'icloud', konto: appleid, abgleich: s });
  }

  if (p.aktion === 'jetzt') {
    const s = await kalenderNachziehen(tid, { zeit: 20000, max: 200 });
    const l = await kontoLesen(tid).catch(() => null);
    return res.status(200).json({ ok: !!(s && s.ok) && !(l && l.ok === false), ...(s || {}), lesen: l, fehler: (s && s.fehler) || (l && l.fehler) || null });
  }

  if (p.aktion === 'trennen') {
    await kalenderAufraeumen(tid).catch(() => {});
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ ok: false, error: 'Unbekannte Aktion.' });
}

async function speichern(tid, art, konto, zugang, kalender) {
  const { error } = await db.from('kalender_direkt').upsert({ tenant_id: tid, art, konto: String(konto || '').slice(0, 160), zugang: verschluesseln(zugang),
    kalender_id: kalender || null, aktiv: true, fehler: null, laeuft_bis: null, verbunden_am: new Date().toISOString() });
  if (error) { console.error('kalender_direkt (sql/48?):', error.message); return 'Speichern fehlgeschlagen. Ist sql/48 in Supabase ausgeführt?'; }
  // Ein anderer Anbieter vorher? Dessen Zuordnungen gelten nicht mehr.
  await db.from('kalender_eintrag').delete().eq('tenant_id', tid).then(() => {}, () => {});
  return null;
}

async function zurueck(req, res, p) {
  const weiter = (q) => { res.setHeader('Location', cockpit(q)); return res.status(302).end(); };
  if (p.error) return weiter('abgebrochen');
  const [art, tid, ts, sig] = String(p.state || '').split('.');
  if (!art || !tid || !ts || sig !== zeichen(art + '.' + tid + '.' + ts) || Date.now() - +ts > 20 * 60e3) return weiter('ungueltig');
  try {
    let tok, konto = '';
    if (art === 'google') {
      tok = await tausch('https://oauth2.googleapis.com/token', { code: p.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: ZURUECK, grant_type: 'authorization_code' });
      try { konto = JSON.parse(Buffer.from(String(tok.id_token || '').split('.')[1] || '', 'base64url').toString()).email || ''; } catch {}
    } else if (art === 'microsoft') {
      tok = await tausch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { code: p.code, client_id: process.env.MS_CLIENT_ID, client_secret: process.env.MS_CLIENT_SECRET, redirect_uri: ZURUECK, grant_type: 'authorization_code', scope: MS_SCOPE });
      try { const me = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: 'Bearer ' + tok.access_token } }).then((r) => r.json()); konto = me.mail || me.userPrincipalName || ''; } catch {}
    } else return weiter('ungueltig');
    if (!tok.refresh_token) return weiter('ohne-dauerzugang');
    const f = await speichern(tid, art, konto, { refresh: tok.refresh_token, access: tok.access_token, ablauf: Date.now() + (+tok.expires_in || 3000) * 1000 }, art === 'google' ? 'primary' : null);
    if (f) return weiter('fehler');
    await kalenderNachziehen(tid, { zeit: 15000, max: 150 }).catch(() => {});
    await kontoLesen(tid).catch(() => null);
    return weiter('ok');
  } catch (e) {
    console.error('kalender zurueck', art, e && e.message);
    return weiter('fehler');
  }
}
async function tausch(url, felder) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(felder).toString() });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || String(r.status));
  return j;
}
