// GET  /api/push?token=…                          → { aktiv, schluessel, geraete }
// POST /api/push { token, abo, geraet }            → dieses Gerät anmelden
// POST /api/push { token, abo, aktion:'weg' }      → dieses Gerät abmelden
// POST /api/push { token, aktion:'probe' }         → Probenachricht an alle Geräte
// Die App (iPhone, Android) meldet sich genauso an: abo.endpoint = fcm:<token> oder apns:<token> (lib/_app-push.js).
//
// Push braucht ein VAPID-Schlüsselpaar in den Vercel-Umgebungsvariablen:
//   VAPID_PUBLIC  — darf öffentlich sein, das Cockpit holt ihn hier ab
//   VAPID_PRIVATE — geheim, verlässt den Server nie
//   VAPID_MAILTO  — Kontaktadresse, z. B. mailto:projekt@clickzauber.de
// Fehlt das Paar, meldet dieser Endpunkt sauber „nicht eingerichtet“ statt
// abzustürzen — das Cockpit zeigt dann einen Hinweis statt eines Schalters.
import { db, cors, body, userByToken } from './_lib.js';
import { pushSenden, pushBereit } from './_push.js';
import { appStand } from './_app-push.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const p = req.method === 'POST' ? body(req) : req.query;
  const user = await userByToken(p.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    if (!pushBereit()) return res.status(200).json({ ok: true, aktiv: false, eingerichtet: false, geraete: [] });
    const { data } = await db.from('push_geraete')
      .select('id, geraet, angelegt_am, zuletzt_am')
      .eq('tenant_id', user.tenant_id)
      .order('angelegt_am', { ascending: false });
    return res.status(200).json({
      ok: true,
      eingerichtet: true,
      schluessel: process.env.VAPID_PUBLIC,
      app: appStand(),   // App für iPhone und Android: Schlüssel auf dem Server vorhanden?
      geraete: data || []
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!pushBereit()) return res.status(503).json({ ok: false, error: 'Push ist auf dem Server noch nicht eingerichtet.' });

  const aktion = String(p.aktion || 'an');

  if (aktion === 'probe') {
    const anzahl = await pushSenden(user.tenant_id, {
      titel: 'clickzauber',
      text: 'Probenachricht — so meldet sich eine neue Anfrage.',
      url: 'clickzauber-cockpit-live.html#kalender'
    });
    return res.status(200).json({ ok: true, gesendet: anzahl });
  }

  const abo = p.abo || {};
  const endpoint = String(abo.endpoint || '');
  if (!endpoint) return res.status(400).json({ ok: false, error: 'Anmeldung unvollständig' });
  // App (iPhone, Android): Adresse fcm:… oder apns:…, Schlüssel sind dort Platzhalter.
  if (/^(fcm|apns):/.test(endpoint) && !/^(fcm|apns):[\w:.\-]{20,4096}$/.test(endpoint)) return res.status(400).json({ ok: false, error: 'Gerät unbekannt' });

  if (aktion === 'weg') {
    await db.from('push_geraete').delete().eq('endpoint', endpoint).eq('tenant_id', user.tenant_id);
    return res.status(200).json({ ok: true, aktiv: false });
  }

  const keys = abo.keys || {};
  if (!keys.p256dh || !keys.auth) return res.status(400).json({ ok: false, error: 'Schlüssel fehlen' });
  if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'kein Betrieb hinterlegt' });

  const { error } = await db.from('push_geraete').upsert({
    tenant_id: user.tenant_id,
    user_id: user.id,
    endpoint,
    p256dh: String(keys.p256dh),
    auth: String(keys.auth),
    geraet: p.geraet ? String(p.geraet).slice(0, 120) : null,
    fehler: 0,
    zuletzt_am: new Date().toISOString()
  }, { onConflict: 'endpoint' });

  if (error) return res.status(500).json({ ok: false, error: 'Anmelden fehlgeschlagen' });
  return res.status(200).json({ ok: true, aktiv: true });
}
