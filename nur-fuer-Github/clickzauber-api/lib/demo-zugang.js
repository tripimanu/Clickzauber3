// /api/demo-zugang — persönliche Demo-Zugänge (sql/55).
// Öffentlich (Demo-Cockpit, js/cz-demo-zugang.js):
//   GET  ?z=CODE[&poll=1]                       → gültig? Betrieb, Branche, Ablauf, ungelesene Hinweise
//   POST { z, aktion:'klicks', sitzung, e:[{t,a,w,s}] } → Klicks speichern (nie Eingaben)
//   POST { z, aktion:'gelesen', id }            → Hinweis gelesen
//   POST { z, aktion:'feedback', ... }          → ehrliches Feedback bei „Nichts für mich“
//   POST { z, aktion:'interesse' }              → letzter Tag: „Ja, ich möchte es nutzen“ (Push und Mail an den Betreiber)
//   GET  ?qr=1005&g=GERÄT                       → QR-Code gültig? Branche-Vorschlag; hat das Gerät schon eine Demo, deren Code
//   POST { qr, g, aktion:'qr-start', branche, betrieb, vorname, nachname, telefon, vertraulich } → neue Demo 1005-041 (sql/56)
//   GET  ?qr=2001&g=GERÄT bei Links (demo_qr.art 'link', sql/62) → zählt den Aufruf, Antwort art:'link'
//   POST { qr, g, aktion:'link-start', branche }  → neue Demo 2001-017 sofort, ohne Angaben (Facebook-Gruppen & Co.)
//   POST { z, aktion:'anmelden', betrieb, … }      → bei Demos aus einem Link: Kontakt freiwillig hinterlassen, Push an den Betreiber
// Betreiber (Vertrieb-Seite, ADMIN_TOKEN):
//   GET  ?key=…&aktion=liste | &aktion=verlauf&z=CODE | &aktion=qr-liste | &aktion=kennzahlen&tage=90
//   POST { key, aktion:'qr-neu'|'qr-aendern', nr, notiz, branche, max }
//   POST { key, aktion:'neu'|'sperren'|'entsperren'|'verlaengern'|'loeschen'|'hinweis'|'pilot'|'verschickt', … }
import { db, cors, MAIL_KEY, MAIL_FROM, MAIL_TO, gebremst, ipVon } from './_lib.js';
import { randomBytes } from 'crypto';
// Einverständnis beim Start (Pflicht seit 07.10.2026). Steht im Verlauf und geht mit dem Zugang 30 Tage nach Ablauf.
const EINV = 'Einverstanden: Angaben und Klicks, gelöscht 30 Tage nach Ende der Demo';
const EINV_FEHLT = 'Bitte bestätigen Sie, dass Sie einverstanden sind.';
import { pushSenden } from './_push.js';

/* Push an den Betreiber: an alle Geräte der Konten aus ADMIN_EMAILS (Push im eigenen Cockpit einschalten). */
export async function betreiberPush(titel, text, url) {
  try {
    const mails = (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const { data } = await db.from('users').select('tenant_id').in('email', mails);
    const t = [...new Set((data || []).map((u) => u.tenant_id).filter(Boolean))];
    await Promise.all(t.map((id) => pushSenden(id, { titel, text, url: url || 'clickzauber-vertrieb.html' })));
  } catch (e) { /* Push darf nichts aufhalten */ }
}
function geraetVon(req) {
  const ua = String(req.headers['user-agent'] || '');
  const typ = /iPad|Tablet/i.test(ua) ? 'Tablet' : /iPhone|Android.*Mobile|Mobile/i.test(ua) ? 'Handy' : 'Computer';
  const sys = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  let ort = ''; try { ort = decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')); } catch (e) {}
  const land = String(req.headers['x-vercel-ip-country'] || '');
  return { typ, sys, br, ort: [ort, land].filter(Boolean).join(', ') };
}

const TAG = 864e5;
const kurz = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const BREMSE = new Map(); // Code → { n, ts }: höchstens 40 Klick-Pakete pro Minute
const ART = { k: 'klick', v: 'ansicht', s: 'seite', x: 'schritt' };

function daten(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
export function neuerCode() {
  const z = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = '';
  const b = randomBytes(10);
  for (const x of b) s += z[x % z.length];
  return s;
}
function gueltig(r) { return !!r && !r.gesperrt_am && new Date(r.laeuft_ab).getTime() > Date.now(); }
function restTage(r) { return Math.max(0, Math.ceil((new Date(r.laeuft_ab).getTime() - Date.now()) / TAG)); }
async function mail(betreff, zeilen) {
  if (!MAIL_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${MAIL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: MAIL_TO, subject: betreff, text: zeilen.join('\n') })
    });
  } catch (e) { /* Mail darf nichts aufhalten */ }
}
async function holen(code) {
  if (!/^[a-z0-9]{6,20}$/.test(String(code || ''))) return null;
  const { data } = await db.from('demo_zugaenge').select('*').eq('code', code).maybeSingle();
  return data || null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? daten(req) : (req.query || {});
  const key = p.key || (req.query && req.query.key);
  if (key) {
    if (!process.env.ADMIN_TOKEN || key !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'kein Zugriff' });
    return betreiber(req, res, p);
  }
  if (p.qr != null && p.qr !== '' && !p.z) return qrOeffentlich(req, res, p);

  const r = await holen(p.z);
  if (!gueltig(r)) return res.status(200).json({ ok: false, error: 'ungueltig' });

  if (req.method === 'GET') {
    const jetzt = new Date().toISOString();
    if (!p.poll) {
      const neu = { aufrufe: (r.aufrufe || 0) + 1, zuletzt_am: jetzt };
      if (!r.erstmals_am) neu.erstmals_am = jetzt;
      /* Geräte: jedes Gerät hat eine eigene Kennung (g). Ab dem zweiten bekommt der Betreiber eine Warnung. */
      const gid = kurz(p.g, 24).replace(/[^a-z0-9]/gi, ''), info = geraetVon(req), G = Array.isArray(r.geraete) ? r.geraete.slice() : [];
      let neuesGeraet = false;
      if (gid) {
        const x = G.find((y) => y.id === gid);
        if (x) { x.zuletzt = jetzt; x.n = (x.n || 0) + 1; if (info.ort) x.ort = info.ort; }
        else { G.push({ id: gid, ...info, erst: jetzt, zuletzt: jetzt, n: 1 }); neuesGeraet = G.length > 1; }
        neu.geraete = G.slice(-20);
      }
      const wer = r.gast_am ? r.gast_vorname + ' ' + r.gast_nachname + ' (' + r.betrieb + ')' : r.betrieb;
      // Besucher aus einem Link ohne Kontakt: keine Push-Nachricht bei jedem Besuch (sonst bei vielen Besuchern zu viele)
      const pushFaellig = !(r.quelle === 'link' && !r.gast_am) && (!r.aktiv_push_am || Date.now() - new Date(r.aktiv_push_am).getTime() > 30 * 60e3);
      if (pushFaellig) neu.aktiv_push_am = jetzt;
      await db.from('demo_zugaenge').update(neu).eq('code', r.code);
      if (pushFaellig) await betreiberPush('Gerade in der Demo', wer + ' · ' + info.typ + ', ' + info.br + (info.ort ? ' · ' + info.ort : ''), 'clickzauber-vertrieb.html#demo-' + r.code);
      if (neuesGeraet) {
        const liste = G.map((y, i) => (i + 1) + '. ' + y.typ + ', ' + (y.sys ? y.sys + ', ' : '') + y.br + (y.ort ? ', ' + y.ort : '') + ' · zuerst ' + new Date(y.erst).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
        await betreiberPush('Achtung: weiteres Gerät', 'Der Demo-Link von ' + r.betrieb + ' wurde auf Gerät ' + G.length + ' geöffnet.', 'clickzauber-vertrieb.html#demo-' + r.code);
        await mail('Achtung: Demo auf ' + G.length + '. Gerät geöffnet · ' + r.betrieb, ['Der persönliche Demo-Link von ' + r.betrieb + ' wurde auf einem weiteren Gerät geöffnet. Möglicherweise wurde er weitergegeben.', '', ...liste, '', 'Sperren: Vertrieb-Seite, „Demo-Zugänge“.']);
      }
      if (!r.erstmals_am) await mail('Demo geöffnet · ' + r.betrieb, [
        r.betrieb + ' hat den persönlichen Demo-Zugang zum ersten Mal geöffnet.', '',
        'Branche: ' + (r.branche || '–'), 'Gültig bis: ' + new Date(r.laeuft_ab).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), '',
        'Was er anklickt, sehen Sie auf der Vertrieb-Seite im Reiter „7-Tage-Demos“.'
      ]);
    } else await db.from('demo_zugaenge').update({ zuletzt_am: jetzt }).eq('code', r.code);
    const hinweise = (r.hinweise || []).filter((h) => !h.gelesen).map((h) => ({ id: h.id, text: h.text, ts: h.ts }));
    return res.status(200).json({ ok: true, betrieb: r.betrieb, branche: r.branche, laeuft_ab: r.laeuft_ab, tage: restTage(r), hinweise, angemeldet: !!r.gast_am, vorname: r.gast_vorname || '', nachname: r.gast_nachname || '', telefon: r.gast_telefon || r.telefon || '', quelle: r.quelle || (r.qr_nr ? 'qr' : 'persoenlich') });
  }

  if (p.aktion === 'klicks') {
    const b = BREMSE.get(r.code), t = Date.now();
    if (b && t - b.ts < 60e3 && b.n >= 40) return res.status(429).json({ ok: false });
    BREMSE.set(r.code, b && t - b.ts < 60e3 ? { n: b.n + 1, ts: b.ts } : { n: 1, ts: t });
    const e = (Array.isArray(p.e) ? p.e : []).slice(0, 120).map((x) => ({
      code: r.code, sitzung: kurz(p.sitzung, 24) || null,
      ts: new Date(Math.min(t, Math.max(t - 36e5, Number(x.t) || t))).toISOString(),
      art: ART[x.a] || 'klick', was: kurz(x.w, 140) || null, seite: kurz(x.s, 60) || null
    }));
    if (!e.length) return res.status(200).json({ ok: true });
    const { error } = await db.from('demo_ereignisse').insert(e);
    if (!error) await db.from('demo_zugaenge').update({ klicks: (r.klicks || 0) + e.length }).eq('code', r.code);
    return res.status(200).json({ ok: !error });
  }

  // Pflichtangaben beim ersten Öffnen: Vorname, Nachname, Telefon.
  // Demo aus einem Link (quelle 'link'): freiwillig, mit Betrieb, ohne Vertraulichkeit. Dann Push und Mail an den Betreiber.
  if (p.aktion === 'anmelden') {
    const istLink = r.quelle === 'link';
    const g = { gast_vorname: kurz(p.vorname, 60), gast_nachname: kurz(p.nachname, 60), gast_telefon: kurz(p.telefon, 40) };
    if (istLink) {
      g.betrieb = kurz(p.betrieb, 80);
      if (g.betrieb.length < 2) return res.status(400).json({ ok: false, hinweis: 'Bitte den Namen Ihres Betriebs eintragen.' });
    }
    if (g.gast_vorname.length < 2 || g.gast_nachname.length < 2) return res.status(400).json({ ok: false, hinweis: 'Bitte Vor- und Nachnamen eintragen.' });
    if (g.gast_telefon.replace(/\D/g, '').length < 7) return res.status(400).json({ ok: false, hinweis: 'Bitte eine gültige Telefonnummer eintragen.' });
    if (!istLink && !(p.vertraulich === true || p.vertraulich === 'true')) return res.status(400).json({ ok: false, hinweis: 'Bitte bestätigen Sie, dass Sie die Demo vertraulich behandeln.' });
    if (!(p.einverstanden === true || p.einverstanden === 'true')) return res.status(400).json({ ok: false, hinweis: EINV_FEHLT });
    if (!istLink) g.vertraulich_am = r.vertraulich_am || new Date().toISOString();
    else g.telefon = g.gast_telefon;
    const erst = !r.gast_am;
    g.gast_am = r.gast_am || new Date().toISOString();
    const { error } = await db.from('demo_zugaenge').update(g).eq('code', r.code);
    if (error) return res.status(500).json({ ok: false, hinweis: 'Speichern hat nicht geklappt.' });
    const wer = g.gast_vorname + ' ' + g.gast_nachname;
    await db.from('demo_ereignisse').insert([{ code: r.code, art: 'schritt', was: EINV }, { code: r.code, art: 'schritt', was: (istLink ? 'Kontakt hinterlassen: ' : 'Angemeldet: ') + wer }]);
    if (erst && istLink) {
      const { data: q } = r.qr_nr ? await db.from('demo_qr').select('notiz').eq('nr', r.qr_nr).maybeSingle() : { data: null };
      const wo = 'Link ' + qrNummer(r.qr_nr || 0, r.qr_lfd || 0) + (q && q.notiz ? ' (' + q.notiz + ')' : '');
      await betreiberPush('Neuer Kontakt · ' + wo, wer + ' · ' + g.betrieb + ' · ' + g.gast_telefon, 'clickzauber-vertrieb.html#demo-' + r.code);
      await mail('Neuer Kontakt aus ' + wo + ' · ' + wer + ' · ' + g.betrieb, [
        'Jemand, der die Demo über ' + wo + ' geöffnet hat, möchte, dass Sie sich melden.', '',
        'Name: ' + wer, 'Betrieb: ' + g.betrieb, 'Telefon: ' + g.gast_telefon, 'Branche: ' + (r.branche || '–'), '',
        'Was er bisher angeklickt hat, sehen Sie auf der Vertrieb-Seite im Reiter „7-Tage-Demos“.'
      ]);
    } else if (erst) await mail('Demo: ' + wer + ' · ' + r.betrieb, [
      'Im Demo-Zugang von ' + r.betrieb + ' hat sich jemand eingetragen.', '',
      'Name: ' + wer, 'Telefon: ' + g.gast_telefon, '',
      'Was er anklickt, sehen Sie auf der Vertrieb-Seite im Reiter „7-Tage-Demos“.'
    ]);
    return res.status(200).json({ ok: true });
  }

  if (p.aktion === 'frage') {
    const text = kurz(p.text, 1000);
    if (text.length < 3) return res.status(400).json({ ok: false, hinweis: 'Bitte schreiben Sie Ihre Frage.' });
    const F = (Array.isArray(r.fragen) ? r.fragen : []).concat([{ id: Date.now().toString(36), text, ts: new Date().toISOString(), seite: kurz(p.seite, 60) }]).slice(-50);
    await db.from('demo_zugaenge').update({ fragen: F }).eq('code', r.code);
    await db.from('demo_ereignisse').insert({ code: r.code, art: 'schritt', was: 'Frage an Manuel: ' + text.slice(0, 120), seite: kurz(p.seite, 60) || null });
    const wer = r.gast_am ? r.gast_vorname + ' ' + r.gast_nachname : r.betrieb;
    await betreiberPush('Frage von ' + wer, text.slice(0, 140), 'clickzauber-vertrieb.html#demo-' + r.code);
    await mail('Demo-Frage · ' + wer + ' · ' + r.betrieb, [wer + ' (' + r.betrieb + ') fragt in der Demo:', '', text, '', 'Telefon: ' + (r.gast_telefon || r.telefon || '–'), 'Gerade in: ' + (kurz(p.seite, 60) || '–'), '', 'Antworten: Vertrieb-Seite → „Demo-Zugänge“ → Hinweis senden, oder anrufen.']);
    return res.status(200).json({ ok: true });
  }

  /* Letzter Tag: „Ja, ich möchte es nutzen“ */
  if (p.aktion === 'interesse') {
    const wer = r.gast_am ? r.gast_vorname + ' ' + r.gast_nachname : r.betrieb;
    await db.from('demo_ereignisse').insert({ code: r.code, art: 'schritt', was: 'Will clickzauber nutzen' });
    await betreiberPush('Will clickzauber nutzen: ' + wer, r.betrieb + (r.gast_telefon || r.telefon ? ' · ' + (r.gast_telefon || r.telefon) : ''), 'clickzauber-vertrieb.html#demo-' + r.code);
    await mail('Will clickzauber nutzen · ' + wer + ' · ' + r.betrieb, [wer + ' (' + r.betrieb + ') hat am Ende der Demo „Ja, ich möchte es nutzen“ gewählt.', '', 'Telefon: ' + (r.gast_telefon || r.telefon || '–'), '', 'Pilotplatz vergeben: Vertrieb-Seite → „Demo-Zugänge“ → „Pilotplatz geben“ (sobald er ein Konto hat).']);
    return res.status(200).json({ ok: true });
  }

  if (p.aktion === 'gelesen') {
    const h = (r.hinweise || []).map((x) => (x.id === p.id ? { ...x, gelesen: new Date().toISOString() } : x));
    await db.from('demo_zugaenge').update({ hinweise: h }).eq('code', r.code);
    await db.from('demo_ereignisse').insert({ code: r.code, art: 'schritt', was: 'Hinweis gelesen' });
    return res.status(200).json({ ok: true });
  }

  if (p.aktion === 'feedback') {
    const f = { schlecht: kurz(p.schlecht, 2000), warum: kurz(p.warum, 2000), anders: kurz(p.anders, 2000), gut: kurz(p.gut, 2000), ts: new Date().toISOString() };
    if (!f.schlecht && !f.warum && !f.anders && !f.gut) return res.status(400).json({ ok: false, error: 'leer', hinweis: 'Bitte beantworten Sie mindestens eine Frage.' });
    await db.from('demo_zugaenge').update({ feedback: f }).eq('code', r.code);
    await db.from('demo_ereignisse').insert({ code: r.code, art: 'schritt', was: 'Feedback „Nichts für mich“ abgeschickt' });
    await mail('Demo: Nichts für mich · ' + r.betrieb, [
      r.betrieb + ' hat in der Demo „Nichts für mich“ gewählt.', '',
      'Was hat nicht gefallen:', f.schlecht || '–', '',
      'Warum nicht nutzen:', f.warum || '–', '',
      'Was müsste anders sein:', f.anders || '–', '',
      'Was war gut:', f.gut || '–'
    ]);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ ok: false, error: 'aktion' });
}

/* Termin-Link (lib/vertrieb-termin.js, seit 07.10.2026): Nach der Bestätigung eine eigene Demo für 7 Tage.
   Name und Telefon stehen schon da, beim ersten Öffnen sind die Felder vorausgefüllt. Die Vertraulichkeit bestätigt er dort selbst. */
export async function demoAusTermin(t, telefon) {
  const teile = kurz(t.name, 80).split(' ').filter(Boolean), tel = kurz(telefon || t.telefon, 40) || null;
  const z = {
    code: neuerCode(), betrieb: kurz(t.betrieb || t.name, 80) || 'Interessent', branche: BRANCHEN.includes(t.branche) ? t.branche : 'friseur',
    telefon: tel, notiz: 'Aus Termin-Link ' + t.code, laeuft_ab: new Date(Date.now() + 7 * TAG).toISOString(),
    gast_vorname: teile.length ? (teile.length > 1 ? teile.slice(0, -1).join(' ') : teile[0]) : null, gast_nachname: teile.length > 1 ? teile[teile.length - 1] : null, gast_telefon: tel
  };
  const { error } = await db.from('demo_zugaenge').insert(z);
  return error ? null : z.code;
}

/* ── QR-Codes: jeder Scan wird eine eigene Demo ── */
// Neue Demos aus QR-Code und Gruppen-Link: höchstens 6 je Anschluss in 10 Minuten, gezählt in der Datenbank (gebremst, sql/71).
export const BRANCHEN = ['friseur', 'kosmetik', 'catering', 'hochzeit', 'handwerk', 'beratung'];
export function qrNummer(nr, lfd) { return nr + '-' + String(lfd).padStart(3, '0'); }
async function qrOeffentlich(req, res, p) {
  const nr = parseInt(p.qr, 10);
  if (!(nr >= 100 && nr < 1e7)) return res.status(200).json({ ok: false, error: 'ungueltig' });
  const { data: q } = await db.from('demo_qr').select('*').eq('nr', nr).maybeSingle();
  if (!q || q.gesperrt_am) return res.status(200).json({ ok: false, error: 'ungueltig' });
  const g = kurz(p.g, 24).replace(/[^a-z0-9]/gi, ''), istLink = q.art === 'link';
  /* Jeder Aufruf zählt (sql/62), auch wiederholte. Fehlt die Spalte noch, passiert nichts. */
  if (req.method === 'GET') await db.from('demo_qr').update({ aufrufe: (q.aufrufe || 0) + 1 }).eq('nr', nr).then(() => {}, () => {});
  /* Dasselbe Gerät scannt noch einmal: bisherige Demo geht weiter */
  if (g) {
    const { data: alt } = await db.from('demo_zugaenge').select('code, branche, laeuft_ab, gesperrt_am').eq('qr_nr', nr).eq('qr_geraet', g)
      .order('erstellt_am', { ascending: false }).limit(1).maybeSingle();
    if (alt) {
      /* Link aus einer Gruppe: Ist die Demo abgelaufen, geht sie weitere 7 Tage (außer, sie wurde gesperrt). Sonst stünde er vor „nicht mehr gültig“. */
      if (istLink && !alt.gesperrt_am && !gueltig(alt)) {
        await db.from('demo_zugaenge').update({ laeuft_ab: new Date(Date.now() + 7 * TAG).toISOString(), vorablauf_mail_am: null }).eq('code', alt.code);
        return res.status(200).json({ ok: true, code: alt.code, branche: alt.branche, weiter: true });
      }
      return res.status(200).json(gueltig(alt) ? { ok: true, code: alt.code, branche: alt.branche, weiter: true } : { ok: false, error: 'ungueltig' });
    }
  }
  const voll = q.max_scans != null && q.scans >= q.max_scans;
  if (req.method === 'GET') return res.status(200).json(voll ? { ok: false, error: 'voll' } : { ok: true, nr, branche: q.branche, art: istLink ? 'link' : 'qr' });
  if (p.aktion !== (istLink ? 'link-start' : 'qr-start')) return res.status(400).json({ ok: false, error: 'aktion' });
  if (voll) return res.status(200).json({ ok: false, error: 'voll' });
  if (istLink) return linkStart(req, res, p, q, nr, g);

  const d = {
    betrieb: kurz(p.betrieb, 80), branche: BRANCHEN.includes(p.branche) ? p.branche : q.branche,
    gast_vorname: kurz(p.vorname, 60), gast_nachname: kurz(p.nachname, 60), gast_telefon: kurz(p.telefon, 40)
  };
  if (d.betrieb.length < 2) return res.status(400).json({ ok: false, hinweis: 'Bitte den Namen Ihres Betriebs eintragen.' });
  if (d.gast_vorname.length < 2 || d.gast_nachname.length < 2) return res.status(400).json({ ok: false, hinweis: 'Bitte Vor- und Nachnamen eintragen.' });
  if (d.gast_telefon.replace(/\D/g, '').length < 7) return res.status(400).json({ ok: false, hinweis: 'Bitte eine gültige Telefonnummer eintragen.' });
  if (!(p.vertraulich === true || p.vertraulich === 'true')) return res.status(400).json({ ok: false, hinweis: 'Bitte bestätigen Sie, dass Sie die Demo vertraulich behandeln.' });
  if (!(p.einverstanden === true || p.einverstanden === 'true')) return res.status(400).json({ ok: false, hinweis: EINV_FEHLT });

  if (await gebremst('qr:' + ipVon(req), 6, 10)) return res.status(429).json({ ok: false, hinweis: 'Zu viele Versuche. Bitte in ein paar Minuten noch einmal.' });

  const { data: lfd, error: ze } = await db.rpc('demo_qr_zaehlen', { p_nr: nr });
  if (ze) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
  if (lfd == null) return res.status(200).json({ ok: false, error: 'voll' });
  const jetzt = new Date().toISOString(), nummer = qrNummer(nr, lfd), info = geraetVon(req);
  const z = {
    code: neuerCode(), ...d, telefon: d.gast_telefon, laeuft_ab: new Date(t + 7 * TAG).toISOString(),
    notiz: 'QR ' + nummer + (q.notiz ? ' · ' + q.notiz : ''), qr_nr: nr, qr_lfd: lfd, qr_geraet: g || null,
    gast_am: jetzt, vertraulich_am: jetzt, erstmals_am: jetzt, zuletzt_am: jetzt, aktiv_push_am: jetzt,
    geraete: g ? [{ id: g, ...info, erst: jetzt, zuletzt: jetzt, n: 0 }] : []
  };
  const { error } = await db.from('demo_zugaenge').insert(z);
  if (error) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
  await db.from('demo_ereignisse').insert([
    { code: z.code, art: 'schritt', was: 'Über QR-Code ' + nummer + ' gestartet' },
    { code: z.code, art: 'schritt', was: EINV },
    { code: z.code, art: 'schritt', was: 'Angemeldet: ' + d.gast_vorname + ' ' + d.gast_nachname }
  ]);
  const wer = d.gast_vorname + ' ' + d.gast_nachname;
  await betreiberPush('Neue Demo ' + nummer, wer + ' · ' + d.betrieb + ' · ' + info.typ + (info.ort ? ', ' + info.ort : ''), 'clickzauber-vertrieb.html#demo-' + z.code);
  await mail('Neue Demo ' + nummer + ' · ' + wer + ' · ' + d.betrieb, [
    'Über den QR-Code ' + nr + (q.notiz ? ' (' + q.notiz + ')' : '') + ' hat jemand eine Demo gestartet. Es ist die ' + lfd + '. aus diesem Code.', '',
    'Name: ' + wer, 'Betrieb: ' + d.betrieb, 'Telefon: ' + d.gast_telefon, 'Branche: ' + d.branche,
    'Gerät: ' + info.typ + ', ' + (info.sys ? info.sys + ', ' : '') + info.br + (info.ort ? ', ' + info.ort : ''),
    'Gültig bis: ' + new Date(z.laeuft_ab).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), '',
    'Was er anklickt, sehen Sie auf der Vertrieb-Seite im Reiter „7-Tage-Demos“.'
  ]);
  return res.status(200).json({ ok: true, code: z.code, branche: z.branche, nummer });
}

/* Link für Gruppen (sql/62): startet sofort, ohne Angaben. Kontakt hinterlässt der Besucher später selbst („anmelden“). */
async function linkStart(req, res, p, q, nr, g) {
  if (await gebremst('qr:' + ipVon(req), 6, 10)) return res.status(429).json({ ok: false, hinweis: 'Zu viele Versuche. Bitte in ein paar Minuten noch einmal.' });
  const { data: lfd, error: ze } = await db.rpc('demo_qr_zaehlen', { p_nr: nr });
  if (ze) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
  if (lfd == null) return res.status(200).json({ ok: false, error: 'voll' });
  const jetzt = new Date().toISOString(), nummer = qrNummer(nr, lfd), info = geraetVon(req);
  const branche = BRANCHEN.includes(p.branche) ? p.branche : BRANCHEN.includes(q.branche) ? q.branche : 'friseur';
  const z = {
    code: neuerCode(), betrieb: 'Besucher ' + nummer, branche, quelle: 'link', laeuft_ab: new Date(t + 7 * TAG).toISOString(),
    notiz: 'Link ' + nummer + (q.notiz ? ' · ' + q.notiz : ''), qr_nr: nr, qr_lfd: lfd, qr_geraet: g || null,
    erstmals_am: jetzt, zuletzt_am: jetzt, aktiv_push_am: jetzt,
    geraete: g ? [{ id: g, ...info, erst: jetzt, zuletzt: jetzt, n: 0 }] : []
  };
  const { error } = await db.from('demo_zugaenge').insert(z);
  if (error) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
  await db.from('demo_ereignisse').insert({ code: z.code, art: 'schritt', was: 'Über Link ' + nummer + ' gestartet' + (q.notiz ? ' (' + kurz(q.notiz, 60) + ')' : '') });
  return res.status(200).json({ ok: true, code: z.code, branche: z.branche, nummer });
}

async function betreiber(req, res, p) {
  const a = p.aktion || 'liste';
  if (req.method === 'GET' && a === 'qr-liste') {
    const { data, error } = await db.from('demo_qr').select('*').order('nr', { ascending: false }).limit(200);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, qr: data || [] });
  }
  if (req.method === 'POST' && (a === 'qr-neu' || a === 'qr-aendern')) {
    const max = p.max === '' || p.max == null ? null : Math.max(1, Math.min(100000, parseInt(p.max, 10) || 0)) || null;
    const d = { notiz: kurz(p.notiz, 120) || null, branche: BRANCHEN.includes(p.branche) || p.branche === 'wahl' ? p.branche : 'friseur', max_scans: max };
    if (a === 'qr-neu' && p.art === 'link') d.art = 'link';   // Link für Facebook-Gruppen (sql/62)
    const q = a === 'qr-neu' ? db.from('demo_qr').insert(d) : db.from('demo_qr').update(d).eq('nr', parseInt(p.nr, 10));
    const { data, error } = await q.select().maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, qr: data });
  }
  if (req.method === 'GET' && a === 'liste') {
    const { data, error } = await db.from('demo_zugaenge').select('*').order('erstellt_am', { ascending: false }).limit(300);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, zugaenge: data || [] });
  }
  if (req.method === 'GET' && a === 'auswertung') {
    try { return res.status(200).json({ ok: true, ...(await auswertung()) }); }
    catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }
  }
  if (req.method === 'GET' && a === 'kennzahlen') {
    try { return res.status(200).json({ ok: true, ...(await kennzahlen(parseInt(p.tage, 10) || 90)) }); }
    catch (e) { return res.status(500).json({ ok: false, error: String(e.message || e) }); }
  }
  if (req.method === 'GET' && a === 'verlauf') {
    const { data, error } = await db.from('demo_ereignisse').select('ts, sitzung, art, was, seite').eq('code', String(p.z || '')).order('ts', { ascending: true }).limit(5000);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, ereignisse: data || [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  if (a === 'neu') {
    const betrieb = kurz(p.betrieb, 80);
    if (betrieb.length < 2) return res.status(400).json({ ok: false, error: 'Bitte den Namen des Betriebs eintragen.' });
    const tage = Math.min(60, Math.max(1, parseInt(p.tage, 10) || 7));
    const z = { code: neuerCode(), betrieb, branche: kurz(p.branche, 20) || 'friseur', telefon: kurz(p.telefon, 40) || null, notiz: kurz(p.notiz, 500) || null, laeuft_ab: new Date(Date.now() + tage * TAG).toISOString() };
    const { error } = await db.from('demo_zugaenge').insert(z);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, zugang: z });
  }
  const r = await holen(p.z);
  if (!r) return res.status(404).json({ ok: false, error: 'Zugang nicht gefunden.' });
  let neu = null;
  if (a === 'sperren') neu = { gesperrt_am: new Date().toISOString() };
  else if (a === 'entsperren') neu = { gesperrt_am: null };
  else if (a === 'verlaengern') neu = { laeuft_ab: new Date(Math.max(Date.now(), new Date(r.laeuft_ab).getTime()) + 7 * TAG).toISOString(), gesperrt_am: null, vorablauf_mail_am: null };
  else if (a === 'verschickt') {   // Versand festhalten (sql/62): WhatsApp geöffnet oder Link kopiert
    const weg = ['whatsapp', 'kopiert', 'teilen'].includes(p.weg) ? p.weg : 'kopiert';
    neu = { verschickt: (Array.isArray(r.verschickt) ? r.verschickt : []).concat([{ weg, am: new Date().toISOString() }]).slice(-20) };
  } else if (a === 'hinweis') {
    const text = kurz(p.text, 600);
    if (!text) return res.status(400).json({ ok: false, error: 'Bitte einen Hinweis eintragen.' });
    neu = { hinweise: (r.hinweise || []).concat([{ id: Date.now().toString(36), text, ts: new Date().toISOString() }]).slice(-30) };
  } else if (a === 'loeschen') {
    const { error } = await db.from('demo_zugaenge').delete().eq('code', r.code);
    return res.status(error ? 500 : 200).json({ ok: !error, error: error ? error.message : undefined });
  } else if (a === 'pilot') {
    const email = kurz(p.email, 120).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return res.status(400).json({ ok: false, error: 'Bitte die E-Mail-Adresse seines Kontos eintragen.' });
    const { data: u } = await db.from('users').select('id, pilot_seit').ilike('email', email).maybeSingle();
    if (!u) return res.status(404).json({ ok: false, error: 'Zu dieser E-Mail-Adresse gibt es noch kein Konto. Er muss sich zuerst anmelden.' });
    const jetzt = new Date().toISOString();
    const { error } = await db.from('users').update({ pilot_seit: u.pilot_seit || jetzt, pilot_extra: true }).eq('id', u.id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    neu = { pilot_email: email, pilot_am: jetzt };
  } else return res.status(400).json({ ok: false, error: 'aktion' });
  const { error } = await db.from('demo_zugaenge').update(neu).eq('code', r.code);
  return res.status(error ? 500 : 200).json({ ok: !error, error: error ? error.message : undefined });
}

// Nachtlauf: Mail einen Tag vor Ablauf, Zugänge 30 Tage nach Ablauf löschen.
export async function demoZugaengePflege() {
  const jetzt = Date.now();
  const { data } = await db.from('demo_zugaenge').select('*').is('gesperrt_am', null).is('vorablauf_mail_am', null)
    .gt('laeuft_ab', new Date(jetzt).toISOString()).lt('laeuft_ab', new Date(jetzt + 1.5 * TAG).toISOString()).limit(100);
  let n = 0;
  for (const r of (data || []).filter((x) => !(x.quelle === 'link' && !x.gast_am))) {
    await mail('Demo läuft morgen ab · ' + r.betrieb, [
      'Der Demo-Zugang von ' + r.betrieb + ' läuft am ' + new Date(r.laeuft_ab).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + ' ab.', '',
      r.erstmals_am ? 'Geöffnet: ' + (r.aufrufe || 0) + '-mal, ' + (r.klicks || 0) + ' Klicks.' : 'Er hat den Zugang noch nicht geöffnet.',
      r.telefon ? 'Telefon: ' + r.telefon : '', '',
      'Verlängern oder sperren: Vertrieb-Seite, Reiter „7-Tage-Demos“.'
    ]);
    await db.from('demo_zugaenge').update({ vorablauf_mail_am: new Date().toISOString() }).eq('code', r.code);
    n++;
  }
  /* 30 Tage nach Ablauf (seit 07.10.2026, vorher 12 Monate): Zugang löschen. Die Klicks (demo_ereignisse) gehen über „on delete cascade“ mit. */
  await db.from('demo_zugaenge').delete().lt('laeuft_ab', new Date(jetzt - 30 * TAG).toISOString());
  /* Tag 3: noch nicht geöffnet → Betreiber soll anrufen */
  const { data: t3 } = await db.from('demo_zugaenge').select('*').is('gesperrt_am', null).is('erstmals_am', null).is('tag3_am', null)
    .lt('erstellt_am', new Date(jetzt - 3 * TAG).toISOString()).gt('laeuft_ab', new Date(jetzt).toISOString()).limit(100);
  let a = 0;
  for (const r of (t3 || []).filter((x) => x.quelle !== 'link')) {
    await mail('Anrufen: ' + r.betrieb + ' hat die Demo noch nicht geöffnet', ['Der Demo-Zugang von ' + r.betrieb + ' ist seit drei Tagen ungeöffnet.', r.telefon ? 'Telefon: ' + r.telefon : 'Keine Telefonnummer hinterlegt.', 'Läuft ab: ' + new Date(r.laeuft_ab).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })]);
    await betreiberPush('Anrufen: ' + r.betrieb, 'Demo seit 3 Tagen nicht geöffnet' + (r.telefon ? ' · ' + r.telefon : ''), 'clickzauber-vertrieb.html#demo-' + r.code);
    await db.from('demo_zugaenge').update({ tag3_am: new Date().toISOString() }).eq('code', r.code);
    a++;
  }
  return { erinnert: n, anrufen: a };
}

/* Gesamtauswertung über alle Zugänge: Wie viele kommen bei welchem Schritt an, welche Bereiche werden genutzt, wo hören sie auf. */
const SCHRITTE = [
  ['Eingetragen', (x) => /^Angemeldet:/.test(x.was || '')],
  ['Formular gebaut', (x) => /Formular gespeichert/.test(x.was || '')],
  ['Formular geteilt', (x) => /Teilen geöffnet/.test(x.was || '')],
  ['Anfrage abgeschickt', (x) => /Anfrage im eigenen Formular/.test(x.was || '')],
  ['Push angetippt', (x) => /Push-Nachricht angetippt/.test(x.was || '')],
  ['WhatsApp geöffnet', (x) => /WhatsApp geöffnet/.test(x.was || '')]
];
function bereich(x) { const m = String(x.seite || '').match(/·\s*([\w-]+)/); return m ? m[1] : (/Konfigurator/.test(x.seite || '') ? 'konfigurator' : ''); }
async function auswertung() {
  const { data: Z } = await db.from('demo_zugaenge').select('code, erstmals_am, feedback, pilot_am, gesperrt_am, laeuft_ab').limit(1000);
  const { data: E } = await db.from('demo_ereignisse').select('code, ts, art, was, seite').gt('ts', new Date(Date.now() - 180 * TAG).toISOString()).order('ts', { ascending: true }).limit(50000);
  const pro = {}; (E || []).forEach((x) => { (pro[x.code] = pro[x.code] || []).push(x); });
  const codes = Object.keys(pro), schritte = SCHRITTE.map(([n]) => ({ n, z: 0 })), bereiche = {}, ende = {};
  codes.forEach((c) => {
    const e = pro[c], gesehen = {};
    SCHRITTE.forEach(([, f], i) => { if (e.some(f)) schritte[i].z++; });
    for (let i = 0; i < e.length; i++) {
      const b = bereich(e[i]); if (!b) continue;
      const nx = e[i + 1], dt = nx ? Math.min(120e3, new Date(nx.ts) - new Date(e[i].ts)) : 15e3;
      const o = bereiche[b] = bereiche[b] || { b, zugaenge: 0, sek: 0 };
      o.sek += Math.max(0, dt) / 1000; if (!gesehen[b]) { gesehen[b] = 1; o.zugaenge++; }
    }
    const letzt = e.filter((x) => x.art !== 'seite').pop() || e[e.length - 1];
    const k = (bereich(letzt) || '–') + ' · ' + String(letzt.was || '').slice(0, 50);
    ende[k] = (ende[k] || 0) + 1;
  });
  return {
    zugaenge: (Z || []).length, geoeffnet: (Z || []).filter((z) => z.erstmals_am).length,
    feedback: (Z || []).filter((z) => z.feedback).length, piloten: (Z || []).filter((z) => z.pilot_am).length,
    mit_klicks: codes.length, schritte,
    bereiche: Object.values(bereiche).map((o) => ({ ...o, sek: Math.round(o.sek) })).sort((a, b) => b.zugaenge - a.zugaenge),
    ende: Object.entries(ende).map(([was, n]) => ({ was, n })).sort((a, b) => b.n - a.n).slice(0, 10)
  };
}

/* Kennzahlen (Reiter „Kennzahlen“ auf der Vertrieb-Seite, js/cz-vertrieb-kennzahlen.js):
   Demos im Zeitraum, wie weit sie kommen, woher sie kommen, wen man jetzt anrufen sollte. */
const STUFEN = ['Geöffnet', 'Länger als 2 Minuten', 'Formular gebaut', 'Anfrage ausprobiert', 'Will es nutzen', 'Pilot'];
function aktivSek(e) {
  let s = 0;
  for (let i = 0; i < e.length; i++) {
    const nx = e[i + 1];
    s += nx && nx.sitzung === e[i].sitzung ? Math.max(0, Math.min(120e3, new Date(nx.ts) - new Date(e[i].ts))) : 15e3;
  }
  return Math.round(s / 1000);
}
/* Alle Ereignisse zu den Codes, in Paketen und seitenweise (die Datenbank gibt höchstens 1000 Zeilen auf einmal) */
async function ereignisseVon(codes) {
  const pro = {};
  for (let i = 0; i < codes.length; i += 100) {
    const teil = codes.slice(i, i + 100);
    for (let von = 0; von < 200000; von += 1000) {
      const { data, error } = await db.from('demo_ereignisse').select('code, ts, sitzung, art, was, seite').in('code', teil).order('ts', { ascending: true }).range(von, von + 999);
      if (error || !data) break;
      data.forEach((x) => { (pro[x.code] = pro[x.code] || []).push(x); });
      if (data.length < 1000) break;
    }
  }
  return pro;
}
async function kennzahlen(tage) {
  tage = Math.min(3650, Math.max(1, tage || 90));
  const ab = new Date(Date.now() - tage * TAG).toISOString(), jetzt = Date.now();
  const { data: Z, error } = await db.from('demo_zugaenge').select('*').gte('erstellt_am', ab).order('erstellt_am', { ascending: false }).limit(1000);
  if (error) throw error;
  const { data: Q } = await db.from('demo_qr').select('*').limit(1000);
  const qm = {}; (Q || []).forEach((q) => { qm[q.nr] = q; });
  const pro = await ereignisseVon((Z || []).map((z) => z.code));
  const hat = (e, re) => e.some((x) => re.test(x.was || ''));
  const R = (Z || []).map((z) => {
    const e = pro[z.code] || [], ek = e.filter((x) => x.sitzung), q = z.qr_nr ? qm[z.qr_nr] : null;
    const quelle = z.quelle === 'link' || (q && q.art === 'link') ? 'link' : z.qr_nr ? 'qr' : 'persoenlich';
    const sek = ek.length ? aktivSek(ek) : 0;
    const st = [!!z.erstmals_am, sek >= 120, hat(e, /Formular gespeichert/), hat(e, /Anfrage im eigenen Formular|Push-Nachricht angetippt|WhatsApp geöffnet/), hat(e, /Will clickzauber nutzen/), !!z.pilot_am];
    let stufe = -1; st.forEach((v, i) => { if (v) stufe = i; });
    return { z, e, q, quelle, sek, besuche: new Set(ek.map((x) => x.sitzung)).size, st, stufe, kontakt: quelle === 'link' && !!z.gast_am, konto: hat(e, /Konto anlegen angetippt/) };
  });
  const qName = (x) => x.quelle === 'persoenlich' ? 'Persönliche Links' : (x.quelle === 'link' ? 'Link ' : 'QR-Code ') + x.z.qr_nr + (x.q && x.q.notiz ? ' · ' + x.q.notiz : '');
  const leer = (key, art, nr, name, aufrufe) => ({ key, art, nr, name, aufrufe: aufrufe || 0, demos: 0, geoeffnet: 0, zwei: 0, anfrage: 0, kontakt: 0, interesse: 0, pilot: 0, sek: 0 });
  const quellen = {};
  (Q || []).forEach((q) => { const art = q.art === 'link' ? 'link' : 'qr', key = art + ':' + q.nr; quellen[key] = leer(key, art, q.nr, (art === 'link' ? 'Link ' : 'QR-Code ') + q.nr + (q.notiz ? ' · ' + q.notiz : ''), q.aufrufe); });
  R.forEach((x) => {
    const key = x.quelle === 'persoenlich' ? 'p' : x.quelle + ':' + x.z.qr_nr;
    const o = quellen[key] = quellen[key] || leer(key, x.quelle, x.z.qr_nr || null, qName(x), 0);
    o.demos++; if (x.st[0]) o.geoeffnet++; if (x.st[1]) o.zwei++; if (x.st[3]) o.anfrage++; if (x.kontakt) o.kontakt++; if (x.st[4]) o.interesse++; if (x.st[5]) o.pilot++; o.sek += x.sek;
    if (x.quelle === 'persoenlich') o.aufrufe += x.z.aufrufe || 0;
  });
  const branchen = {};
  R.forEach((x) => { const b = x.z.branche || 'friseur', o = branchen[b] = branchen[b] || { b, demos: 0, zwei: 0, interesse: 0, pilot: 0 }; o.demos++; if (x.st[1]) o.zwei++; if (x.st[4]) o.interesse++; if (x.st[5]) o.pilot++; });
  // Jetzt nachfassen: in den letzten 14 Tagen aktiv, noch kein Pilot, kein „Nichts für mich“, nicht gesperrt, erreichbar
  const heiss = R.filter((x) => x.st[0] && !x.z.pilot_am && !x.z.feedback && !x.z.gesperrt_am && x.z.zuletzt_am && jetzt - new Date(x.z.zuletzt_am) < 14 * TAG)
    .map((x) => {
      const her = (jetzt - new Date(x.z.zuletzt_am)) / TAG, fragen = (x.z.fragen || []).length;
      const punkte = x.stufe * 12 + Math.min(30, x.sek / 60) + x.besuche * 4 + (fragen ? 15 : 0) + (x.kontakt ? 12 : 0) + (x.st[4] ? 40 : 0) + (x.konto ? 20 : 0) - her * 2;
      return { code: x.z.code, punkte: Math.round(punkte), wer: x.z.gast_am ? x.z.gast_vorname + ' ' + x.z.gast_nachname : '', betrieb: x.z.betrieb, telefon: x.z.gast_telefon || x.z.telefon || '',
        quelle: qName(x), sek: x.sek, besuche: x.besuche, stufe: x.stufe >= 0 ? STUFEN[x.stufe] : '', zuletzt: x.z.zuletzt_am, fragen, interesse: x.st[4], konto: x.konto };
    }).filter((x) => x.punkte > 0 && (x.telefon || x.wer)).sort((a, b) => b.punkte - a.punkte).slice(0, 12);
  const ber = {}, ende = {};
  R.forEach((x) => {
    const e = x.e.filter((y) => y.sitzung); if (!e.length) return;
    const gesehen = {};
    for (let i = 0; i < e.length; i++) {
      const b = bereich(e[i]); if (!b) continue;
      const nx = e[i + 1], dt = nx && nx.sitzung === e[i].sitzung ? Math.min(120e3, new Date(nx.ts) - new Date(e[i].ts)) : 15e3;
      const o = ber[b] = ber[b] || { b, demos: 0, sek: 0 };
      o.sek += Math.max(0, dt) / 1000; if (!gesehen[b]) { gesehen[b] = 1; o.demos++; }
    }
    const l = e.filter((y) => y.art !== 'seite').pop();
    if (l) { const k = (bereich(l) || '–') + ' · ' + String(l.was || '').slice(0, 50); ende[k] = (ende[k] || 0) + 1; }
  });
  const auf = R.filter((x) => x.st[0]), pers = R.filter((x) => x.quelle === 'persoenlich'), persAuf = pers.filter((x) => x.z.erstmals_am);
  const std = persAuf.map((x) => (new Date(x.z.erstmals_am) - new Date(x.z.erstellt_am)) / 36e5).filter((h) => h >= 0).sort((a, b) => a - b);
  return {
    tage, demos: R.length, geoeffnet: auf.length,
    persoenlich: { n: pers.length, geoeffnet: persAuf.length, median_std: std.length ? Math.round(std[Math.floor(std.length / 2)] * 10) / 10 : null },
    sek_schnitt: auf.length ? Math.round(auf.reduce((a, x) => a + x.sek, 0) / auf.length) : 0,
    links: R.filter((x) => x.quelle === 'link').length, kontakt: R.filter((x) => x.kontakt).length,
    interesse: R.filter((x) => x.st[4]).length, piloten: R.filter((x) => x.st[5]).length, konto: R.filter((x) => x.konto).length,
    trichter: STUFEN.map((t, i) => ({ s: t, n: R.filter((x) => x.st[i]).length })),
    quellen: Object.values(quellen).map((o) => ({ ...o, sek: o.demos ? Math.round(o.sek / o.demos) : 0 }))
      .sort((a, b) => (a.art === 'persoenlich' ? -1 : b.art === 'persoenlich' ? 1 : (b.demos - a.demos) || (b.aufrufe - a.aufrufe))),
    branchen: Object.values(branchen).sort((a, b) => b.demos - a.demos),
    heiss,
    bereiche: Object.values(ber).map((o) => ({ b: o.b, demos: o.demos, sek: Math.round(o.sek / Math.max(1, o.demos)) })).sort((a, b) => b.demos - a.demos).slice(0, 10),
    ende: Object.entries(ende).map(([was, n]) => ({ was, n })).sort((a, b) => b.n - a.n).slice(0, 8)
  };
}
