// GET /api/ds-betrieb?b=<tenant_id> → Angaben für die Datenschutzerklärung eines Betriebs ohne eigene Website.
// Öffentlich: Name, Anschrift und Kontakt des Verantwortlichen muss eine Datenschutzerklärung ohnehin nennen.
import { db, cors } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const b = String((req.query && req.query.b) || '').trim();
  if (!/^[0-9a-f-]{8,64}$/i.test(b)) return res.status(400).json({ ok: false, error: 'b fehlt' });
  const [{ data: u }, { data: e }] = await Promise.all([
    db.from('users').select('vorname, nachname, firma, strasse, plz_ort, telefon, email, gesperrt_am, created_at').eq('tenant_id', b).order('created_at').limit(1),
    db.from('einstellungen').select('loeschfrist_monate, antwort_an').eq('tenant_id', b).maybeSingle()
  ]);
  const n = u && u[0];
  if (!n || n.gesperrt_am) return res.status(404).json({ ok: false, error: 'unbekannt' });
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  return res.status(200).json({
    ok: true,
    firma: n.firma || '', name: [n.vorname, n.nachname].filter(Boolean).join(' '),
    strasse: n.strasse || '', plz_ort: n.plz_ort || '', telefon: n.telefon || '',
    // Vorgebaute Konten (seit 13.10.2026): die interne Adresse nie zeigen. Nach dem Einlösen steht hier seine echte.
    email: (e && e.antwort_an) || (/^vorgebaut-/i.test(n.email || '') ? '' : n.email) || '',
    loeschfrist_monate: e && e.loeschfrist_monate != null ? e.loeschfrist_monate : 24
  });
}
