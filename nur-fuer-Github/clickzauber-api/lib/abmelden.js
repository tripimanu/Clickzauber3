// GET  /api/abmelden?token=…            → Geräteliste dieser Anmeldung
// POST /api/abmelden { token, alle }    → dieses Gerät abmelden, oder alle
import { db, cors, body, userByToken } from './_lib.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  if (req.method === 'GET') {
    const { data } = await db.from('sessions')
      .select('token, geraet, created_at, last_seen')
      .eq('user_id', user.id).order('last_seen', { ascending: false });
    const liste = (data || []).map((s) => ({
      geraet: s.geraet || 'Gerät',
      seit: s.created_at,
      zuletzt: s.last_seen,
      dieses: s.token === token
    }));
    return res.status(200).json({ ok: true, geraete: liste, anzahl: liste.length });
  }

  if (req.method === 'POST') {
    const alle = !!body(req).alle;
    if (alle) {
      // Alle Sitzungen löschen und den Alt-Token entwerten — danach kommt
      // kein Gerät mehr herein, auch nicht das hier.
      await db.from('sessions').delete().eq('user_id', user.id);
      await db.from('users').update({ token: null }).eq('id', user.id);
      return res.status(200).json({ ok: true, alle: true });
    }
    await db.from('sessions').delete().eq('token', token);
    // Hing die Anmeldung noch am Alt-Token, muss auch der weg.
    if (user.token === token) await db.from('users').update({ token: null }).eq('id', user.id);
    return res.status(200).json({ ok: true, alle: false });
  }

  res.status(405).json({ ok: false });
}
