// POST /api/demo-mail { email, betreff, inhalt }
// Schickt dem Interessenten seine eigene Testanfrage — der Beweis auf der Live-Demo.
import { cors, body, MAIL_KEY, MAIL_FROM, gebremst, ipVon } from './_lib.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode nicht erlaubt' });

  const { email, betreff, inhalt } = body(req);
  if (!email || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(String(email))) {
    return res.status(400).json({ error: 'E-Mail ungültig' });
  }

  // Bremse in der Datenbank (seit 15.10.2026, sql/71): 5 je Stunde und Anschluss, dazu 5 je Empfänger.
  if (await gebremst('demomail:' + ipVon(req), 5, 60) || await gebremst('demomail-an:' + String(email).toLowerCase(), 5, 60)) return res.status(429).json({ error: 'zu viele Anfragen' });

  const zeilen = String(inhalt || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<tr><td style="padding:7px 0;border-bottom:1px dashed #e6ddca;color:#5f584a;font-size:14px">${esc(l)}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px;overflow:hidden">
<tr><td style="padding:22px 26px;border-bottom:1px solid #e6ddca">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Neue Anfrage über Ihr Formular</div>
  <div style="font-size:19px;font-weight:600;color:#211d16;margin-top:6px">${esc(betreff || 'Neue Anfrage')}</div>
</td></tr>
<tr><td style="padding:22px 26px">
  <table role="presentation" width="100%">${zeilen}</table>
  <p style="color:#5f584a;font-size:14px;line-height:1.6;margin:20px 0 0">
    Genau diese E-Mail bekommt eine Location, sobald ein Gast das Formular ausfüllt — vollständig, ohne Rückfrage, ohne Telefonat.
  </p>
  <a href="https://clickzauber.de/clickzauber-anmelden.html" style="display:inline-block;background:#1f6d4a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:600;font-size:15px;margin-top:18px">Eigenes Formular bauen</a>
</td></tr>
<tr><td style="padding:16px 26px;background:#fdfbf5;border-top:1px solid #e6ddca;color:#8a8270;font-size:12px">
  Sie haben diese Mail angefordert, indem Sie die Live-Demo auf clickzauber.de ausprobiert haben. Kein Newsletter, keine Weitergabe.
</td></tr>
</table></td></tr></table></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAIL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [String(email)],
        subject: betreff ? `Beispiel: ${betreff}` : 'Ihre Testanfrage über clickzauber',
        html
      })
    });
    if (!r.ok) return res.status(502).json({ error: 'Versand fehlgeschlagen' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Versand fehlgeschlagen' });
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
