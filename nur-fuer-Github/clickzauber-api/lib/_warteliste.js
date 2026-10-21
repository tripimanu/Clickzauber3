// Wird ein Tag oder eine Uhrzeit frei, bekommen die Wartenden eine E-Mail.
// Wer nur eine Telefonnummer hinterlassen hat, erscheint im Cockpit mit
// WhatsApp-Knopf — dort meldet sich der Betrieb selbst.
import { db, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { T, sprache, datum as spDatum, uhr as spUhr, betriebSprache } from './_sprache.js';

export async function wartelisteMelden(tenant, datum, widget) {
  try {
    let q = db.from('warteliste').select('*').eq('tenant_id', tenant).eq('datum', datum).is('benachrichtigt_am', null);
    if (widget) q = q.eq('widget_id', widget);
    const { data } = await q.limit(20);
    if (!data || !data.length) return 0;
    const { data: t } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const { data: e } = await db.from('einstellungen').select('telefon, antwort_an, mail_haupt').eq('tenant_id', tenant).maybeSingle();
    const echterName = t && t.name && !/@/.test(t.name) ? t.name : '';
    let n = 0;
    for (const w of data) {
      if (!w.email || !MAIL_KEY) continue;
      const l = sprache(w.sprache), X = T(l), betrieb = echterName || X.w_betrieb, tag = spDatum(l, datum, false);
      const link = (process.env.GAST_HOST || 'https://clickzauber-api.vercel.app').replace(/\/+$/, '') + '/share.html?w=' + encodeURIComponent(w.widget_id) + '&q=warteliste';
      const html = `<!DOCTYPE html><html lang="${l}"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:26px 28px">
<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">${X.w_kopf}</div>
<div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px">${esc(X.w_titel(tag))}</div>
<p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">${esc(X.guten(w.name ? String(w.name).split(' ')[0] : ''))}, ${esc(X.w_text(betrieb))}</p>
<a href="${link}" style="display:inline-block;background:#1f6d4a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:600;font-size:15px;margin-top:20px">${X.w_knopf}</a>
${e && e.telefon ? `<p style="color:#5f584a;font-size:14px;margin:16px 0 0">${X.w_anruf}${esc(e.telefon)}</p>` : ''}
<p style="color:#a49b86;font-size:12px;margin:18px 0 0">${X.w_fuss}</p>
</td></tr></table></td></tr></table></body></html>`;
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: MAIL_FROM, to: [w.email], reply_to: (e && (e.antwort_an || e.mail_haupt)) || undefined, subject: X.w_betreff(tag, betrieb), html })
        });
        if (r.ok) { await db.from('warteliste').update({ benachrichtigt_am: new Date().toISOString() }).eq('id', w.id); n++; }
      } catch (err) { /* nächster */ }
    }
    return n;
  } catch (err) { return 0; }
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
