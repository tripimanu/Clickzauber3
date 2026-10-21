// GET /api/pilot → { ok, pilotphase, plaetze, frei } — öffentlich, für die Startseite und die Plattform-Seite.
import { db, cors } from './_lib.js';
import { PILOT_PLAETZE, ZAHLUNG_AKTIV, pilotFrei } from './_plans.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  const frei = await pilotFrei(db);
  return res.status(200).json({ ok: true, pilotphase: !ZAHLUNG_AKTIV, plaetze: PILOT_PLAETZE, frei });
}
