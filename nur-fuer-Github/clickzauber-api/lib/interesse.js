// POST /api/interesse  — { token, email, anfragen, wert, wert_zahl, erfolg, dauer, code, geworben_von }
// Speichert die Antworten aus dem Funnel vor der Tarifwahl. Grundlage für das Vertriebs-Cockpit.
import { db, cors, body } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode nicht erlaubt' });

  const p = body(req);
  const email = String(p.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    return res.status(400).json({ error: 'E-Mail fehlt' });
  }

  const satz = {
    email,
    anfragen_monat: p.anfragen ?? null,
    auftragswert: p.wert ?? null,
    auftragswert_zahl: Number.isFinite(+p.wert_zahl) ? +p.wert_zahl : null,
    erfolgskriterium: p.erfolg ?? null,
    nutzungsdauer: p.dauer ?? null,
    empfehlungscode: p.code ?? null,
    geworben_von: p.geworben_von ? String(p.geworben_von).toUpperCase().slice(0, 24) : null,
    updated_at: new Date().toISOString()
  };

  // Ein Datensatz pro Interessent — wiederholtes Ausfüllen aktualisiert ihn.
  const { error } = await db.from('interesse').upsert(satz, { onConflict: 'email' });
  if (error) return res.status(500).json({ error: 'speichern fehlgeschlagen' });

  return res.status(200).json({ ok: true });
}
