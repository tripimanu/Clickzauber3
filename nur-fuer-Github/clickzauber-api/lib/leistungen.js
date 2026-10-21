// GET  /api/leistungen?token=…                  → Preise & Leistungen des Betriebs
// GET  /api/leistungen?slug=…                   → öffentlich, nur aktive (für das Widget)
// POST /api/leistungen { token, leistung:{…} }  → anlegen oder ändern
// POST /api/leistungen { token, loeschen:id }   → entfernen
import { db, cors, body, userByToken, rolleVon, darf } from './_lib.js';

const EINHEITEN = ['pauschal', 'pro_person', 'pro_stunde', 'pro_tag'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Öffentlicher Weg: das Widget holt sich die aktiven Leistungen seines Betriebs.
  if (req.method === 'GET' && req.query.slug && !req.query.token) {
    const { data: w } = await db.from('widgets').select('tenant_id').eq('slug', req.query.slug).maybeSingle();
    if (!w || !w.tenant_id) return res.status(404).json({ ok: false });
    const { data } = await db.from('leistungen')
      .select('name, beschreibung, preis, einheit')
      .eq('tenant_id', w.tenant_id).eq('aktiv', true)
      .order('sortierung').order('created_at');
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600');
    return res.status(200).json({ ok: true, leistungen: data || [] });
  }

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const rolle = await rolleVon(user);

  if (req.method === 'GET') {
    const { data } = await db.from('leistungen').select('*')
      .eq('tenant_id', user.tenant_id).order('sortierung').order('created_at');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, rolle, leistungen: data || [] });
  }

  if (req.method === 'POST') {
    if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Ihre Rolle darf Preise nicht ändern.' });
    const p = body(req);

    if (p.loeschen) {
      await db.from('leistungen').delete().eq('id', p.loeschen).eq('tenant_id', user.tenant_id);
      return res.status(200).json({ ok: true });
    }

    if (Array.isArray(p.reihenfolge)) {
      await Promise.all(p.reihenfolge.map((id, i) =>
        db.from('leistungen').update({ sortierung: i }).eq('id', id).eq('tenant_id', user.tenant_id)));
      return res.status(200).json({ ok: true });
    }

    const l = p.leistung || {};
    const name = String(l.name || '').trim().slice(0, 160);
    if (!name) return res.status(400).json({ ok: false, error: 'Bitte einen Namen angeben.' });
    const preis = l.preis === '' || l.preis == null ? null : Number(String(l.preis).replace(/\./g, '').replace(',', '.'));
    if (preis != null && (!isFinite(preis) || preis < 0)) return res.status(400).json({ ok: false, error: 'Der Preis sieht nicht wie eine Zahl aus.' });

    const satz = {
      tenant_id: user.tenant_id,
      name,
      beschreibung: l.beschreibung ? String(l.beschreibung).slice(0, 600) : null,
      preis,
      einheit: EINHEITEN.includes(l.einheit) ? l.einheit : 'pauschal',
      aktiv: l.aktiv !== false,
      sortierung: parseInt(l.sortierung, 10) || 0,
      updated_at: new Date().toISOString()
    };

    if (l.id) {
      const { error } = await db.from('leistungen').update(satz).eq('id', l.id).eq('tenant_id', user.tenant_id);
      if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
      return res.status(200).json({ ok: true, id: l.id });
    }
    const { data, error } = await db.from('leistungen').insert(satz).select('id').maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, id: data && data.id });
  }

  return res.status(405).json({ ok: false });
}
