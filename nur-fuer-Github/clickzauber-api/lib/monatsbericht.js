// GET /api/monatsbericht?key=…            (Cron, am 1. jeden Monats)
// GET /api/monatsbericht?token=…&test=1   → schickt dem Angemeldeten sofort einen Probebericht
// Ein Blatt pro Betrieb: Anfragen, Abschlussquote, Umsatz, größter Hebel.
import { db, cors, userByToken, MAIL_KEY, MAIL_FROM, euro } from './_lib.js';
import { stufeVon, kroneAktiv } from './_vertrauen.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Probebericht für den angemeldeten Betrieb — hilft beim Einrichten.
  if (req.query.test && req.query.token) {
    const user = await userByToken(req.query.token);
    if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
    const ok = await berichtSenden(user.tenant_id, user.email);
    return res.status(200).json({ ok, hinweis: ok ? 'Probebericht ist unterwegs.' : 'Für den letzten Monat liegen keine Zahlen vor.' });
  }

  if ((req.query.key || '') !== process.env.CRON_KEY) return res.status(401).json({ error: 'kein Zugriff' });

  const { data: alle } = await db.from('einstellungen')
    .select('tenant_id, monatsbericht, monatsbericht_an, mail_haupt')
    .or('monatsbericht.is.null,monatsbericht.eq.true');

  let gesendet = 0;
  for (const e of alle || []) {
    const an = e.monatsbericht_an || e.mail_haupt;
    if (await berichtSenden(e.tenant_id, an)) gesendet++;
  }
  return res.status(200).json({ ok: true, gesendet });
}

async function berichtSenden(tenantId, an) {
  const jetzt = new Date();
  const von = new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1);
  const bis = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1);
  const vorVon = new Date(jetzt.getFullYear(), jetzt.getMonth() - 2, 1);

  const { data: t } = await db.from('tenants').select('name, email').eq('id', tenantId).maybeSingle();
  const ziel = an || (t && t.email);
  if (!ziel || !MAIL_KEY) return false;

  const [{ data: leads }, { data: vorLeads }, { data: ev }] = await Promise.all([
    db.from('leads').select('status, value_est, answers, termin').eq('tenant_id', tenantId).gte('ts', von.toISOString()).lt('ts', bis.toISOString()),
    db.from('leads').select('status, value_est').eq('tenant_id', tenantId).gte('ts', vorVon.toISOString()).lt('ts', von.toISOString()),
    db.from('events').select('type, answer_key, answer_value').eq('tenant_id', tenantId).eq('type', 'start').gte('ts', von.toISOString()).lt('ts', bis.toISOString())
  ]);

  const l = leads || [], v = vorLeads || [], starts = (ev || []).length;
  if (!l.length && !starts) return false;

  const gebucht = l.filter((x) => x.status === 'gebucht');
  const umsatz = gebucht.reduce((a, x) => a + Number(x.value_est || 0), 0);
  const vorUmsatz = (v || []).filter((x) => x.status === 'gebucht').reduce((a, x) => a + Number(x.value_est || 0), 0);
  const quote = starts ? Math.round(l.length / starts * 100) : 0;
  const unbeantwortet = l.filter((x) => (x.status || 'neu') === 'neu').length;
  const monat = von.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const delta = (a, b) => {
    if (!b) return '';
    const p = Math.round((a - b) / b * 100);
    if (!p) return ' · wie im Vormonat';
    return p > 0 ? ` · ${p} % mehr als im Vormonat` : ` · ${Math.abs(p)} % weniger als im Vormonat`;
  };

  const zeile = (label, wert, zusatz) => `<tr>
    <td style="padding:11px 0;border-bottom:1px solid #f0ebde;color:#5f584a;font-size:14px">${label}</td>
    <td style="padding:11px 0;border-bottom:1px solid #f0ebde;text-align:right;color:#211d16;font-size:16px;font-weight:600">${wert}${zusatz ? `<span style="display:block;font-size:11.5px;font-weight:400;color:#8a8270">${zusatz}</span>` : ''}</td>
  </tr>`;

  const rat = unbeantwortet
    ? `${unbeantwortet} ${unbeantwortet === 1 ? 'Anfrage ist' : 'Anfragen sind'} noch unbeantwortet. Erfahrungsgemäß bucht, wer innerhalb eines Tages eine Antwort bekommt, deutlich häufiger.`
    : quote && quote < 25
      ? 'Von den Besuchern, die Ihr Formular öffnen, füllt weniger als ein Viertel es aus. Meist liegt es an zu vielen oder zu heiklen Fragen — im Cockpit unter Auswertung sehen Sie, wo sie aussteigen.'
      : 'Sie haben jede Anfrage angefasst. Genau so gewinnt man die Termine, die andere liegen lassen.';

  // Vertrauenspunkte, Abzeichen und Krone (sql/44, sql/45)
  let vtZeile = '';
  try {
    const { data: vt } = await db.from('vertrauen').select('punkte, krone_bis, krone_region').eq('tenant_id', tenantId).maybeSingle();
    if (vt) {
      const NAMEN = ['Bronze', 'Silber', 'Gold', 'Diamant', 'Zwei Diamanten', 'Drei Diamanten', 'Goldlöwe', 'Zwei Goldlöwen', 'Löwenkristall'];
      const s = stufeVon(vt.punkte), krone = kroneAktiv(vt);
      vtZeile = `<div style="background:${krone ? '#fbf1d6' : '#f7f4ea'};border-radius:12px;padding:15px 17px;margin-top:14px"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8270">${krone ? 'Monatssieger' : 'Vertrauen'}</div><p style="color:#3f3a30;font-size:14.5px;line-height:1.62;margin:7px 0 0">${krone ? `Glückwunsch: Sie haben im letzten Monat im PLZ-Gebiet ${esc(String(vt.krone_region || '').slice(3))} am meisten Vertrauen gesammelt. Ihre Krone steht bis Monatsende im Profil. ` : ''}${Number(vt.punkte).toLocaleString('de-DE')} Vertrauenspunkte${s > -1 ? ', Abzeichen ' + NAMEN[s] : ''}.</p></div>`;
    }
  } catch (e) {}

  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px">
<tr><td style="padding:26px 28px">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Monatsbericht</div>
  <div style="font-size:22px;font-weight:600;color:#211d16;margin-top:7px;letter-spacing:-.02em">${monat}</div>
  <p style="color:#5f584a;font-size:14.5px;line-height:1.6;margin:10px 0 18px">${esc((t && t.name) || 'Ihr Betrieb')} — die Zahlen des vergangenen Monats.</p>
  <table role="presentation" width="100%">
    ${zeile('Anfragen', l.length, delta(l.length, v.length))}
    ${zeile('Formular geöffnet', starts, starts ? `${quote} % haben es ausgefüllt` : '')}
    ${zeile('Gebuchte Feiern', gebucht.length, '')}
    ${zeile('Umsatz aus gebuchten Feiern', euro(umsatz), delta(umsatz, vorUmsatz))}
  </table>
  <div style="background:#f7f4ea;border-radius:12px;padding:15px 17px;margin-top:20px">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8270">Woran es liegt</div>
    <p style="color:#3f3a30;font-size:14.5px;line-height:1.62;margin:7px 0 0">${rat}</p>
  </div>
  ${vtZeile}
  <p style="color:#a8a190;font-size:12px;line-height:1.55;margin:20px 0 0">
    Diesen Bericht können Sie im Cockpit unter Einstellungen abschalten.
  </p>
</td></tr></table></td></tr></table></body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [ziel], subject: `Ihr Monatsbericht — ${monat}`, html })
    });
    if (r.ok) await db.from('protokoll').insert({ tenant_id: tenantId, was: 'monatsbericht', wer: ziel, hinweis: monat });
    return r.ok;
  } catch { return false; }
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
