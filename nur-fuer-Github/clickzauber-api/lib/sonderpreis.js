// Sonderpreise — ausgehandelte Preise je Kunde.
//
// GET  /api/sonderpreis?key=ADMIN            → alle hinterlegten Preise
// GET  /api/sonderpreis?key=ADMIN&email=…    → einer
// POST /api/sonderpreis { key, email, plan, monat, jahr, notiz }  → setzen
// POST /api/sonderpreis { key, email, aktion:'weg' }              → aufheben
//
// GET  /api/sonderpreis?token=NUTZER         → was FÜR MICH gilt (alle Tarife)
//
// Der Listenpreis ist der Wunsch. Was ein Betrieb wirklich zahlt, steht hier.
// Setzen darf das nur der Betreiber; ein Kunde sieht ausschließlich den eigenen
// Preis — sonst könnte er den Preis anderer auslesen oder seinen selbst setzen.
import { db, cors, body, userByToken } from './_lib.js';
import { PLANS, STUFEN } from './_plans.js';

const MIN = 1, MAX = 5000;   // Stripe lehnt Kleinstbeträge ab; nach oben ein Riegel gegen Vertipper

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const p = req.method === 'POST' ? body(req) : req.query;
  const istAdmin = process.env.ADMIN_TOKEN && p.key === process.env.ADMIN_TOKEN;

  // ── Kundensicht: nur der eigene Preis ─────────────────────────────
  if (!istAdmin) {
    if (req.method !== 'GET') return res.status(401).json({ ok: false, error: 'kein Zugriff' });
    const user = await userByToken(p.token);
    if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

    const { data } = await db.from('sonderpreise')
      .select('plan, monat, jahr')
      .eq('email', String(user.email).trim().toLowerCase())
      .maybeSingle();

    res.setHeader('Cache-Control', 'private, no-store');
    // Immer die volle Preisliste zurückgeben — die Anmeldeseite zeigt damit
    // ohne Fallunterscheidung die Zahlen, die für diesen Kunden gelten.
    const tarife = {};
    Object.keys(PLANS).forEach((id) => {
      // Alter Tarif im Eintrag (Start, Duo …): gilt für jede heutige Stufe — ein Konto hat nur ein Formular.
      const gilt = !!(data && data.monat != null && (data.plan === id || (PLANS[data.plan] && PLANS[data.plan].alt && !PLANS[id].alt)));
      const monat = gilt ? Number(data.monat) : PLANS[id].monthly;
      const jahr = gilt
        ? (data.jahr != null ? Number(data.jahr) : Math.round(monat * 10 * 100) / 100)
        : PLANS[id].yearly;
      tarife[id] = { monthly: monat, yearly: jahr, sonder: !!gilt, listeMonat: PLANS[id].monthly };
    });
    return res.status(200).json({ ok: true, tarife });
  }

  // ── Betreibersicht ────────────────────────────────────────────────
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    if (p.email) {
      const { data } = await db.from('sonderpreise').select('*')
        .eq('email', String(p.email).trim().toLowerCase()).maybeSingle();
      return res.status(200).json({ ok: true, preis: data || null });
    }
    const { data } = await db.from('sonderpreise').select('*').order('angelegt_am', { ascending: false }).limit(1000);
    return res.status(200).json({ ok: true, preise: data || [] });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const email = String(p.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return res.status(400).json({ ok: false, error: 'E-Mail fehlt.' });

  if (String(p.aktion || '') === 'weg') {
    await db.from('sonderpreise').delete().eq('email', email);
    return res.status(200).json({ ok: true, entfernt: true });
  }

  const plan = String(p.plan || '');
  if (!STUFEN.includes(plan)) return res.status(400).json({ ok: false, error: 'Unbekannte Preisstufe. Möglich: service oder projekt.' });

  const monat = zahl(p.monat);
  if (monat == null) return res.status(400).json({ ok: false, error: 'Monatspreis fehlt oder ist unplausibel.' });
  const jahr = p.jahr === '' || p.jahr == null ? null : zahl(p.jahr, MIN, MAX * 12);
  if (p.jahr && jahr == null) return res.status(400).json({ ok: false, error: 'Jahrespreis ist unplausibel.' });

  const { error } = await db.from('sonderpreise').upsert({
    email, plan, monat, jahr,
    notiz: p.notiz ? String(p.notiz).slice(0, 300) : null,
    angelegt_von: p.von ? String(p.von).slice(0, 120) : null,
    geaendert_am: new Date().toISOString()
  }, { onConflict: 'email' });

  if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
  return res.status(200).json({
    ok: true, email, plan, monat,
    jahr: jahr != null ? jahr : Math.round(monat * 10 * 100) / 100,
    listenpreis: PLANS[plan].monthly
  });
}

// Akzeptiert „100", „100,50" und „100.50" — im Verkaufsgespräch tippt man schnell.
function zahl(v, min = MIN, max = MAX) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}
