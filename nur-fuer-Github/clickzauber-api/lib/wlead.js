// POST /api/wlead  — Lead aus dem Hochzeits-Budgetplaner (eigene Payload-Form).
import { db, cors, body, MAIL_KEY, MAIL_TO, MAIL_FROM, gebremst, ipVon } from './_lib.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  if (!p || !p.email) return res.status(400).json({ ok: false, error: 'email fehlt' });
  // Seit 15.10.2026: Bremse und Größe. Jede Anfrage schickt Manuel eine Mail und speichert den ganzen Inhalt.
  if (JSON.stringify(p).length > 100000) return res.status(413).json({ ok: false, error: 'zu-gross' });
  if (await gebremst('wlead:' + ipVon(req), 10, 60)) return res.status(429).json({ ok: false, error: 'zu-viele' });
  const sauber = (s, n) => (s == null || typeof s === 'object' ? null : String(s).replace(/[\u0000-\u001f\u007f"<>`\\]/g, '').trim().slice(0, n) || null);
  p.email = sauber(p.email, 254) ? sauber(p.email, 254).replace(/\s+/g, '') : null;
  if (!p.email) return res.status(400).json({ ok: false, error: 'email fehlt' });

  const widget = 'clickzauberhochzeit';
  const name = sauber(p.vorname || p.name, 120);
  const value = p.geschaetzte_summe_eur != null ? Number(p.geschaetzte_summe_eur) : null;

  // Ohne tenant_id greifen Export, Löschfrist und Konto-Löschung nicht.
  const { data: w } = await db.from('widgets').select('tenant_id').eq('slug', widget).maybeSingle();

  const { data, error } = await db.from('leads').insert({
    tenant_id: (w && w.tenant_id) || null,
    widget_id: widget, session_id: p.session || null,
    name, email: p.email, phone: sauber(p.telefon, 60),
    answers: p, value_est: value,
    consent: !!p.dsgvo_einwilligung
  }).select('id').single();
  if (error) return res.status(500).json({ ok: false, error: error.message });

  await db.from('events').insert({ widget_id: widget, session_id: p.session || null, type: 'complete' });

  if (MAIL_KEY) {
    try {
      const resend = new Resend(MAIL_KEY);
      const posten = Array.isArray(p.preis_positionen)
        ? p.preis_positionen.map(li => `  - ${li.label || li.name || ''}: ${li.preis || li.amount || ''}`).join('\n')
        : '';
      await resend.emails.send({
        from: 'clickzauber <projekt@clickzauber.de>',
        to: MAIL_TO || 'projekt@clickzauber.de',
        reply_to: p.email || undefined,
        subject: `Neue Hochzeits-Anfrage (${value ? value.toLocaleString('de-DE') + ' €' : 'ohne Summe'})`,
        text: `Neue Anfrage über den Hochzeits-Budgetplaner\n\n` +
          `Name: ${name || '-'}\nE-Mail: ${p.email}\nGäste: ${p.gaeste_anzahl || '-'}\n` +
          `Termin: ${p.termin || '-'}\nAusweichtermin: ${p.ausweichtermin || '-'}\n` +
          `Geschätzte Summe: ${value ? value.toLocaleString('de-DE') + ' €' : '-'}\n\n` +
          `Positionen:\n${posten || '  (keine)'}\n`
      });
    } catch (e) { /* Mail-Fehler darf den Lead nicht verhindern */ }
  }

  res.status(200).json({ ok: true, id: data.id });
}
