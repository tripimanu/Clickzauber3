// GET /api/kalender-sync?key=…  — eigene Kalender der Betriebe neu lesen.
// Alle 15 Minuten über GitHub Actions (.github/workflows/kalender.yml), nachts zusätzlich über /api/nacht.
// Liest Kalender-Adressen (iCal) und Echtzeit-Verbindungen (Google, Outlook, iCloud), siehe lib/_kalender-lesen.js.
import { cors } from './_lib.js';
import { kalenderAuffrischen } from './_kalender-lesen.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const geheim = process.env.CRON_KEY || process.env.CRON_SECRET || '';
  if (!geheim || (req.query.key || '') !== geheim) return res.status(401).json({ error: 'kein Zugriff' });
  try { return res.status(200).json({ ok: true, ...(await kalenderAuffrischen({ zeit: 8500 })) }); }
  catch (e) { return res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
}
