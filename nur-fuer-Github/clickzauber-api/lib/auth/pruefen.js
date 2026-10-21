// POST /api/auth/pruefen — { email } → { konto: true|false }
//
// Damit gibt es nur eine Tür. Der Kunde tippt seine Adresse ein, und die Seite
// weiß selbst, ob sie nach dem Passwort fragt oder eines anlegen lässt — statt
// ihn vorher zwischen „Konto anlegen" und „Ich habe schon ein Konto" wählen zu
// lassen. Wer sich da vertippt, landete bisher in einer Fehlermeldung.
//
// Bewusst in Kauf genommen: die Antwort verrät, ob es zu einer Adresse ein Konto
// gibt. Die bisherigen Meldungen („Zu dieser Adresse gibt es noch kein Konto",
// „Zu dieser Adresse gibt es schon ein Konto") verrieten genau dasselbe.
import { db, cors, body } from '../_lib.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const email = String(body(req).email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
  }

  const { data } = await db.from('users').select('password_hash').eq('email', email).maybeSingle();
  res.status(200).json({ ok: true, konto: !!(data && data.password_hash) });
}
