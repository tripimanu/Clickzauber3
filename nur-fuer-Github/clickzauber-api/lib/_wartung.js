// Wartungsmodus (Schalter: lib/status.js, Plattform-Seite).
// Während der Wartung lehnen die Sammel-Funktionen ändernde Aufrufe aus Cockpit und
// Konfigurator ab. Formulare laufen weiter: Laden, Anfragen, Klicks, Warteliste und
// Terminantworten der Gäste (Seite per GET, Antwort per POST auf aktion=antwort) bleiben frei.
// Anmelden und Stripe sind nicht betroffen.
import { db, cors } from './_lib.js';

let C = { t: 0, v: { wartung: false } };
export async function wartungStand(frisch) {
  if (!frisch && Date.now() - C.t < 15000) return C.v;
  try {
    const { data, error } = await db.from('plattform_status').select('wartung, text, seit').eq('id', 1).maybeSingle();
    C = { t: Date.now(), v: error ? { wartung: false } : (data || { wartung: false }) };   // ohne sql/49: nie Wartung
  } catch { C = { t: Date.now(), v: { wartung: false } }; }
  return C.v;
}

const FREI = new Set(['lead', 'event', 'config', 'warteliste', 'status', 'moderation', 'konto-admin', 'admin', 'pilot', 'demo-mail', 'demo-feedback', 'demo-zugang']);
export async function wartungSperrt(req, name) {
  if (!req || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return false;
  if (FREI.has(name)) return false;
  if (name === 'termine' && String((req.query || {}).aktion || '') === 'antwort') return false;
  const s = await wartungStand();
  return !!(s && s.wartung);
}
export function wartungAntwort(req, res) {
  cors(res, req.headers && req.headers.origin);
  return res.status(503).json({ ok: false, wartung: true, error: 'Gerade läuft eine kurze Wartung. Ihr Formular nimmt weiter Anfragen an. Speichern geht in wenigen Minuten wieder.' });
}
