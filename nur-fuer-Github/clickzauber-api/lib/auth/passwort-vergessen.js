// POST /api/auth/passwort-vergessen — { email } → Link zum Neu-Setzen.
import { db, cors, body, gebremst, ipVon } from '../_lib.js';
import { neuerToken, SITE } from './_pw.js';
import { passwortMail } from './_mail.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const email = String(body(req).email || '').trim().toLowerCase();
  const { data: user } = await db.from('users').select('*').eq('email', email).maybeSingle();
  // Immer dieselbe Antwort: die Seite verrät nicht, wer Kunde ist.
  // Bremse (seit 15.10.2026, sql/71): höchstens 5 Mails je Adresse und Stunde, 20 je Anschluss. Darüber still keine Mail.
  if (user && !(await gebremst('pwv:' + email, 5, 60) || await gebremst('pwv-ip:' + ipVon(req), 20, 60))) {
    const t = neuerToken();
    await db.from('email_tokens').insert({
      email, token: t, zweck: 'passwort',
      expires_at: new Date(Date.now() + 2 * 3600e3).toISOString()
    });
    try { const l = ['sq', 'en', 'fr', 'it', 'es', 'tr'].includes(user.sprache) ? user.sprache : 'de';
      await passwortMail(email, SITE + '/clickzauber-login.html?reset=' + t + (l !== 'de' ? '&lang=' + l : ''), l); } catch {}
  }
  res.status(200).json({ ok: true });
}
