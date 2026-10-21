// GET  /api/vergleich?token=…                            → laufende Vergleiche mit Zahlen
// GET  /api/vergleich?slug=…                             → öffentlich: gehört der slug zu einem Vergleich?
// POST /api/vergleich { token, starten:{name,slug_a,slug_b} }
// POST /api/vergleich { token, beenden:id, gewinner:'a'|'b' }
import { db, cors, body, userByToken, rolleVon, darf } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Öffentlich: w.js fragt, ob für diesen slug hälftig verteilt werden soll.
  if (req.method === 'GET' && req.query.slug && !req.query.token) {
    // Nur Zeichen einer Formular-Kennung (wie lib/save.js): Der Wert steht als Text im .or()-Filter.
    const s = String(req.query.slug).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    if (!s) return res.status(200).json({ ok: true, vergleich: null });
    const { data } = await db.from('widget_vergleich')
      .select('slug_a, slug_b, laeuft').eq('laeuft', true)
      .or(`slug_a.eq.${s},slug_b.eq.${s}`).maybeSingle();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json({ ok: true, vergleich: data || null });
  }

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const rolle = await rolleVon(user);

  if (req.method === 'GET') {
    const { data: liste } = await db.from('widget_vergleich').select('*')
      .eq('tenant_id', user.tenant_id).order('gestartet', { ascending: false });
    const { data: ws } = await db.from('widgets').select('slug, name').eq('tenant_id', user.tenant_id);

    const mit = [];
    for (const v of liste || []) {
      const [a, b] = await Promise.all([zahlen(v.slug_a, v.gestartet), zahlen(v.slug_b, v.gestartet)]);
      mit.push({ ...v, a, b, urteil: urteil(a, b) });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, rolle, darf_bearbeiten: darf(rolle, 'bearbeiten'), widgets: ws || [], vergleiche: mit });
  }

  if (req.method === 'POST') {
    if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Ihre Rolle darf das nicht ändern.' });
    const p = body(req);

    if (p.beenden) {
      await db.from('widget_vergleich').update({
        laeuft: false, beendet: new Date().toISOString(),
        gewinner: p.gewinner === 'b' ? 'b' : (p.gewinner === 'a' ? 'a' : null)
      }).eq('id', p.beenden).eq('tenant_id', user.tenant_id);
      return res.status(200).json({ ok: true });
    }

    const s = p.starten || {};
    const name = String(s.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ ok: false, error: 'Bitte einen Namen für den Vergleich angeben.' });
    if (!s.slug_a || !s.slug_b || s.slug_a === s.slug_b) return res.status(400).json({ ok: false, error: 'Bitte zwei verschiedene Formulare wählen.' });

    const { data: eigene } = await db.from('widgets').select('slug').eq('tenant_id', user.tenant_id);
    const meine = (eigene || []).map((w) => w.slug);
    if (!meine.includes(s.slug_a) || !meine.includes(s.slug_b)) return res.status(403).json({ ok: false, error: 'Eines der Formulare gehört nicht zu Ihrem Betrieb.' });

    const { data, error } = await db.from('widget_vergleich').insert({
      tenant_id: user.tenant_id, name, slug_a: s.slug_a, slug_b: s.slug_b
    }).select('*').maybeSingle();
    if (error) return res.status(400).json({ ok: false, error: 'Ein Vergleich mit diesem Namen läuft schon.' });
    return res.status(200).json({ ok: true, vergleich: data });
  }

  return res.status(405).json({ ok: false });
}

async function zahlen(slug, seit) {
  const [{ count: starts }, { data: leads }] = await Promise.all([
    db.from('events').select('id', { count: 'exact', head: true }).eq('widget_id', slug).eq('type', 'start').gte('ts', seit),
    db.from('leads').select('value_est, status').eq('widget_id', slug).gte('ts', seit)
  ]);
  const l = leads || [];
  const gebucht = l.filter((x) => x.status === 'gebucht');
  return {
    slug, starts: starts || 0, anfragen: l.length,
    quote: starts ? Math.round(l.length / starts * 100) : 0,
    wert: Math.round(l.reduce((a, x) => a + Number(x.value_est || 0), 0)),
    gebucht: gebucht.length
  };
}

/* Ehrliche Aussage statt Scheingenauigkeit: unter 100 Starts je Seite ist nichts belastbar. */
function urteil(a, b) {
  const min = Math.min(a.starts, b.starts);
  if (min < 100) return { sicher: false, text: `Noch zu früh. Belastbar wird es ab etwa 100 Starts je Variante — die kleinere hat ${min}.` };
  const d = a.quote - b.quote;
  if (Math.abs(d) < 3) return { sicher: false, text: 'Beide Varianten schließen praktisch gleich gut ab. Nehmen Sie die, die Ihnen lieber ist.' };
  const besser = d > 0 ? 'A' : 'B';
  return { sicher: true, text: `Variante ${besser} schließt ${Math.abs(d)} Prozentpunkte besser ab. Diese Variante würde ich behalten.` };
}
