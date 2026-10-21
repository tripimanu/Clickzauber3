// GET  /api/angebot?id=…&token=…        → Daten für das Angebot (Nummer wird dabei vergeben)
// GET  /api/angebot?annahme=CODE          → dasselbe Angebot für den Gast (öffentlich, nur mit Code)
// POST /api/angebot { annahme, name, ok }  → Gast nimmt das Angebot an
// Die Nummer wird nur beim ersten Aufruf vergeben, damit erneutes Öffnen nicht durchzählt.
import { db, cors, userByToken, naechsteNummer, angebotPosten } from './_lib.js';
import { meineAnfrage, betriebVon } from './anfrage.js';
import { randomBytes } from 'crypto';
import { pushSenden } from './_push.js';
import { MAIL_KEY, MAIL_FROM, body } from './_lib.js';

function antwortDaten(lead, betrieb, nr) {
  const { posten, summe } = angebotPosten(lead);
  const ab = lead.angebot_am ? new Date(lead.angebot_am) : new Date();
  return {
    ok: true, nummer: nr,
    datum: ab.toISOString().slice(0, 10),
    gueltig_bis: new Date(ab.getTime() + 30 * 864e5).toISOString().slice(0, 10),
    betrieb,
    gast: { name: lead.name || null, email: lead.email || null, telefon: lead.phone || null },
    termin: lead.termin || null, antworten: lead.answers || {}, posten: posten || [], summe,
    angenommen_am: lead.angenommen_am || null, angenommen_von: lead.angenommen_von || null
  };
}

async function gastWeg(req, res) {
  const code = String((req.method === 'POST' ? body(req).annahme : req.query.annahme) || '');
  if (!/^[a-f0-9]{32}$/.test(code)) return res.status(404).json({ ok: false, error: 'Dieser Link ist ungültig.' });
  const { data: lead } = await db.from('leads').select('*').eq('annahme_code', code).maybeSingle();
  if (!lead || !lead.angebot_nr) return res.status(404).json({ ok: false, error: 'Dieses Angebot gibt es nicht mehr.' });
  const betrieb = await betriebVon(lead, { tenant_id: lead.tenant_id, email: null });
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ...antwortDaten(lead, betrieb, lead.angebot_nr), gast_ansicht: true, zurueckgezogen: lead.status === 'verloren' && !lead.angenommen_am });

  const p = body(req);
  if (lead.angenommen_am) return res.status(200).json({ ok: true, angenommen_am: lead.angenommen_am });
  // Der Betrieb hat inzwischen abgesagt: Das Angebot gilt nicht mehr.
  if (lead.status === 'verloren') return res.status(410).json({ ok: false, error: 'Dieses Angebot gilt nicht mehr. Bitte melden Sie sich direkt beim Betrieb.' });
  const name = String(p.name || '').trim().slice(0, 120);
  if (name.length < 3 || !p.ok) return res.status(400).json({ ok: false, error: 'Bitte Ihren vollständigen Namen eintragen und bestätigen.' });
  const ab = lead.angebot_am ? new Date(lead.angebot_am) : new Date();
  if (Date.now() > ab.getTime() + 30 * 864e5) return res.status(410).json({ ok: false, error: 'Dieses Angebot ist abgelaufen. Bitte melden Sie sich direkt.' });
  const jetzt = new Date().toISOString();
  const { summe } = angebotPosten(lead);
  await db.from('leads').update({
    angenommen_am: jetzt, angenommen_von: name, angenommen_summe: summe || null,
    verlauf: [...(Array.isArray(lead.verlauf) ? lead.verlauf : []), { am: jetzt, was: 'angenommen', wert: lead.angebot_nr + ' · ' + name, wer: 'Gast' }]
  }).eq('id', lead.id);
  if (lead.tenant_id) {
    try { await pushSenden(lead.tenant_id, { titel: 'Angebot angenommen', text: name + ' · Angebot ' + lead.angebot_nr, url: 'clickzauber-cockpit-live.html#anfrage-' + lead.id, tag: 'cz-auftrag-' + lead.id }); } catch (e) {}
  }
  if (MAIL_KEY && betrieb.email) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM, to: [betrieb.email], subject: 'Angebot ' + lead.angebot_nr + ' angenommen: ' + name,
          html: '<p style="font-family:sans-serif;font-size:15px;line-height:1.6">' + esc(name) + ' hat Ihr Angebot <b>' + esc(lead.angebot_nr) + '</b> am ' + new Date(jetzt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + ' online angenommen.' + (summe ? ' Summe: ' + Number(summe).toLocaleString('de-DE') + ' €.' : '') + '</p><p style="font-family:sans-serif;font-size:14px">Bitte bestätigen Sie den Termin und sperren Sie den Tag im Cockpit.</p>' })
      });
    } catch (e) {}
  }
  return res.status(200).json({ ok: true, angenommen_am: jetzt });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.query.annahme || (req.method === 'POST' && body(req).annahme)) return gastWeg(req, res);
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const user = await userByToken(req.query.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  const lead = await meineAnfrage(req.query.id, user);
  if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });

  const betrieb = await betriebVon(lead, user);

  // Posten: aus dem Widget, sonst aus den Antworten hergeleitet.
  const { posten, summe } = angebotPosten(lead);

  // Nummer einmalig vergeben.
  let nr = lead.angebot_nr;
  if (!nr) {
    nr = await naechsteNummer(user.tenant_id);
    await db.from('leads').update({
      angebot_nr: nr,
      angebot_am: new Date().toISOString(),
      angebot_summe: summe || null,
      status: lead.status === 'gebucht' || lead.status === 'verloren' ? lead.status : 'angebot',
      status_am: new Date().toISOString(),
      verlauf: [...(Array.isArray(lead.verlauf) ? lead.verlauf : []),
        { am: new Date().toISOString(), was: 'angebot', wert: nr, wer: user.email }]
    }).eq('id', lead.id);
  }

  // Abgelaufen (30 Tage) und der Betrieb schickt es erneut (senden=1): ab heute wieder 30 Tage gültig.
  // Sonst hätte „Angebot abgelaufen: neu schicken“ denselben toten Link verschickt.
  if (nr && req.query.senden === '1' && !lead.angenommen_am && lead.angebot_am && Date.now() > Date.parse(lead.angebot_am) + 30 * 864e5) {
    const nf = { ...(lead.nf || {}) }; delete nf.o3; delete nf.o7; delete nf.ab;
    const jetzt2 = new Date().toISOString();
    const st = lead.status === 'gebucht' ? lead.status : 'angebot';
    let { error: fe } = await db.from('leads').update({ angebot_am: jetzt2, status: st, status_am: jetzt2, nf }).eq('id', lead.id);
    if (fe) await db.from('leads').update({ angebot_am: jetzt2, status: st, status_am: jetzt2 }).eq('id', lead.id);
    lead.angebot_am = jetzt2;
  }

  // Link für den Gast: einmal erzeugen, danach gleich lassen.
  let code = lead.annahme_code;
  if (!code) {
    code = randomBytes(16).toString('hex');
    await db.from('leads').update({ annahme_code: code }).eq('id', lead.id).then(() => {}, () => { code = null; });
  }

  const gueltigBis = new Date((lead.angebot_am ? Date.parse(lead.angebot_am) : Date.now()) + 30 * 864e5);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    nummer: nr,
    datum: (lead.angebot_am || new Date().toISOString()).slice(0, 10),
    gueltig_bis: gueltigBis.toISOString().slice(0, 10),
    betrieb,
    gast: { name: lead.name || null, email: lead.email || null, telefon: lead.phone || null },
    termin: lead.termin || null,
    antworten: lead.answers || {},
    posten: posten || [],
    summe,
    annahme_link: code ? 'https://clickzauber.de/angebot.html?annahme=' + code : null,
    angenommen_am: lead.angenommen_am || null, angenommen_von: lead.angenommen_von || null
  });
}
