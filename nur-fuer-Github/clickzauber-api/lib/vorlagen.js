// GET  /api/vorlagen?token=…                          → alle Textbausteine des Betriebs
// POST /api/vorlagen { token, vorlage:{…} }            → anlegen oder ändern
// POST /api/vorlagen { token, loeschen:id }            → entfernen
import { db, cors, body, userByToken, rolleVon, darf } from './_lib.js';

const ARTEN = ['zusage', 'absage', 'nachfrage', 'antwort'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const rolle = await rolleVon(user);

  if (req.method === 'GET') {
    const { data } = await db.from('vorlagen').select('*')
      .eq('tenant_id', user.tenant_id).order('sortierung').order('created_at');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, rolle, vorlagen: data || [] });
  }

  if (req.method === 'POST') {
    if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Ihre Rolle darf Vorlagen nicht ändern.' });
    const p = body(req);

    if (p.loeschen) {
      await db.from('vorlagen').delete().eq('id', p.loeschen).eq('tenant_id', user.tenant_id);
      return res.status(200).json({ ok: true });
    }

    const v = p.vorlage || {};
    const titel = String(v.titel || '').trim().slice(0, 120);
    const text = String(v.text || '').trim().slice(0, 4000);
    if (!titel) return res.status(400).json({ ok: false, error: 'Bitte einen Titel angeben.' });
    if (!text) return res.status(400).json({ ok: false, error: 'Die Vorlage hat noch keinen Text.' });

    const satz = {
      tenant_id: user.tenant_id,
      art: ARTEN.includes(v.art) ? v.art : 'antwort',
      titel, text,
      sortierung: parseInt(v.sortierung, 10) || 0,
      updated_at: new Date().toISOString()
    };

    if (v.id) {
      const { error } = await db.from('vorlagen').update(satz).eq('id', v.id).eq('tenant_id', user.tenant_id);
      if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
      return res.status(200).json({ ok: true, id: v.id });
    }
    const { data, error } = await db.from('vorlagen').insert(satz).select('id').maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, id: data && data.id });
  }

  return res.status(405).json({ ok: false });
}
