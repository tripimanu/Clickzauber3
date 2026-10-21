// POST /api/auth/bestaetigung-neu — { email } → Bestätigungslink erneut senden.
import { db, cors, body, gebremst, ipVon } from '../_lib.js';
import { neuerToken, SITE } from './_pw.js';
import { bestaetigungsMail } from './_mail.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const email = String(body(req).email || '').trim().toLowerCase();
  const { data: user } = await db.from('users').select('id, verified').eq('email', email).maybeSingle();
  // Antwort immer gleich — sonst lässt sich abfragen, welche Adressen ein Konto haben.
  if (!user || user.verified) return res.status(200).json({ ok: true });
  // Bremse (seit 15.10.2026, sql/71): höchstens 5 Mails je Adresse und Stunde, 20 je Anschluss. Still, gleiche Antwort.
  if (await gebremst('bneu:' + email, 5, 60) || await gebremst('bneu-ip:' + ipVon(req), 20, 60)) return res.status(200).json({ ok: true });

  const t = neuerToken();
  await db.from('email_tokens').insert({
    email, token: t, zweck: 'bestaetigen',
    expires_at: new Date(Date.now() + 48 * 3600e3).toISOString()
  });
  try { await bestaetigungsMail(email, SITE + '/clickzauber-login.html?bestaetigen=' + t); } catch {}
  res.status(200).json({ ok: true });
}
