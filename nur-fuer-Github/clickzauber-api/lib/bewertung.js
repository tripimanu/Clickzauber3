// GET /api/bewertung?key=…   (Cron, täglich)
// Fragt Gäste nach der Feier nach einer Bewertung — nur bei gebuchten Feiern,
// nur wenn der Betrieb es eingeschaltet und einen Link hinterlegt hat, nur einmal.
import { db, cors, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { T, sprache, datum as spDatum, uhr as spUhr, betriebSprache } from './_sprache.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if ((req.query.key || '') !== process.env.CRON_KEY) return res.status(401).json({ error: 'kein Zugriff' });

  const { data: ein } = await db.from('einstellungen')
    .select('tenant_id, bewertung_aktiv, bewertung_url, bewertung_tage, bewertung_text, ansprechpartner')
    .eq('bewertung_aktiv', true);

  const aktiv = (ein || []).filter((e) => e.bewertung_url);
  if (!aktiv.length) return res.status(200).json({ ok: true, gesendet: 0 });

  const { data: firmen } = await db.from('tenants').select('id, name').in('id', aktiv.map((e) => e.tenant_id));
  const firmaVon = Object.fromEntries((firmen || []).map((t) => [t.id, t.name]));

  const heute = new Date().toISOString().slice(0, 10);
  let gesendet = 0;

  for (const e of aktiv) {
    const tage = Math.min(60, Math.max(1, e.bewertung_tage || 7));
    // Termin liegt genau so viele Tage zurück oder länger, Feier war gebucht, noch nicht gefragt.
    const stichtag = new Date(Date.now() - tage * 864e5).toISOString().slice(0, 10);

    const { data: leads } = await db.from('leads')
      .select('*')
      .eq('tenant_id', e.tenant_id).eq('status', 'gebucht')
      .is('bewertung_gesendet_at', null)
      .not('termin', 'is', null)
      .lte('termin', stichtag)
      .gte('termin', new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10))
      .limit(100);

    for (const l of leads || []) {
      if (!l.email || l.termin >= heute) continue;
      const ok = await mail({
        to: l.email,
        subject: T(l.sprache).r_betreff(firmaVon[e.tenant_id] || ''),
        html: html(l, e, firmaVon[e.tenant_id])
      });
      await db.from('leads').update({ bewertung_gesendet_at: new Date().toISOString() }).eq('id', l.id);
      if (ok) gesendet++;
    }
  }

  return res.status(200).json({ ok: true, gesendet });
}

async function mail({ to, subject, html }) {
  if (!MAIL_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html })
    });
    return r.ok;
  } catch { return false; }
}

function html(l, e, firma) {
  const sp = sprache(l.sprache), X = T(sp);
  const vorname = (l.name || '').split(/\s+/)[0];
  // Eigener Text des Betriebs nur für Gäste in seiner Sprache (Deutsch); sonst Standardtext übersetzt
  const eigen = sp === 'de' ? (e.bewertung_text || '').trim() : '';
  const text = eigen
    ? esc(eigen).replace(/\n/g, '<br>')
    : esc(X.r_text(l.termin ? spDatum(sp, l.termin, false) : ''));
  return `<!DOCTYPE html><html lang="${sp}"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px">
<tr><td style="padding:26px 28px">
  <div style="font-size:20px;font-weight:600;color:#211d16;letter-spacing:-.02em">${esc(X.guten(vorname))},</div>
  <p style="color:#5f584a;font-size:15px;line-height:1.68;margin:13px 0 0">${text}</p>
  <a href="${esc(e.bewertung_url)}" style="display:inline-block;background:#1f6d4a;color:#fff;text-decoration:none;border-radius:10px;padding:14px 24px;font-weight:600;font-size:15px;margin-top:20px">${X.r_knopf}</a>
  <p style="color:#5f584a;font-size:14.5px;line-height:1.6;margin:20px 0 0">
    ${X.gruesse}${e.ansprechpartner ? '<br>' + esc(e.ansprechpartner) : ''}${firma ? '<br>' + esc(firma) : ''}
  </p>
  <p style="color:#a8a190;font-size:12px;line-height:1.55;margin:18px 0 0">
    ${X.r_fuss}
  </p>
</td></tr></table></td></tr></table></body></html>`;
}
function deDatum(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
