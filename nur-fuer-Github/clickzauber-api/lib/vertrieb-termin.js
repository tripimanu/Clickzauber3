// /api/vertrieb-termin — Termin-Links für Interessenten (sql/64, Texte und Mails in lib/_vertrieb-termin-text.js).
// Öffentlich (termin.html, clickzauber.de/t/CODE):
//   GET  ?c=CODE[&poll=1]   → Vorschläge, Stand, Kontaktdaten zum Vorausfüllen. Erstes Öffnen: Push an den Betreiber
//   GET  ?c=CODE&ics=1      → Kalender-Eintrag des gewählten Termins
//   POST { c, aktion:'waehlen', i, weg:'mail'|'whatsapp', email, telefon } → Termin steht. Mail mit Kalender-Eintrag
//        (weg 'mail') oder WhatsApp von Manuel (weg 'whatsapp'). Push und Mail an den Betreiber, Kontaktbuch, auf Wunsch eigene 7-Tage-Demo
//   POST { c, aktion:'anderer', wunsch }  → keiner passt oder verschieben
//   POST { c, aktion:'absagen', text }
// Betreiber (Vertrieb-Seite, Reiter „Termine“, ADMIN_TOKEN):
//   GET  ?key=…&aktion=liste
//   POST { key, aktion:'neu', kontakt_id, betrieb, name, branche, email, telefon, art, ort, dauer, vorschlaege:[{datum,zeit}], nachricht, demo }
//   POST { key, aktion:'vorschlaege', c, vorschlaege, nachricht } → neue Vorschläge, Stand wieder „offen“
//   POST { key, aktion:'wa-bestaetigt'|'wa-erinnert'|'verschickt'|'absagen'|'loeschen', c, weg }
import { db, cors, MAIL_TO, gebremst } from './_lib.js';
import { neuerCode, betreiberPush, BRANCHEN, demoAusTermin } from './demo-zugang.js';
import { ARTEN, BRANCHE_TXT, wannText, startMs, demoLink, seitenLink, ics, bestaetigungMail, erinnerungMail, mailSenden } from './_vertrieb-termin-text.js';
import { berlinTag } from './_ical.js';

const TAG = 864e5;
const kurz = (v, n) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const MAILRE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
// Höchstens 12 Antworten je Code in 10 Minuten, gezählt in der Datenbank (gebremst, sql/71).
const RANG = { notiz: 0, angesprochen: 1, abgesagt: 1, termin: 2, demo: 3, angebot: 4, kunde: 5 };

function daten(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
function vorschlaegeLesen(l) {
  return (Array.isArray(l) ? l : []).map((v) => ({ datum: String((v && v.datum) || '').slice(0, 10), zeit: String((v && v.zeit) || '').slice(0, 5) }))
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.datum) && /^\d{2}:\d{2}$/.test(v.zeit))
    .sort((a, b) => (a.datum + a.zeit).localeCompare(b.datum + b.zeit)).slice(0, 5);
}
function zukunft(v) { return !!v && startMs(v) > Date.now(); }
async function holen(c) {
  if (!/^[a-z0-9]{6,20}$/.test(String(c || ''))) return null;
  const { data } = await db.from('vertrieb_termine').select('*').eq('code', String(c)).maybeSingle();
  return data || null;
}
async function speichern(code, neu) {
  const { error } = await db.from('vertrieb_termine').update({ ...neu, geaendert_am: new Date().toISOString() }).eq('code', code);
  return !error;
}
function wer(t) { return [t.name, t.betrieb].filter(Boolean).join(' · ') || 'Interessent'; }
function ziel(t) { return 'clickzauber-vertrieb.html#termin-' + t.code; }

/* Was die Seite termin.html braucht. Vorschläge in der Vergangenheit fallen weg, der Index bleibt. */
function oeffentlich(t) {
  const V = vorschlaegeLesen(t.vorschlaege).map((v, i) => ({ ...v, i, text: wannText(v) })).filter(zukunft);
  const fest = t.status === 'bestaetigt' && t.gewaehlt;
  return {
    ok: true, betrieb: t.betrieb || '', name: t.name || '', branche: t.branche, art: t.art, art_text: ARTEN[t.art] || 'Gespräch', dauer: t.dauer || 30,
    ort: t.art === 'video' && !fest ? '' : (t.ort || ''), nachricht: t.nachricht || '', vorschlaege: V, status: t.status,
    gewaehlt: fest ? { ...t.gewaehlt, text: wannText(t.gewaehlt), vorbei: !zukunft(t.gewaehlt) } : null,
    weg: t.weg || '', email: t.email || '', telefon: t.telefon || '', wunsch: t.wunsch || '', demo: !!t.demo, demo_link: fest ? demoLink(t) : ''
  };
}

/* Kontaktbuch der Vertrieb-Seite (sql/06): neu anlegen oder Stand und nächsten Schritt nachtragen.
   Eine höhere Stufe (Demo gezeigt, Angebot, Kunde) wird nie zurückgesetzt. */
async function kontakt(t, stufe, naechster) {
  try {
    const id = t.kontakt_id || 'vt-' + t.code, jetzt = new Date().toISOString();
    const { data: alt } = await db.from('kontakte').select('id, stufe, email, telefon').eq('id', id).maybeSingle();
    const satz = { id, naechster, updated_at: jetzt };
    if (!alt) Object.assign(satz, { firma: t.betrieb || null, name: t.name || null, email: t.email || null, telefon: t.telefon || null, stufe, angelegt: jetzt, notiz: 'Über Termin-Link · ' + (BRANCHE_TXT[t.branche] || t.branche || '') });
    else {
      if ((RANG[stufe] || 0) > (RANG[alt.stufe] || 0)) satz.stufe = stufe;
      if (t.email && !alt.email) satz.email = t.email;
      if (t.telefon && !alt.telefon) satz.telefon = t.telefon;
    }
    await db.from('kontakte').upsert(satz);
  } catch (e) { /* Kontaktbuch darf nichts aufhalten */ }
}
function betreiberMail(t, titel, zeilen, anhang) {
  return mailSenden(MAIL_TO, { betreff: titel + ' · ' + wer(t), text: zeilen.filter((x) => x !== null).join('\n') }, anhang);
}
function kontaktZeilen(t) {
  return ['Name: ' + (t.name || '–'), 'Betrieb: ' + (t.betrieb || '–'), 'Branche: ' + (BRANCHE_TXT[t.branche] || t.branche || '–'), 'Telefon: ' + (t.telefon || '–'), 'E-Mail: ' + (t.email || '–')];
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
  const t = await holen(p.c);
  if (!t) return res.status(200).json({ ok: false, error: 'ungueltig' });

  if (req.method === 'GET') {
    if (p.ics) {
      if (t.status !== 'bestaetigt' || !t.gewaehlt) return res.status(404).send('Kein bestätigter Termin.');
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="termin-clickzauber.ics"');
      return res.status(200).send(ics(t, false));
    }
    if (!p.poll) {
      const jetzt = new Date().toISOString(), neu = { aufrufe: (t.aufrufe || 0) + 1 };
      if (!t.geoeffnet_am) neu.geoeffnet_am = jetzt;
      const pushen = !t.push_am || Date.now() - new Date(t.push_am).getTime() > 12 * 36e5;
      if (pushen) neu.push_am = jetzt;
      await db.from('vertrieb_termine').update(neu).eq('code', t.code);
      if (pushen) await betreiberPush(t.geoeffnet_am ? 'Termin-Link wieder geöffnet' : 'Termin-Link geöffnet', wer(t), ziel(t));
    }
    return res.status(200).json(oeffentlich(t));
  }

  if (await gebremst('vtermin:' + t.code, 12, 10)) return res.status(429).json({ ok: false, hinweis: 'Zu viele Versuche. Bitte in ein paar Minuten noch einmal.' });
  if (t.status === 'abgesagt') return res.status(200).json({ ok: false, error: 'abgesagt', hinweis: 'Dieser Termin wurde abgesagt. Bitte melden Sie sich direkt bei mir.' });

  if (p.aktion === 'waehlen') {
    const V = vorschlaegeLesen(t.vorschlaege), v = V[parseInt(p.i, 10)];
    if (!zukunft(v)) return res.status(400).json({ ok: false, hinweis: 'Dieser Vorschlag ist leider schon vorbei. Bitte wählen Sie einen anderen oder wünschen Sie einen anderen Termin.' });
    const weg = p.weg === 'whatsapp' ? 'whatsapp' : 'mail';
    const email = kurz(p.email, 120).toLowerCase() || t.email || '', telefon = kurz(p.telefon, 40) || t.telefon || '';
    if (weg === 'mail' && !MAILRE.test(email)) return res.status(400).json({ ok: false, hinweis: 'Bitte eine gültige E-Mail-Adresse eintragen.' });
    if (weg === 'whatsapp' && telefon.replace(/\D/g, '').length < 7) return res.status(400).json({ ok: false, hinweis: 'Bitte eine Handynummer für WhatsApp eintragen.' });
    if (t.status === 'bestaetigt' && t.gewaehlt && t.gewaehlt.datum === v.datum && t.gewaehlt.zeit === v.zeit && t.weg === weg) return res.status(200).json(oeffentlich(t));
    const umgebucht = t.status === 'bestaetigt';
    const neu = { status: 'bestaetigt', gewaehlt: v, weg, email: MAILRE.test(email) ? email : (t.email || null), telefon: telefon || null, bestaetigt_am: new Date().toISOString(), erinnert_am: null, wa_bestaetigt_am: null, wunsch: null };
    if (t.demo && !t.demo_code) neu.demo_code = await demoAusTermin(t, telefon);
    if (!(await speichern(t.code, neu))) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
    const n = { ...t, ...neu };
    const mail = weg === 'mail' ? await mailSenden(n.email, bestaetigungMail(n), ics(n, false)) : false;
    await betreiberPush(weg === 'whatsapp' ? 'Termin steht · bitte per WhatsApp bestätigen' : (umgebucht ? 'Termin umgebucht' : 'Termin bestätigt'), wer(n) + ' · ' + wannText(v), ziel(n));
    await betreiberMail(n, (umgebucht ? 'Termin umgebucht: ' : 'Termin bestätigt: ') + wannText(v), [
      wer(n) + ' hat einen Termin gewählt.', '', 'Termin: ' + wannText(v) + ' · ' + (ARTEN[n.art] || 'Gespräch') + ', ' + (n.dauer || 30) + ' Minuten', ...kontaktZeilen(n), '',
      weg === 'whatsapp' ? 'Bestätigung gewünscht per WhatsApp. Bitte schicken: Vertrieb → Termine → „Per WhatsApp bestätigen“.' : (mail ? 'Die Bestätigung mit Kalender-Eintrag ist per E-Mail raus.' : 'Die Bestätigung per E-Mail ging NICHT raus. Bitte selbst bestätigen.'),
      demoLink(n) ? 'Seine Demo (7 Tage): ' + demoLink(n) : null, '', 'Der Kalender-Eintrag für Sie hängt an.'
    ], ics(n, true));
    await kontakt(n, 'termin', 'Gespräch ' + wannText(v) + ' (' + (ARTEN[n.art] || 'Gespräch') + ')');
    return res.status(200).json({ ...oeffentlich(n), mail });
  }

  if (p.aktion === 'anderer' || p.aktion === 'absagen') {
    const ab = p.aktion === 'absagen', text = kurz(ab ? p.text : p.wunsch, 500);
    if (!ab && text.length < 2) return res.status(400).json({ ok: false, hinweis: 'Bitte schreiben Sie kurz, wann es Ihnen passt.' });
    const neu = { status: ab ? 'abgesagt' : 'anderer', wunsch: text || null, gewaehlt: null, erinnert_am: null };
    const email = kurz(p.email, 120).toLowerCase(), telefon = kurz(p.telefon, 40);
    if (MAILRE.test(email)) neu.email = email;
    if (telefon.replace(/\D/g, '').length >= 7) neu.telefon = telefon;
    if (!(await speichern(t.code, neu))) return res.status(500).json({ ok: false, hinweis: 'Das hat nicht geklappt. Bitte noch einmal versuchen.' });
    const n = { ...t, ...neu };
    await betreiberPush(ab ? 'Gespräch abgesagt' : 'Anderer Termin gewünscht', wer(n) + (text ? ': ' + text.slice(0, 120) : ''), ziel(n));
    await betreiberMail(n, ab ? 'Gespräch abgesagt' : 'Anderer Termin gewünscht', [
      wer(n) + (ab ? ' hat das Gespräch abgesagt.' : ' wünscht einen anderen Termin.'), '', (ab ? 'Grund: ' : 'Wunsch: ') + (text || '–'),
      t.gewaehlt ? 'Bisher gewählt: ' + wannText(t.gewaehlt) : null, '', ...kontaktZeilen(n), '', 'Neue Vorschläge schicken: Vertrieb → Termine.'
    ]);
    await kontakt(n, 'angesprochen', ab ? 'Hat das Gespräch abgesagt' + (text ? ': ' + text.slice(0, 120) : '') : 'Wünscht anderen Termin: ' + text.slice(0, 160));
    return res.status(200).json(oeffentlich(n));
  }
  return res.status(400).json({ ok: false, error: 'aktion' });
}

async function betreiber(req, res, p) {
  const a = p.aktion || 'liste';
  if (req.method === 'GET') {
    if (a !== 'liste') return res.status(400).json({ ok: false, error: 'aktion' });
    const { data, error } = await db.from('vertrieb_termine').select('*').order('erstellt_am', { ascending: false }).limit(300);
    if (error) return res.status(500).json({ ok: false, error: error.message + (/vertrieb_termine/.test(error.message) ? ' (sql/64 in Supabase ausführen)' : '') });
    return res.status(200).json({ ok: true, termine: (data || []).map((t) => ({ ...t, link: seitenLink(t), demo_link: demoLink(t) })) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  if (a === 'neu') {
    const V = vorschlaegeLesen(p.vorschlaege);
    const d = {
      code: neuerCode(), betrieb: kurz(p.betrieb, 80) || null, name: kurz(p.name, 80) || null,
      branche: BRANCHEN.includes(p.branche) ? p.branche : 'friseur', email: kurz(p.email, 120).toLowerCase() || null, telefon: kurz(p.telefon, 40) || null,
      art: ARTEN[p.art] ? p.art : 'telefon', ort: kurz(p.ort, 300) || null, dauer: [15, 20, 30, 45, 60, 90].includes(+p.dauer) ? +p.dauer : 30,
      vorschlaege: V, nachricht: kurz(p.nachricht, 600) || null, demo: !(p.demo === false || p.demo === 'false')
    };
    d.kontakt_id = kurz(p.kontakt_id, 60) || 'vt-' + d.code;
    if (!d.betrieb && !d.name) return res.status(400).json({ ok: false, error: 'Bitte Betrieb oder Namen eintragen.' });
    if (!V.length) return res.status(400).json({ ok: false, error: 'Bitte mindestens einen Terminvorschlag eintragen.' });
    if (V.some((v) => !zukunft(v))) return res.status(400).json({ ok: false, error: 'Ein Vorschlag liegt in der Vergangenheit.' });
    if (d.email && !MAILRE.test(d.email)) return res.status(400).json({ ok: false, error: 'Die E-Mail-Adresse sieht nicht vollständig aus.' });
    const { error } = await db.from('vertrieb_termine').insert(d);
    if (error) return res.status(500).json({ ok: false, error: error.message + (/vertrieb_termine/.test(error.message) ? ' (sql/64 in Supabase ausführen)' : '') });
    await kontakt(d, 'angesprochen', 'Termin-Link verschickt, wartet auf Antwort');
    return res.status(200).json({ ok: true, termin: { ...d, link: seitenLink(d), status: 'offen', aufrufe: 0, verschickt: [] } });
  }
  const t = await holen(p.c);
  if (!t) return res.status(404).json({ ok: false, error: 'Termin-Link nicht gefunden.' });
  const jetzt = new Date().toISOString();
  let neu = null;
  if (a === 'vorschlaege') {
    const V = vorschlaegeLesen(p.vorschlaege);
    if (!V.length) return res.status(400).json({ ok: false, error: 'Bitte mindestens einen Terminvorschlag eintragen.' });
    if (V.some((v) => !zukunft(v))) return res.status(400).json({ ok: false, error: 'Ein Vorschlag liegt in der Vergangenheit.' });
    neu = { vorschlaege: V, status: 'offen', gewaehlt: null, erinnert_am: null, wa_bestaetigt_am: null };
    if (p.nachricht != null) neu.nachricht = kurz(p.nachricht, 600) || null;
    await kontakt(t, 'angesprochen', 'Neue Terminvorschläge verschickt');
  } else if (a === 'wa-bestaetigt') neu = { wa_bestaetigt_am: jetzt };
  else if (a === 'wa-erinnert') neu = { erinnert_am: jetzt };
  else if (a === 'verschickt') {
    const weg = ['whatsapp', 'mail', 'kopiert'].includes(p.weg) ? p.weg : 'kopiert';
    neu = { verschickt: (Array.isArray(t.verschickt) ? t.verschickt : []).concat([{ weg, am: jetzt }]).slice(-20) };
  } else if (a === 'absagen') {
    neu = { status: 'abgesagt', gewaehlt: null };
    await kontakt(t, 'angesprochen', 'Gespräch abgesagt');
  } else if (a === 'loeschen') {
    const { error } = await db.from('vertrieb_termine').delete().eq('code', t.code);
    return res.status(error ? 500 : 200).json({ ok: !error, error: error ? error.message : undefined });
  } else return res.status(400).json({ ok: false, error: 'aktion' });
  const ok = await speichern(t.code, neu);
  return res.status(ok ? 200 : 500).json({ ok, error: ok ? undefined : 'Speichern hat nicht geklappt.' });
}

/* Stündlich (api/nacht.js?nur=termine) ab 17 Uhr und im Nachtlauf: am Vortag erinnern.
   Der Interessent bekommt eine Mail, wenn er die Bestätigung per Mail wollte. Der Betreiber bekommt immer eine Push-Nachricht.
   Im Nachtlauf zusätzlich: Termin-Links nach 12 Monaten löschen. */
export async function vertriebTerminePflege({ stuendlich } = {}) {
  const jetzt = Date.now(), h = parseInt(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Berlin' }), 10);
  const morgen = berlinTag(jetzt + TAG);
  let erinnert = 0;
  if (!stuendlich || h >= 17) {
    const { data } = await db.from('vertrieb_termine').select('*').eq('status', 'bestaetigt').is('erinnert_am', null).limit(200);
    const faellig = (data || []).filter((t) => t.gewaehlt && t.gewaehlt.datum === morgen && (!t.bestaetigt_am || jetzt - new Date(t.bestaetigt_am).getTime() > 3 * 36e5));
    for (const t of faellig) {
      if (t.weg === 'mail' && t.email) await mailSenden(t.email, erinnerungMail(t));
      await betreiberPush('Morgen ' + t.gewaehlt.zeit + ' Uhr: ' + (t.betrieb || t.name || 'Gespräch'), (ARTEN[t.art] || 'Gespräch') + (t.weg === 'whatsapp' ? ' · Erinnerung per WhatsApp schicken' : t.email ? ' · Erinnerung per Mail ist raus' : ''), ziel(t));
      await db.from('vertrieb_termine').update({ erinnert_am: new Date().toISOString() }).eq('code', t.code);
      erinnert++;
    }
  }
  if (!stuendlich) await db.from('vertrieb_termine').delete().lt('erstellt_am', new Date(jetzt - 365 * TAG).toISOString());
  return { erinnert };
}
