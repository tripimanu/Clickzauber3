// POST /api/warteliste { widget, datum, personal?, name, email?, telefon?, consent }  → eintragen (öffentlich)
// GET  /api/warteliste?token=…                                                    → Einträge ab heute
// POST /api/warteliste { token, aktion:'loeschen', id }                             → Eintrag entfernen
import { db, cors, body, userByToken, rolleVon, darf } from './_lib.js';

const istIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? body(req) : req.query;

  if (req.method === 'POST' && !p.token) {
    if (!p.consent) return res.status(400).json({ ok: false, error: 'Bitte der Speicherung zustimmen.' });
    if (!istIso(p.datum)) return res.status(400).json({ ok: false, error: 'Datum fehlt.' });
    const email = String(p.email || '').trim().toLowerCase();
    const telefon = String(p.telefon || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) && telefon.replace(/\D/g, '').length < 6) {
      return res.status(400).json({ ok: false, error: 'Bitte eine E-Mail-Adresse oder Telefonnummer angeben.' });
    }
    const { data: w } = await db.from('widgets').select('tenant_id, status').eq('slug', String(p.widget || '')).maybeSingle();
    if (!w || !w.tenant_id || w.status !== 'live') return res.status(404).json({ ok: false });
    const { count } = await db.from('warteliste').select('id', { count: 'exact', head: true }).eq('widget_id', p.widget).eq('datum', p.datum);
    if ((count || 0) >= 50) return res.status(429).json({ ok: false, error: 'Die Warteliste für diesen Tag ist voll.' });
    const { error } = await db.from('warteliste').insert({
      tenant_id: w.tenant_id, widget_id: String(p.widget), datum: p.datum,
      personal_id: p.personal && p.personal !== 'egal' ? String(p.personal) : null,
      name: String(p.name || '').trim().slice(0, 120) || null,
      email: email || null, telefon: telefon.slice(0, 40) || null
    });
    if (error) return res.status(500).json({ ok: false, error: 'Eintragen fehlgeschlagen.' });
    // Sprache des Gastes getrennt merken, damit Eintragen auch ohne sql/34 klappt
    if (['sq', 'en', 'fr', 'it', 'es', 'tr'].includes(p.sprache)) {
      let q = db.from('warteliste').update({ sprache: p.sprache }).eq('widget_id', String(p.widget)).eq('datum', p.datum).is('sprache', null);
      q = email ? q.eq('email', email) : q.eq('telefon', telefon.slice(0, 40));
      await q.then(() => {}, () => {});
    }
    return res.status(200).json({ ok: true });
  }

  const user = await userByToken(p.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  if (req.method === 'GET') {
    const heute = new Date().toISOString().slice(0, 10);
    const { data } = await db.from('warteliste').select('*').eq('tenant_id', user.tenant_id).gte('datum', heute).order('datum').order('created_at').limit(500);
    const ids = [...new Set((data || []).map((x) => x.personal_id).filter(Boolean))];
    let namen = {};
    if (ids.length) {
      const { data: ps } = await db.from('personal').select('id, name').in('id', ids);
      (ps || []).forEach((x) => { namen[x.id] = x.name; });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, liste: (data || []).map((x) => ({ ...x, personal_name: namen[x.personal_id] || null })) });
  }

  if (req.method === 'POST' && p.aktion === 'loeschen') {
    if (!darf(await rolleVon(user), 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Nur lesen erlaubt.' });
    await db.from('warteliste').delete().eq('id', String(p.id || '')).eq('tenant_id', user.tenant_id);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ ok: false });
}
