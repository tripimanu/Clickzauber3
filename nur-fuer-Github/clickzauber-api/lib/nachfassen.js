// Nachfassen und Wiedervorlage (sql/57, seit 03.10.2026).
// Läuft stündlich (api/nacht?nur=termine, GitHub Actions) und nachts mit (api/nacht).
// Alles erst ab 8 Uhr Berliner Zeit. Jede Stufe genau einmal je Anfrage (leads.nf).
//
// An den Betrieb (Push, ohne Push als Mail; Wiedervorlage immer Push UND Mail):
//   wv      „Erinnere mich am …“ ist fällig
//   eil     Wunschtag in höchstens 7 Tagen, Anfrage seit 4 Stunden unbeantwortet
//   a1 a3 a7  Anfrage unbeantwortet seit 1, 3, 7 Tagen (Stand neu, hot, warm)
//   o3 o7   Angebot seit 3, 7 Tagen ohne Antwort
//   ab      Angebot nach 30 Tagen abgelaufen
//   vt      am Vortag ab 16 Uhr: „Morgen stehen 2 Aufträge an“ (Stand gebucht, ohne Uhrzeit-Termin)
//   vorbei  Wunschtag ist vorbei, Anfrage noch offen
//   k7      seit 7 Tagen „Kontakt aufgenommen“ ohne nächsten Schritt
//   ang     Angebot online angenommen, nach 2 Tagen noch nicht fest eingetragen
// An den Gast (Mail, abschaltbar: Einstellungen „nachfassen“):
//   n1      Zwischenmeldung nach 3 Tagen ohne Reaktion (wie bisher, nachgefasst_at)
// Nur die höchste fällige Stufe geht raus; niedrigere werden mit abgehakt. So gibt es beim
// ersten Lauf keine Flut für alte Anfragen. Mehr als 3 Nachrichten je Betrieb und Lauf: Sammelnachricht.
import { db, cors, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { T, sprache, datum as spDatum, betriebSprache, LOC } from './_sprache.js';
import { pushSenden, betriebMelden } from './_push.js';
import { heuteBerlin, plusTage, lokalText } from './_termine.js';

const TAGE = 3;
const UNBEANTWORTET = ['neu', 'hot', 'warm'];
const OFFEN = ['neu', 'hot', 'warm', 'angerufen', 'angebot'];
const SITE = (process.env.APP_URL || process.env.SITE_URL || 'https://clickzauber.de').replace(/\/$/, '');
const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if ((req.query.key || '') !== process.env.CRON_KEY) return res.status(401).json({ error: 'kein Zugriff' });
  try { return res.status(200).json({ ok: true, ...(await nachfassenLauf()) }); }
  catch (e) { return res.status(500).json({ ok: false, error: String((e && e.message) || e) }); }
}

export async function nachfassenLauf() {
  const stunde = Number(lokalText(Date.now()).zeit.slice(0, 2));
  if (stunde < 8 || stunde >= 21) return { pause: 'nur von 8 bis 21 Uhr' };
  const heute = heuteBerlin();
  const erg = { wiedervorlage: 0, betrieb: 0, gast: 0 };

  // 1. Wiedervorlagen
  const { data: wv, error: wvErr } = await db.from('leads').select('id, tenant_id, name, status, wv_am, wv_notiz')
    .lte('wv_am', heute).is('wv_gesendet_at', null).neq('status', 'verloren').limit(300);
  if (wvErr) erg.hinweis = 'sql/57 fehlt: nur Zwischenmeldung an den Gast';
  for (const l of wv || []) {
    const titel = 'Erinnerung: ' + (l.name || 'Anfrage');
    const text = (l.wv_notiz ? l.wv_notiz : 'Sie wollten heute nachfassen.') + (l.wv_am < heute ? ' (fällig seit ' + tagKurz(l.wv_am) + ')' : '');
    const url = 'clickzauber-cockpit-live.html#anfrage-' + l.id;
    await pushSenden(l.tenant_id, { titel, text, url, tag: 'cz-wv-' + l.id }).catch(() => 0);
    await betriebMail(l.tenant_id, titel, text, url, 'Sie haben sich diese Erinnerung im Cockpit gesetzt.');
    await db.from('leads').update({ wv_gesendet_at: new Date().toISOString() }).eq('id', l.id);
    erg.wiedervorlage++;
  }

  // 1b. Am Vortag ab 16 Uhr: „Morgen stehen 2 Aufträge an“, eine Nachricht je Betrieb (nf.vt).
  if (!wvErr && stunde >= 16) {
    const morgen = plusTage(heute, 1);
    const { data: mo } = await db.from('leads').select('id, tenant_id, name, termin, answers, nf').eq('status', 'gebucht').eq('termin', morgen).limit(500).then((r) => r, () => ({ data: [] }));
    const mt = await mitTerminSet((mo || []).map((l) => l.id));
    const je = {};
    for (const l of mo || []) { if (mt.has(l.id) || (l.nf && l.nf.vt)) continue; (je[l.tenant_id] = je[l.tenant_id] || []).push(l); }
    for (const [tid, ls] of Object.entries(je)) {
      const ort = (l) => { const a = l.answers || {}; return a.ort || a.adresse || a.einsatzort || ''; };
      await betriebMelden(tid, {
        titel: ls.length === 1 ? 'Morgen: ' + (ls[0].name || 'ein Auftrag') : 'Morgen stehen ' + ls.length + ' Aufträge an',
        text: ls.slice(0, 5).map((l) => (l.name || 'Ohne Namen') + (ort(l) ? ' (' + ort(l) + ')' : '')).join(', '),
        url: ls.length === 1 ? 'clickzauber-cockpit-live.html#anfrage-' + ls[0].id : 'clickzauber-cockpit-live.html#leads', tag: 'cz-vortag'
      }).catch(() => {});
      const st = new Date().toISOString();
      for (const l of ls) await db.from('leads').update({ nf: Object.assign({}, l.nf || {}, { vt: st }) }).eq('id', l.id);
      erg.vortag = (erg.vortag || 0) + 1;
    }
  }

  // 2. Offene Anfragen der letzten 45 Tage
  const seit = new Date(Date.now() - 45 * 864e5).toISOString();
  const SP = 'id, tenant_id, name, email, status, status_am, ts, termin, answers, value_est, sprache, angebot_am, angenommen_am, nachgefasst_at';
  let { data: leads, error } = await db.from('leads').select(SP + ', nf').in('status', OFFEN).gte('ts', seit).limit(1500);
  const nfDa = !error;
  if (error) ({ data: leads } = await db.from('leads').select(SP).in('status', UNBEANTWORTET).gte('ts', seit).limit(500));
  if (!leads || !leads.length) return erg;
  // Anfragen mit Uhrzeit-Termin (Beauty & Co.) erinnert schon lib/_termin-pflege.js.
  const mitTermin = await mitTerminSet(leads.map((l) => l.id));
  leads = leads.filter((l) => !mitTermin.has(l.id));

  const tids = [...new Set(leads.map((l) => l.tenant_id).filter(Boolean))];
  const [{ data: firmen }, { data: eins }] = await Promise.all([
    db.from('tenants').select('id, name, email').in('id', tids),
    db.from('einstellungen').select('tenant_id, nachfassen').in('tenant_id', tids).then((r) => r, () => ({ data: [] }))
  ]);
  const firma = Object.fromEntries((firmen || []).map((t) => [t.id, t]));
  const gastAus = new Set((eins || []).filter((e) => e.nachfassen === false).map((e) => e.tenant_id));
  const proBetrieb = {};
  const bSpr = {};

  for (const l of leads) {
    const nf = Object.assign({}, l.nf || {});
    const neu = {};
    const std = (Date.now() - Date.parse(l.ts)) / 36e5;
    const wunsch = wunschtag(l);
    const offenSeit = UNBEANTWORTET.includes(l.status);

    if (nfDa) {
      // Wunschtag vorbei: einmal, höchstens 7 Tage danach
      if (wunsch && wunsch < heute && wunsch >= plusTage(heute, -7) && !nf.vorbei) {
        neu.vorbei = 1;
        melde(proBetrieb, l, 'Wunschtag vorbei: ' + (l.name || 'Anfrage'), 'Der ' + tagKurz(wunsch) + ' ist vorbei und die Anfrage ist noch offen. Absagen oder abschließen?');
      } else if (offenSeit) {
        const tage = Math.floor(std / 24);
        const stufe = tage >= 7 ? 'a7' : tage >= 3 ? 'a3' : tage >= 1 ? 'a1' : null;
        const bisWunsch = wunsch ? tageZwischen(heute, wunsch) : 99;
        if (stufe && !nf[stufe]) {
          for (const s of ['a1', 'a3', 'a7']) { if (!nf[s]) neu[s] = 1; if (s === stufe) break; }
          neu.eil = 1;
          melde(proBetrieb, l, (l.name || 'Eine Anfrage') + ' wartet seit ' + tage + (tage === 1 ? ' Tag' : ' Tagen'), (wunsch && bisWunsch >= 0 && bisWunsch <= 14 ? 'Wunschtag in ' + bisWunsch + (bisWunsch === 1 ? ' Tag' : ' Tagen') + '. ' : '') + 'Noch keine Antwort.');
        } else if (!stufe && !nf.eil && std >= 4 && bisWunsch >= 0 && bisWunsch <= 7) {
          neu.eil = 1;
          melde(proBetrieb, l, 'Eilt: ' + (l.name || 'Anfrage'), 'Wunschtag ' + (bisWunsch === 0 ? 'heute' : 'in ' + bisWunsch + (bisWunsch === 1 ? ' Tag' : ' Tagen')) + ', noch keine Antwort.');
        }
      } else if (l.status === 'angerufen' && l.status_am && !nf.k7 && Date.now() - Date.parse(l.status_am) > 7 * 864e5) {
        // „Kontakt aufgenommen“ und dann nichts mehr: einmal nach 7 Tagen nachfragen.
        neu.k7 = 1;
        melde(proBetrieb, l, 'Wie geht es weiter? ' + (l.name || 'Anfrage'), 'Seit 7 Tagen auf „Kontakt aufgenommen“. Angebot schicken, Erinnerung setzen oder abschließen?');
      } else if (l.status === 'angebot' && l.angenommen_am && !nf.ang && Date.now() - Date.parse(l.angenommen_am) > 2 * 864e5) {
        // Online angenommen, aber nach 2 Tagen noch nicht fest eingetragen: Tag ist im Formular noch frei.
        neu.ang = 1;
        melde(proBetrieb, l, 'Noch nicht fest eingetragen: ' + (l.name || 'Anfrage'), wunsch ? 'Das Angebot wurde vor 2 Tagen angenommen. Bitte den Tag fest eintragen, sonst ist er im Formular noch frei.' : 'Das Angebot wurde vor 2 Tagen angenommen. Bitte als Auftrag eintragen und dem Kunden Bescheid geben.');
      } else if (l.status === 'angebot' && l.angebot_am && !l.angenommen_am) {
        const tage = Math.floor((Date.now() - Date.parse(l.angebot_am)) / 864e5);
        const stufe = tage >= 30 ? 'ab' : tage >= 7 ? 'o7' : tage >= 3 ? 'o3' : null;
        if (stufe && !nf[stufe]) {
          neu.o3 = 1; if (stufe !== 'o3') neu.o7 = 1; if (stufe === 'ab') neu.ab = 1;
          if (stufe === 'ab') melde(proBetrieb, l, 'Angebot abgelaufen: ' + (l.name || 'Anfrage'), 'Nach 30 Tagen lässt es sich nicht mehr annehmen. Neu schicken oder abschließen?');
          else melde(proBetrieb, l, 'Angebot ohne Antwort: ' + (l.name || 'Anfrage'), 'Seit ' + tage + ' Tagen keine Antwort. Kurz nachfragen?');
        }
      }
    }

    // Zwischenmeldung an den Gast (wie bisher)
    if (offenSeit && std >= TAGE * 24 && !l.nachgefasst_at && !gastAus.has(l.tenant_id) && (!wunsch || wunsch >= heute)) {
      const f = firma[l.tenant_id] || {};
      const gl = sprache(l.sprache);
      if (l.email && await mail({ to: l.email, subject: T(gl).n_betreff(f.name || ''), html: gastHtml(l, f, gl) })) erg.gast++;
      if (!nfDa && f.email) {
        if (!(l.tenant_id in bSpr)) bSpr[l.tenant_id] = await betriebSprache(db, l.tenant_id);
        await mail({ to: f.email, subject: T(bSpr[l.tenant_id]).nb_betreff(l.name || '', TAGE), html: betriebHtml(l, f, bSpr[l.tenant_id]) });
      }
      await db.from('leads').update({ nachgefasst_at: new Date().toISOString() }).eq('id', l.id);
    }

    if (Object.keys(neu).length) {
      const st = new Date().toISOString();
      for (const k of Object.keys(neu)) nf[k] = nf[k] || st;
      await db.from('leads').update({ nf }).eq('id', l.id);
    }
  }

  for (const [tid, liste] of Object.entries(proBetrieb)) {
    const einzeln = liste.length <= 3 ? liste : liste.slice(0, 2);
    for (const n of einzeln) { await betriebMelden(tid, n).catch(() => {}); erg.betrieb++; }
    if (liste.length > 3) {
      await betriebMelden(tid, { titel: (liste.length - 2) + ' weitere Anfragen brauchen Sie', text: liste.slice(2).map((n) => n.name).filter(Boolean).slice(0, 5).join(', '), url: 'clickzauber-cockpit-live.html#leads', tag: 'cz-nf-sammel' }).catch(() => {});
      erg.betrieb++;
    }
  }
  return erg;
}

async function mitTerminSet(ids) {
  const s = new Set();
  for (let i = 0; i < ids.length; i += 300) {
    const { data: tt } = await db.from('termine').select('lead_id').in('lead_id', ids.slice(i, i + 300)).then((r) => r, () => ({ data: [] }));
    (tt || []).forEach((t) => s.add(t.lead_id));
  }
  return s;
}
function melde(pro, l, titel, text) {
  (pro[l.tenant_id] = pro[l.tenant_id] || []).push({ titel, text, name: l.name || '', url: 'clickzauber-cockpit-live.html#anfrage-' + l.id, tag: 'cz-nf-' + l.id });
}
function wunschtag(l) {
  const a = l.answers || {};
  const s = String(l.termin || a.termin || a.wunschtermin || a.datum || '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}
function tageZwischen(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
function tagKurz(s) { const d = new Date(s + 'T12:00:00Z'); return WT[d.getUTCDay()] + ', ' + d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.'; }

export async function betriebMail(tid, titel, text, url, fuss) {
  if (!MAIL_KEY || !tid) return false;
  const [{ data: e }, { data: t }] = await Promise.all([
    db.from('einstellungen').select('mail_haupt, mail_zweit').eq('tenant_id', tid).maybeSingle().then((r) => r, () => ({ data: null })),
    db.from('tenants').select('email').eq('id', tid).maybeSingle().then((r) => r, () => ({ data: null }))
  ]);
  const an = [...new Set([(e && e.mail_haupt) || (t && t.email), e && e.mail_zweit].filter(Boolean))];
  if (!an.length) return false;
  return mail({ to: an, subject: titel, html: rahmen(`<tr><td style="padding:24px 26px">
  <div style="font-size:20px;font-weight:600;color:#211d16">${esc(titel)}</div>
  <p style="color:#5f584a;font-size:15px;line-height:1.6;margin:10px 0 18px">${esc(text)}</p>
  <a href="${esc(SITE + '/' + url)}" style="display:inline-block;background:#1f6d4a;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">Anfrage öffnen</a>
  <p style="color:#8a8272;font-size:12.5px;line-height:1.5;margin:18px 0 0">${esc(fuss)}</p>
</td></tr>`) });
}

async function mail({ to, subject, html }) {
  if (!MAIL_KEY) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MAIL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html })
    });
    return r.ok;
  } catch {
    return false;
  }
}

function rahmen(inner, l = 'de') {
  return `<!DOCTYPE html><html lang="${l}"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px;overflow:hidden">
${inner}
</table></td></tr></table></body></html>`;
}

function gastHtml(l, firma, sp = 'de') {
  const X = T(sp);
  const termin = wunschtag(l);
  return rahmen(`<tr><td style="padding:24px 26px">
  <div style="font-size:19px;font-weight:600;color:#211d16">${esc(X.n_titel(firma.name || ''))}</div>
  <p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">
    ${esc(X.guten(l.name ? l.name.split(' ')[0] : ''))}, ${esc(X.n_text1(termin ? spDatum(sp, termin, false) : ''))}
  </p>
  <p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">${X.n_text2}</p>
  <p style="color:#8a8270;font-size:13px;line-height:1.6;margin:20px 0 0">${X.n_fuss}</p>
</td></tr>`, sp);
}

function betriebHtml(l, firma, sp = 'de') {
  const X = T(sp);
  const wert = l.value_est ? Number(l.value_est).toLocaleString(LOC[sprache(sp)]) + ' €' : null;
  const zeilen = Object.entries(l.answers || {}).filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#8a8270;font-size:13px">${esc(k)}</td><td style="padding:6px 0;text-align:right;color:#211d16;font-size:13.5px;font-weight:600">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`)
    .join('');
  return rahmen(`<tr><td style="padding:24px 26px">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a8442f">${esc(X.nb_kopf(TAGE))}</div>
  <div style="font-size:19px;font-weight:600;color:#211d16;margin-top:6px">${esc(l.name || X.anfrage)}${wert ? ` · ${wert}` : ''}</div>
  <p style="color:#5f584a;font-size:14.5px;line-height:1.6;margin:12px 0 16px">${X.nb_text}</p>
  <table role="presentation" width="100%">${zeilen}</table>
</td></tr>`, sp);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
