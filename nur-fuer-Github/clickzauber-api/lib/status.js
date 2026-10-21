// GET  /api/status                         → { wartung, text, seit } (öffentlich, für den Hinweis im Cockpit)
// POST /api/status { key, wartung, text }  → nur mit ADMIN_TOKEN (Plattform-Seite)
// POST /api/status { key, app: { min_ios, min_android, ios_id } } → App-Versionen (sql/61, js/cz-native.js)
// POST /api/status { key, architekt: true|false } → Schalter KI im Architekten (sql/73, lib/architekt.js). GET liefert architekt (wirklich an),
//      architekt_an (Schalter) und architekt_schluessel (ANTHROPIC_API_KEY bei Vercel gesetzt).
import { db, cors, body } from './_lib.js';
import { wartungStand } from './_wartung.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    const s = await wartungStand(true);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10');
    // App-Versionen (sql/61). Fehlt die Spalte noch, bleibt es bei der Wartung.
    let app = {};
    try { const { data } = await db.from('plattform_status').select('app_min_ios, app_min_android, ios_app_id').eq('id', 1).maybeSingle(); app = data || {}; } catch (e) { app = {}; }
    let ki = false;
    try { const { data } = await db.from('plattform_status').select('architekt_ki').eq('id', 1).maybeSingle(); ki = !!(data && data.architekt_ki); } catch (e) { ki = false; }
    const schl = !!process.env.ANTHROPIC_API_KEY;
    // kopf: Dieser Server nimmt Token und Schlüssel aus Kopfzeilen (seit 15.10.2026). js/cz-kopf.js verschiebt sie erst danach.
    return res.status(200).json({ ok: true, kopf: true, wartung: !!s.wartung, text: s.text || '', seit: s.seit || null,
      app_min_ios: app.app_min_ios || '', app_min_android: app.app_min_android || '', ios_app_id: app.ios_app_id || '',
      architekt: ki && schl, architekt_an: ki, architekt_schluessel: schl });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const p = body(req);
  if (!process.env.ADMIN_TOKEN || (p.key || '') !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'kein Zugriff' });
  if (p.app && typeof p.app === 'object') {
    const ver = (v) => { v = String(v || '').trim(); return /^\d+(\.\d+){0,3}$/.test(v) ? v : null; };
    const id = String(p.app.ios_id || '').trim();
    const { error: fa } = await db.from('plattform_status').update({ app_min_ios: ver(p.app.min_ios), app_min_android: ver(p.app.min_android), ios_app_id: /^\d{6,12}$/.test(id) ? id : null }).eq('id', 1);
    if (fa) { console.error('status app (sql/61?):', fa.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/61 in Supabase ausgeführt?' }); }
    return res.status(200).json({ ok: true });
  }
  if (p.architekt !== undefined) {
    const { error: fk } = await db.from('plattform_status').update({ architekt_ki: !!p.architekt }).eq('id', 1);
    if (fk) { console.error('status architekt (sql/73?):', fk.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/73 in Supabase ausgeführt?' }); }
    return res.status(200).json({ ok: true, architekt_an: !!p.architekt, architekt_schluessel: !!process.env.ANTHROPIC_API_KEY });
  }
  const an = !!p.wartung;
  const { error } = await db.from('plattform_status').upsert({ id: 1, wartung: an, text: an ? (String(p.text || '').trim().slice(0, 300) || null) : null, seit: an ? new Date().toISOString() : null });
  if (error) { console.error('status (sql/49?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/49 in Supabase ausgeführt?' }); }
  await wartungStand(true);
  return res.status(200).json({ ok: true, wartung: an });
}
