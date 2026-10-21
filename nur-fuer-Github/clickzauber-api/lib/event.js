// POST /api/event  — protokolliert einen Klick / Schritt im Widget (anonym).
import { db, cors, body } from './_lib.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { widget, session, type, step, key, value } = body(req);
  if (!widget || !session || !type) return res.status(400).json({ ok: false, error: 'fehlende felder' });
  // Seit 15.10.2026 gekürzt: Der Weg ist offen, ohne Grenze ließe sich die Tabelle mit riesigen Texten füllen.
  const kurz = (s, n) => (s == null ? null : (typeof s === 'string' ? s : JSON.stringify(s)).slice(0, n));

  const { error } = await db.from('events').insert({
    tenant_id: await tenantVon(String(widget).slice(0, 80)),
    widget_id: kurz(widget, 80),
    session_id: kurz(session, 80),
    type: kurz(type, 40),
    step: step ?? null,
    answer_key: kurz(key, 80),
    answer_value: kurz(value, 500)
  });
  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.status(200).json({ ok: true });
}

/* Widget → Betrieb. Kurz gemerkt, weil dieser Endpunkt die Last aller Besucher trägt. */
const CACHE = new Map();
async function tenantVon(slug) {
  const t = CACHE.get(slug);
  if (t && Date.now() - t.zeit < 300e3) return t.id;
  try {
    const { data } = await db.from('widgets').select('tenant_id').eq('slug', slug).maybeSingle();
    const id = (data && data.tenant_id) || null;
    CACHE.set(slug, { id, zeit: Date.now() });
    return id;
  } catch (e) {
    return null;
  }
}
