// GET  /api/belegung?widget=…        → { gesperrt:[iso], frei:[iso], wochentage:[0..6] }
// POST /api/belegung { token, widget, gesperrt, frei, wochentage }
import { db, cors, body, userByToken } from './_lib.js';
import { kalTage, proTag } from './_kaltage.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const widget = String(req.query.widget || '');
    if (!widget) return res.status(400).json({ error: 'widget fehlt' });

    const { data } = await db
      .from('widgets')
      .select('belegung')
      .eq('slug', widget)
      .single();

    const b = (data && data.belegung) || {};
    const raeume = (Array.isArray(b.raeume) && b.raeume.length) ? b.raeume : ['Hauptraum'];
    const buchungen = (b.buchungen && typeof b.buchungen === 'object') ? b.buchungen : {};

    // Ein Tag ist durch Buchungen erst dann dicht, wenn ALLE Räume vergeben sind.
    // Stornierte Buchungen zählen bewusst weiter mit: der Betreiber gibt den Tag
    // von Hand wieder frei, damit nichts unbemerkt buchbar wird.
    const voll = Object.keys(buchungen).filter((t) => (buchungen[t] || []).length >= proTag(b));

    // Manuell gesperrte Tage, Kalendertermine und volle Tage zusammenführen.
    const gesperrt = [...new Set([...(b.gesperrt || []), ...kalTage(b), ...voll])].sort();
    // Öffentlich abrufbar (das Widget braucht es). Kurz gecacht: plant der
    // Betreiber einen Termin fest ein, soll der Tag draußen zügig rot werden.
    res.setHeader('Cache-Control', 'public, max-age=20, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({
      gesperrt,
      frei: b.frei || [],
      wochentage: b.wochentage || [],
      raeume,
      kalender: !!(b.kal_url || b.dk_stand)
    });
  }

  if (req.method === 'POST') {
    const { token, widget, gesperrt, frei, wochentage, raeume } = body(req);
    const istAdminToken = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
    const user = istAdminToken ? { tenant_id: null } : await userByToken(token);
    if (!user) return res.status(401).json({ error: 'nicht angemeldet' });
    if (!widget) return res.status(400).json({ error: 'widget fehlt' });

    // Nur eigene Widgets ändern.
    const { data: w } = await db
      .from('widgets')
      .select('id, tenant_id')
      .eq('slug', widget)
      .maybeSingle();
    const istAdmin = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
    if (!w) return res.status(404).json({ error: 'widget unbekannt' });
    if (!istAdmin && w.tenant_id !== user.tenant_id) return res.status(403).json({ error: 'kein Zugriff' });

    const clean = (a) => Array.isArray(a)
      ? [...new Set(a.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x))))].sort()
      : [];
    const wd = Array.isArray(wochentage)
      ? [...new Set(wochentage.map(Number).filter((n) => n >= 0 && n <= 6))]
      : [];

    // Kalenderfelder unangetastet lassen — die pflegt /api/kalender.
    const { data: alt } = await db.from('widgets').select('belegung').eq('id', w.id).single();
    const bestand = (alt && alt.belegung) || {};
    const { error } = await db
      .from('widgets')
      .update({
        belegung: {
          ...bestand,
          gesperrt: clean(gesperrt),
          frei: clean(frei),
          wochentage: wd,
          ...(Array.isArray(raeume)
            ? { raeume: [...new Set(raeume.map((r) => String(r).trim()).filter(Boolean))].slice(0, 12) }
            : {})
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', w.id);
    // Config-Cache umgehen: das Widget holt die Belegung mit der Config,
    // die maximal 5 Minuten alt ist. Das ist gewollt — sofortige Wirkung
    // wäre nur mit einem eigenen, ungecachten Aufruf pro Besucher zu haben.

    if (error) return res.status(500).json({ error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Methode nicht erlaubt' });
}
