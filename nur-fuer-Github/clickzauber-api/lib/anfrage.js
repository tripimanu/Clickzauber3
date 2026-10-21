// GET  /api/anfrage?id=…&token=…                → eine Anfrage mit Verlauf
// POST /api/anfrage { token, id, status }        → Bearbeitungsstand setzen
// POST /api/anfrage { token, id, notiz }         → interne Notiz anhängen
// POST /api/anfrage { token, id, antwort, betreff } → Nachricht an den Gast senden
// POST /api/anfrage { token, id, wert }         → Anfragewert von Hand setzen
// POST /api/anfrage { token, id, angebot_mail: true } → Angebot als Mail an den Gast
// POST /api/anfrage { token, id, wiedervorlage, wv_notiz } → „Erinnere mich am …“ (null löscht), sql/57
import { db, cors, body, userByToken, MAIL_KEY, MAIL_FROM, naechsteNummer, angebotPosten, euro, blockHash } from './_lib.js';
import { randomUUID } from 'crypto';
import { absender } from './_vertrauen.js';

const STUFEN = ['neu', 'angerufen', 'angebot', 'gebucht', 'verloren'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const p = req.method === 'POST' ? body(req) : req.query;
  const user = await userByToken(p.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  /* Blockierte Personen (seit 15.10.2026, sql/72). Liste und Freigeben ohne Anfrage-ID. */
  if (p.aktion === 'blockiert_liste' || p.aktion === 'freigeben') {
    if (!user.tenant_id) return res.status(400).json({ ok: false });
    if (p.aktion === 'freigeben') {
      const { error } = await db.from('blockiert').delete().eq('tenant_id', user.tenant_id).eq('gruppe', String(p.gruppe || ''));
      return res.status(error ? 500 : 200).json({ ok: !error });
    }
    const { data, error } = await db.from('blockiert').select('gruppe, art, label, bis, created_at').eq('tenant_id', user.tenant_id).order('created_at', { ascending: false }).limit(400);
    if (error) return res.status(200).json({ ok: false, error: /blockiert/.test(error.message) ? 'Bitte zuerst sql/72 in Supabase ausführen.' : 'Laden fehlgeschlagen.' });
    const g = {};
    (data || []).forEach((x) => { const e = g[x.gruppe] || (g[x.gruppe] = { gruppe: x.gruppe, label: x.label, am: x.created_at, arten: [] }); if (!x.bis || Date.parse(x.bis) > Date.now()) e.arten.push(x.art); });
    return res.status(200).json({ ok: true, liste: Object.values(g) });
  }

  const lead = await meineAnfrage(p.id, user);
  if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });

  /* Blockieren: Telefon, E-Mail und Handy für immer (bis zur Freigabe), den Anschluss 24 Stunden (viele teilen sich einen).
     Offene Termine dieser Anfrage werden ohne Nachricht abgesagt, die Anfrage steht auf „verloren“. Die Person merkt davon nichts. */
  if (req.method === 'POST' && p.aktion === 'blockieren') {
    const gruppe = randomUUID(), jetzt0 = new Date().toISOString();
    const tel = String(lead.phone || '').replace(/\D/g, '');
    const label = (String(lead.name || '').trim() || 'Ohne Namen').slice(0, 60) + (tel.length > 4 ? ' · …' + tel.slice(-3) : '') + (lead.email ? ' · ' + String(lead.email).replace(/^(.).*(@.*)$/, '$1…$2') : '');
    const rows = [['tel', blockHash('tel', lead.phone), null], ['mail', blockHash('mail', lead.email), null], ['geraet', lead.geraet_h || null, null]] /* seit 17.10.2026 kein Anschluss mehr (sperrte ganze WLANs) */
      .filter((r) => r[1]).map(([art, hash, bis]) => ({ tenant_id: user.tenant_id, gruppe, art, hash, bis, label }));
    if (!rows.length) return res.status(400).json({ ok: false, error: 'Zu dieser Anfrage gibt es weder Telefon noch E-Mail noch Handy. Blockieren geht hier nicht.' });
    const { error: be } = await db.from('blockiert').insert(rows);
    if (be) return res.status(500).json({ ok: false, error: /blockiert/.test(be.message) ? 'Bitte zuerst sql/72 in Supabase ausführen.' : 'Blockieren fehlgeschlagen.' });
    await db.from('termine').update({ status: 'abgesagt', status_am: jetzt0 }).eq('tenant_id', user.tenant_id).eq('lead_id', lead.id).in('status', ['wunsch', 'vorschlag', 'fest']).then(() => {}, () => {});
    const verlauf0 = (Array.isArray(lead.verlauf) ? lead.verlauf : []).concat([{ am: jetzt0, text: 'Blockiert' }]);
    await db.from('leads').update({ status: 'verloren', status_am: jetzt0, verlauf: verlauf0 }).eq('id', lead.id);
    // Weitere offene Anfragen derselben Person (gleiche Nummer oder Adresse) ebenso
    const oder = [];
    if (lead.email && /^[^\s,()"']+@[^\s,()"']+$/.test(lead.email)) oder.push('email.eq.' + lead.email);
    if (lead.phone && /^[\d+ ()\/.-]+$/.test(lead.phone) && !/[,()]/.test(lead.phone)) oder.push('phone.eq.' + lead.phone);
    if (oder.length) {
      const { data: andere } = await db.from('leads').select('id').eq('tenant_id', user.tenant_id).eq('status', 'neu').or(oder.join(',')).limit(50).then((r) => r, () => ({ data: [] }));
      for (const x of andere || []) {
        await db.from('termine').update({ status: 'abgesagt', status_am: jetzt0 }).eq('tenant_id', user.tenant_id).eq('lead_id', x.id).in('status', ['wunsch', 'vorschlag', 'fest']).then(() => {}, () => {});
        await db.from('leads').update({ status: 'verloren', status_am: jetzt0 }).eq('id', x.id).then(() => {}, () => {});
      }
    }
    return res.status(200).json({ ok: true, gruppe, label });
  }

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    // Fotos einer Beratungsanfrage: nur zeitlich begrenzte Links (1 Stunde).
    if (Array.isArray(lead.fotos) && lead.fotos.length) {
      try { const { data: su } = await db.storage.from('beratung').createSignedUrls(lead.fotos, 3600); lead.foto_urls = (su || []).map((x) => x.signedUrl).filter(Boolean); } catch (e) {}
    }
    return res.status(200).json({ ok: true, anfrage: lead });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const verlauf = Array.isArray(lead.verlauf) ? lead.verlauf : [];
  const jetzt = new Date().toISOString();
  // Für die Antwortzeit im Netzwerk (sql/41): nur die erste Reaktion zählt. Getrennt, damit es auch ohne sql/41 läuft.
  const ersteAntwort = () => lead.erste_antwort_at ? Promise.resolve()
    : db.from('leads').update({ erste_antwort_at: jetzt }).eq('id', lead.id).is('erste_antwort_at', null).then(() => {}, () => {});

  // Preis fuer das Angebot (Food Truck & Co.: Richtpreis anpassen, dann Angebot schicken)
  if (p.betrag != null) {
    const b = Math.round(Number(p.betrag));
    if (!(b > 0 && b < 1e7)) return res.status(400).json({ ok: false, error: 'Betrag ungueltig' });
    const text = String(p.posten_text || 'Leistung nach Ihren Angaben').slice(0, 200);
    let { error } = await db.from('leads').update({ value_est: b, posten: [{ text, betrag: b }] }).eq('id', lead.id);
    if (error) ({ error } = await db.from('leads').update({ value_est: b }).eq('id', lead.id));
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!p.status) return res.status(200).json({ ok: true, betrag: b });
  }
  // Wiedervorlage: Tag merken, lib/nachfassen.js erinnert ab 8 Uhr per Push und Mail.
  if (p.wiedervorlage !== undefined) {
    const am = /^\d{4}-\d{2}-\d{2}$/.test(String(p.wiedervorlage || '')) ? String(p.wiedervorlage) : null;
    const notiz = am ? (String(p.wv_notiz || '').trim().slice(0, 200) || null) : null;
    verlauf.push({ am: jetzt, was: 'wiedervorlage', wert: am ? am + (notiz ? ' · ' + notiz : '') : 'entfernt', wer: user.email });
    const { error } = await db.from('leads').update({ wv_am: am, wv_notiz: notiz, wv_gesendet_at: null, verlauf }).eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: /wv_am/.test(error.message) ? 'Bitte zuerst sql/57 in Supabase ausführen.' : 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, wv_am: am, wv_notiz: notiz, verlauf });
  }

  // Bearbeitungsstand
  if (p.status) {
    if (!STUFEN.includes(p.status)) return res.status(400).json({ ok: false, error: 'unbekannter Stand' });
    verlauf.push({ am: jetzt, was: 'status', wert: p.status, wer: user.email });
    const { error } = await db.from('leads')
      .update({ status: p.status, status_am: jetzt, verlauf })
      .eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    if (p.status !== 'neu') await ersteAntwort();
    return res.status(200).json({ ok: true, status: p.status, verlauf });
  }

  // Interne Notiz
  if (p.notiz != null) {
    const text = String(p.notiz).trim().slice(0, 2000);
    if (!text) return res.status(400).json({ ok: false, error: 'Notiz ist leer' });
    verlauf.push({ am: jetzt, was: 'notiz', wert: text, wer: user.email });
    const { error } = await db.from('leads').update({ verlauf }).eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, verlauf });
  }

  // Nachricht an den Gast
  if (p.antwort) {
    if (!lead.email) return res.status(400).json({ ok: false, error: 'Für diese Anfrage liegt keine E-Mail vor.' });
    if (!MAIL_KEY) return res.status(500).json({ ok: false, error: 'E-Mail-Versand nicht eingerichtet' });

    const text = String(p.antwort).trim().slice(0, 6000);
    if (text.length < 5) return res.status(400).json({ ok: false, error: 'Die Nachricht ist zu kurz.' });

    const betrieb = await betriebVon(lead, user);
    const antwortAn = await antwortAdresse(user, betrieb);
    const betreff = String(p.betreff || '').trim()
      || `Ihre Anfrage${lead.termin ? ' für den ' + deDatum(lead.termin) : ''}${betrieb.name ? ' bei ' + betrieb.name : ''}`;

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(MAIL_KEY);
      await resend.emails.send({
        from: await absender(lead.tenant_id),
        to: [lead.email],
        reply_to: antwortAn || undefined,
        subject: betreff,
        html: mailHtml(text, lead, betrieb, antwortAn)
      });
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'Versand fehlgeschlagen' });
    }

    verlauf.push({ am: jetzt, was: 'nachricht', wert: text, betreff, wer: user.email });
    // Wer antwortet, hat Kontakt aufgenommen — Stand nachziehen, aber nichts zurückstufen.
    const neuerStand = lead.status === 'neu' ? 'angerufen' : lead.status;
    await db.from('leads').update({ verlauf, status: neuerStand, status_am: jetzt }).eq('id', lead.id);
    await ersteAntwort();
    return res.status(200).json({ ok: true, status: neuerStand, verlauf });
  }

  // Anfragewert von Hand — wenn das Formular keinen Preis berechnet hat, gäbe es
  // sonst kein Angebot und keine Angebots-Mail für diese Anfrage.
  if (p.wert != null) {
    const wert = Math.round(Number(p.wert));
    if (!Number.isFinite(wert) || wert < 0 || wert > 10000000) {
      return res.status(400).json({ ok: false, error: 'Bitte einen Betrag in Euro eintragen.' });
    }
    verlauf.push({ am: jetzt, was: 'wert', wert: String(wert), wer: user.email });
    const { error } = await db.from('leads').update({ value_est: wert || null, verlauf }).eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, wert, verlauf });
  }

  // Angebot als Mail an den Gast — vergibt die Nummer, wenn noch keine da ist.
  if (p.angebot_mail) {
    if (!lead.email) return res.status(400).json({ ok: false, error: 'Für diese Anfrage liegt keine E-Mail vor.' });
    if (!MAIL_KEY) return res.status(500).json({ ok: false, error: 'E-Mail-Versand nicht eingerichtet' });

    const { posten, summe } = angebotPosten(lead);
    if (!summe) return res.status(400).json({ ok: false, error: 'Für diese Anfrage hat das Formular keinen Preis berechnet. Tragen Sie im Anfrage-Blatt unter „Angebot“ einen Betrag ein — dann geht die Mail raus.' });

    const betrieb = await betriebVon(lead, user);
    const antwortAn = await antwortAdresse(user, betrieb);
    const nr = lead.angebot_nr || await naechsteNummer(user.tenant_id);
    const gueltig = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const gruss = String(p.text || '').trim().slice(0, 4000) || null;

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(MAIL_KEY);
      await resend.emails.send({
        from: await absender(lead.tenant_id),
        to: [lead.email],
        reply_to: antwortAn || undefined,
        subject: `Ihr Angebot ${nr}${betrieb.name ? ' — ' + betrieb.name : ''}`,
        html: mailAngebot({ lead, betrieb, antwortAn, nr, posten, summe, gueltig, gruss })
      });
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'Versand fehlgeschlagen' });
    }

    verlauf.push({ am: jetzt, was: 'angebot_mail', wert: nr, wer: user.email });
    if (!lead.angebot_nr) verlauf.push({ am: jetzt, was: 'angebot', wert: nr, wer: user.email });
    const stand = (lead.status === 'gebucht' || lead.status === 'verloren') ? lead.status : 'angebot';
    const { error } = await db.from('leads').update({
      angebot_nr: nr,
      angebot_am: lead.angebot_am && Date.now() < Date.parse(lead.angebot_am) + 30 * 864e5 ? lead.angebot_am : jetzt,   // abgelaufen: beim erneuten Senden wieder 30 Tage
      angebot_summe: summe,
      status: stand, status_am: jetzt, verlauf
    }).eq('id', lead.id);
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    await ersteAntwort();
    return res.status(200).json({ ok: true, nummer: nr, summe, status: stand, verlauf });
  }

  return res.status(400).json({ ok: false, error: 'nichts zu tun' });
}

/* Anfrage nur, wenn sie zum angemeldeten Betrieb gehört.
   Zwei Wege, weil ältere Anfragen keine tenant_id tragen. */
export async function meineAnfrage(id, user) {
  if (!id) return null;
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return null;
  if (lead.tenant_id && lead.tenant_id === user.tenant_id) return lead;
  const { data: w } = await db.from('widgets').select('tenant_id').eq('slug', lead.widget_id).maybeSingle();
  if (w && w.tenant_id === user.tenant_id) return lead;
  return null;
}

export async function betriebVon(lead, user) {
  const id = lead.tenant_id || user.tenant_id;
  if (!id) return { name: user.firma || null, email: user.email, adresse: null };
  const { data: t } = await db.from('tenants').select('name, email').eq('id', id).maybeSingle();
  return {
    name: (t && t.name) || user.firma || null,
    email: (t && t.email) || user.email,
    adresse: [user.strasse, user.plz_ort].filter(Boolean).join(', ') || null,
    telefon: user.telefon || null,
    website: user.website || null,
    ustid: user.ustid || null
  };
}

async function antwortAdresse(user, betrieb) {
  const { data: e } = await db.from('einstellungen').select('mail_haupt, antwort_an').eq('tenant_id', user.tenant_id).maybeSingle();
  return (e && (e.antwort_an || e.mail_haupt)) || betrieb.email || user.email || null;
}

function mailHtml(text, lead, betrieb, antwortAn) {
  const absaetze = text.split(/\n{2,}/).map((a) =>
    `<p style="color:#3a352a;font-size:15px;line-height:1.7;margin:0 0 14px">${esc(a).replace(/\n/g, '<br>')}</p>`
  ).join('');
  return `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 26px 6px">
  ${betrieb.name ? `<div style="font-size:17px;font-weight:600;color:#211d16;letter-spacing:-.01em">${esc(betrieb.name)}</div>` : ''}
  ${lead.termin ? `<div style="font-family:ui-monospace,monospace;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#8a8270;margin-top:5px">Ihre Anfrage für den ${deDatum(lead.termin)}</div>` : ''}
</td></tr>
<tr><td style="padding:16px 26px 24px">
  ${absaetze}
  ${antwortAn ? `<p style="color:#8a8270;font-size:12.5px;line-height:1.55;margin:20px 0 0;border-top:1px solid #e6ddca;padding-top:14px">Sie können direkt auf diese E-Mail antworten — sie erreicht ${esc(betrieb.name || 'uns')} unter ${esc(antwortAn)}.</p>` : ''}
</td></tr>
</table></td></tr></table></body></html>`;
}

function mailAngebot({ lead, betrieb, antwortAn, nr, posten, summe, gueltig, gruss }) {
  const zeilen = posten.map((x) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #f0e9d9;color:#3a352a;font-size:14px">${esc(x.text)}</td>`
    + `<td align="right" style="padding:9px 0;border-bottom:1px solid #f0e9d9;color:#3a352a;font-size:14px;white-space:nowrap">${esc(euro(x.betrag))}</td></tr>`
  ).join('');
  const text = (gruss || `vielen Dank für Ihre Anfrage. Hier ist Ihr Angebot mit allen Posten im Überblick.`)
    .split(/\n{2,}/).map((a) =>
      `<p style="color:#3a352a;font-size:15px;line-height:1.7;margin:0 0 14px">${esc(a).replace(/\n/g, '<br>')}</p>`
    ).join('');
  return `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 26px 8px;border-bottom:1px solid #e6ddca">
  <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#1f6d4a">Angebot ${esc(nr)}</div>
  <div style="font-size:19px;font-weight:600;color:#211d16;margin-top:6px;letter-spacing:-.01em">${lead.termin ? esc(deDatum(lead.termin)) : 'Ihre Feier'}${betrieb.name ? ' bei ' + esc(betrieb.name) : ''}</div>
  <div style="font-size:13px;color:#8a8270;margin:5px 0 16px">Gültig bis ${esc(deDatum(gueltig))}</div>
</td></tr>
<tr><td style="padding:20px 26px 6px">
  <p style="color:#3a352a;font-size:15px;line-height:1.7;margin:0 0 14px">Guten Tag${lead.name ? ' ' + esc(String(lead.name).split(' ')[0]) : ''},</p>
  ${text}
</td></tr>
<tr><td style="padding:6px 26px 4px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${zeilen}
  <tr><td style="padding:13px 0 0;color:#211d16;font-size:15px;font-weight:600">Gesamt</td>
      <td align="right" style="padding:13px 0 0;color:#1f6d4a;font-size:19px;font-weight:600;white-space:nowrap">${esc(euro(summe))}</td></tr></table>
  <p style="color:#8a8270;font-size:12.5px;line-height:1.55;margin:16px 0 0">Alle Beträge in Euro. Änderungen an Gästezahl oder Leistungen ändern die Summe — sagen Sie uns einfach Bescheid, dann rechnen wir neu.</p>
</td></tr>
<tr><td style="padding:20px 26px 24px">
  <p style="color:#3a352a;font-size:14.5px;line-height:1.7;margin:0">Passt das so für Sie? Antworten Sie auf diese E-Mail${betrieb.telefon ? ' oder rufen Sie an unter ' + esc(betrieb.telefon) : ''} — dann halten wir den Termin für Sie fest.</p>
  ${antwortAn ? `<p style="color:#8a8270;font-size:12.5px;line-height:1.55;margin:18px 0 0;border-top:1px solid #e6ddca;padding-top:14px">Diese E-Mail erreicht ${esc(betrieb.name || 'uns')} unter ${esc(antwortAn)}.</p>` : ''}
</td></tr>
</table></td></tr></table></body></html>`;
}

function deDatum(s) {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(s);
  const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${tage[d.getDay()]}, ${m[3]}.${m[2]}.${m[1]}`;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
