// GET  /api/kontakte?key=…               → alle eigenen Kontakte
// POST /api/kontakte { key, kontakt }     → anlegen oder ändern (id entscheidet)
// POST /api/kontakte { key, loeschen:id } → entfernen
// Ihr eigenes Kontaktbuch — geräteübergreifend, damit unterwegs Eingetragenes am Rechner ankommt.
import { db, cors, body } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const key = req.method === 'POST' ? body(req).key : req.query.key;
  if (!process.env.ADMIN_TOKEN || key !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'kein Zugriff' });
  }

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('kontakte')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (error) return res.status(500).json({ error: 'laden fehlgeschlagen' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, kontakte: data || [] });
  }

  if (req.method === 'POST') {
    const p = body(req);

    if (p.loeschen) {
      const { error } = await db.from('kontakte').delete().eq('id', p.loeschen);
      if (error) return res.status(500).json({ error: 'löschen fehlgeschlagen' });
      return res.status(200).json({ ok: true });
    }

    const k = p.kontakt || {};
    if (!k.firma && !k.name) return res.status(400).json({ error: 'Name oder Firma fehlt' });

    const satz = {
      firma: k.firma || null,
      name: k.name || null,
      email: k.email ? String(k.email).trim().toLowerCase() : null,
      telefon: k.telefon || null,
      ort: k.ort || null,
      stufe: k.stufe || 'notiz',        // notiz | angesprochen | demo | angebot | kunde | abgesagt
      notiz: k.notiz || null,
      wert: k.wert || null,
      naechster: k.next || null,
      plan: k.plan || null,
      cycle: k.cycle || null,
      angelegt: k.angelegt ? new Date(k.angelegt).toISOString() : null,
      updated_at: new Date().toISOString()
    };
    // Der Client vergibt eigene Kennungen (auch offline) — die behalten wir bei.
    if (k.id) satz.id = String(k.id);

    const { data, error } = await db.from('kontakte').upsert(satz).select('id').single();
    if (error) return res.status(500).json({ error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, id: data.id });
  }

  return res.status(405).json({ error: 'Methode nicht erlaubt' });
}
