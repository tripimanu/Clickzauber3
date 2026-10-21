// GET  /api/einstellungen?token=…            → Einstellungen des angemeldeten Betriebs
// POST /api/einstellungen { token, ...felder } → speichern
import { db, cors, body, userByToken, rolleVon, darf } from './_lib.js';
import { aktualisieren } from './_vertrauen.js';

const AV_FASSUNG = '2026-08';

/* Startklar vor dem Live schalten (seit 15.10.2026 auch am Server, vorher nur im Cockpit, js/cz-live.js PFLICHT).
   Gleiche Regeln wie czBest im Cockpit: Benachrichtigung, Datenschutzerklärung, AV-Vertrag (aktuelle Fassung), Löschfrist,
   jeweils gelesen und bestätigt. Gibt die offenen Schlüssel zurück ('mail', 'datenschutz', 'av', 'loeschfrist'), leer = startklar.
   Fehlt die Spalte bestaetigt (sql/60 nicht eingespielt), zählt wie im Cockpit der Wert allein. */
export async function pflichtOffen(tenantId, user) {
  if (!tenantId) return ['mail', 'datenschutz', 'av', 'loeschfrist'];
  const { data, error } = await db.from('einstellungen').select('*').eq('tenant_id', tenantId).maybeSingle();
  if (error) throw error;
  const e = data || {};
  const b = !data ? {} : ('bestaetigt' in data ? (data.bestaetigt || {}) : null);
  const ok = (k) => b == null || !!b[k];
  const loeschfrist = e.loeschfrist_monate ?? 24;
  const offen = [];
  if (!((e.mail_haupt || (user && user.email)) && ok('mail'))) offen.push('mail');
  if (!(e.datenschutz_url && ok('datenschutz'))) offen.push('datenschutz');
  if (!(e.av_vertrag_am && e.av_vertrag_fassung === AV_FASSUNG)) offen.push('av');
  if (!(loeschfrist && ok('loeschfrist'))) offen.push('loeschfrist');
  return offen;
}

// Was gespeichert werden darf, und wie es geprüft wird.
const FELDER = {
  mail_haupt: (v) => mail(v),
  mail_zweit: (v) => mail(v),
  mail_gast: (v) => !!v,
  mail_betrieb: (v) => !!v,   // E-Mails an / aus (sql/69): aus = keine Mail an den Betrieb bei neuen Anfragen
  nachfassen: (v) => !!v,
  erinnerung: (v) => !!v,   // Kunden am Vortag automatisch erinnern (sql/59, lib/_termin-pflege.js)
  datenschutz_url: (v) => url(v),
  loeschfrist_monate: (v) => {
    const n = parseInt(v, 10);
    return [0, 6, 12, 24, 36].includes(n) ? n : 24;
  },
  pausiert: (v) => !!v,
  pausiert_text: (v) => (v ? String(v).slice(0, 300) : null),
  mail_rhythmus: (v) => (String(v) === 'taeglich' ? 'taeglich' : 'sofort'),
  ansprechpartner: (v) => (v ? String(v).slice(0, 120) : null),
  telefon: (v) => (v ? String(v).slice(0, 40) : null),
  antwort_an: (v) => mail(v),
  antwortzeit_stunden: (v) => {
    const n = parseInt(v, 10);
    return [0, 24, 48, 72].includes(n) ? n : 0;
  },
  monatsbericht: (v) => !!v,
  monatsbericht_an: (v) => mail(v),
  bewertung_aktiv: (v) => !!v,
  bewertung_url: (v) => url(v),
  bewertung_tage: (v) => {
    const n = parseInt(v, 10);
    return [3, 7, 14, 30].includes(n) ? n : 7;
  },
  bewertung_text: (v) => (v ? String(v).slice(0, 1200) : null),
  gast_text: (v) => (v && String(v).trim() ? String(v).trim().slice(0, 1500) : null),
  anzahlung_link: (v) => url(v)
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = req.method === 'POST' ? body(req).token : req.query.token;
  const user = await userByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'kein Betrieb hinterlegt' });
  const rolle = await rolleVon(user);

  // Funktionen je Betrieb (sql/65, js/cz-funktionen.js): kurze Abfrage, das Cockpit fragt alle 20 Sekunden.
  if (req.method === 'GET' && req.query.nur === 'funktionen') {
    const { data: f, error: fe } = await db.from('einstellungen').select('funktionen, funktionen_am, neu_laden_am').eq('tenant_id', user.tenant_id).maybeSingle();
    res.setHeader('Cache-Control', 'no-store');
    if (fe) return res.status(200).json({ ok: false, error: 'sql/65 fehlt' });
    return res.status(200).json({ ok: true, funktionen: (f && f.funktionen) || {}, stand: (f && f.funktionen_am) || null, neu_laden_am: (f && f.neu_laden_am) || null, darf_aendern: darf(rolle, 'einstellungen') });
  }

  if (req.method === 'GET') {
    const { data } = await db.from('einstellungen').select('*').eq('tenant_id', user.tenant_id).maybeSingle();
    const e = data || {};
    // Anzahl gespeicherter Anfragen — für die Löschfrist-Anzeige.
    const { data: ws } = await db.from('widgets').select('slug').eq('tenant_id', user.tenant_id);
    const slugs = (ws || []).map((w) => w.slug);
    const [{ count: c1 }, c2] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', user.tenant_id),
      slugs.length
        ? db.from('leads').select('id', { count: 'exact', head: true }).is('tenant_id', null).in('widget_id', slugs)
        : Promise.resolve({ count: 0 })
    ]);
    const count = (c1 || 0) + (c2.count || 0);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      av_fassung: AV_FASSUNG,
      av_aktuell: e.av_vertrag_fassung === AV_FASSUNG,
      anfragen_gespeichert: count || 0,
      rolle,
      darf_aendern: darf(rolle, 'einstellungen'),
      darf_exportieren: darf(rolle, 'export'),
      einstellungen: {
        mail_haupt: e.mail_haupt || user.email,
        mail_zweit: e.mail_zweit || '',
        mail_gast: e.mail_gast !== false,
        nachfassen: e.nachfassen !== false,
        erinnerung: e.erinnerung !== false,
        datenschutz_url: e.datenschutz_url || '',
        loeschfrist_monate: e.loeschfrist_monate ?? 24,
        av_vertrag_am: e.av_vertrag_am || null,
        av_vertrag_von: e.av_vertrag_von || null,
        av_vertrag_fassung: e.av_vertrag_fassung || null,
        // Lesen und bestätigen (sql/60). null: Spalte fehlt noch, dann gilt der Wert allein (wie bisher).
        bestaetigt: !data ? {} : ('bestaetigt' in data ? (data.bestaetigt || {}) : null),
        pausiert: !!e.pausiert,
        pausiert_text: e.pausiert_text || '',
        mail_rhythmus: e.mail_rhythmus || 'sofort',
        mail_betrieb: e.mail_betrieb !== false,
        ansprechpartner: e.ansprechpartner || '',
        telefon: e.telefon || '',
        antwort_an: e.antwort_an || '',
        antwortzeit_stunden: e.antwortzeit_stunden ?? 0,
        gast_text: e.gast_text || '',
        anzahlung_link: e.anzahlung_link || '',
        monatsbericht: e.monatsbericht !== false,
        monatsbericht_an: e.monatsbericht_an || '',
        bewertung_aktiv: !!e.bewertung_aktiv,
        bewertung_url: e.bewertung_url || '',
        bewertung_tage: e.bewertung_tage ?? 7,
        bewertung_text: e.bewertung_text || '',
        funktionen: e.funktionen || {}
      }
    });
  }

  if (req.method === 'POST') {
    if (!darf(rolle, 'einstellungen')) return res.status(403).json({ ok: false, error: 'Nur der Inhaber kann Einstellungen ändern.' });
    const p = body(req);

    // AV-Vertrag abschließen — eigener Weg, weil es ein Nachweis ist und nicht überschrieben werden darf.
    if (p.av_vertrag) {
      const name = String(p.av_name || '').trim();
      if (name.length < 3) return res.status(400).json({ ok: false, error: 'Bitte Ihren vollen Namen angeben.' });
      if (p.gelesen !== true) return res.status(400).json({ ok: false, error: 'Bitte unten den Haken setzen: gelesen und einverstanden.' });
      await db.from('einstellungen').upsert({
        tenant_id: user.tenant_id,
        av_vertrag_am: new Date().toISOString(),
        av_vertrag_von: name,
        av_vertrag_fassung: AV_FASSUNG,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id' });
      await db.from('protokoll').insert({
        tenant_id: user.tenant_id, was: 'av_vertrag', wer: user.email,
        hinweis: 'Fassung ' + AV_FASSUNG + ', abgeschlossen von ' + name + ', Haken „gelesen und einverstanden“ gesetzt'
      });
      await aktualisieren(user.tenant_id, 0).catch(() => null);   // Mission und Punkte sofort
      return res.status(200).json({ ok: true, av_vertrag_am: new Date().toISOString(), av_vertrag_von: name, av_vertrag_fassung: AV_FASSUNG });
    }

    // Lesen und bestätigen (sql/60): Erst mit Haken zählen Benachrichtigung, Datenschutzerklärung und Löschfrist als Mission.
    if (p.bestaetigen) {
      const art = String(p.bestaetigen);
      if (!['mail', 'datenschutz', 'loeschfrist'].includes(art)) return res.status(400).json({ ok: false, error: 'Unbekannte Bestätigung.' });
      if (p.gelesen !== true) return res.status(400).json({ ok: false, error: 'Bitte unten den Haken setzen.' });
      const { data: alt } = await db.from('einstellungen').select('*').eq('tenant_id', user.tenant_id).maybeSingle();
      if (alt && !('bestaetigt' in alt)) return res.status(500).json({ ok: false, error: 'Bestätigen geht gerade nicht (sql/60 fehlt).' });
      const a = alt || {}, jetzt = new Date().toISOString();
      const satz = { tenant_id: user.tenant_id, updated_at: jetzt };
      let wert;
      if (art === 'mail') {
        const m = mail(p.mail_haupt != null ? p.mail_haupt : (a.mail_haupt || user.email));
        if (!m) return res.status(400).json({ ok: false, error: 'Die Adresse sieht nicht wie eine E-Mail aus.' });
        satz.mail_haupt = wert = m;
      } else if (art === 'datenschutz') {
        if (!a.datenschutz_url) return res.status(400).json({ ok: false, error: 'Bitte zuerst die Adresse Ihrer Datenschutzerklärung speichern.' });
        wert = a.datenschutz_url;
      } else {
        const n = parseInt(p.loeschfrist_monate != null ? p.loeschfrist_monate : (a.loeschfrist_monate ?? 24), 10);
        if (![6, 12, 24, 36].includes(n)) return res.status(400).json({ ok: false, error: 'Bitte eine Frist wählen.' });
        satz.loeschfrist_monate = wert = n;
      }
      const b = { ...(a.bestaetigt || {}) };
      b[art] = { am: jetzt, von: user.email, wert };
      satz.bestaetigt = b;
      const { error: be } = await db.from('einstellungen').upsert(satz, { onConflict: 'tenant_id' });
      if (be) return res.status(500).json({ ok: false, error: /bestaetigt/.test(be.message || '') ? 'Bestätigen geht gerade nicht (sql/60 fehlt).' : 'Speichern fehlgeschlagen.' });
      await db.from('protokoll').insert({ tenant_id: user.tenant_id, was: 'bestaetigt_' + art, wer: user.email, hinweis: 'Gelesen und bestätigt: ' + String(wert).slice(0, 200) }).then(() => {}, () => {});
      await aktualisieren(user.tenant_id, 0).catch(() => null);
      return res.status(200).json({ ok: true, bestaetigt: b, mail_haupt: satz.mail_haupt, loeschfrist_monate: satz.loeschfrist_monate });
    }

    // Funktionen je Betrieb (sql/65): nur die mitgeschickten Schalter ändern, der Rest bleibt.
    if (p.funktionen && typeof p.funktionen === 'object') {
      const neu = fxPruefen(p.funktionen);
      if (!neu) return res.status(400).json({ ok: false, error: 'Unbekannte Funktion.' });
      const { data: alt, error: ae } = await db.from('einstellungen').select('funktionen').eq('tenant_id', user.tenant_id).maybeSingle();
      if (ae) return res.status(500).json({ ok: false, error: 'Funktionen gehen gerade nicht (sql/65 fehlt).' });
      const f = { ...((alt && alt.funktionen) || {}), ...neu }, jetzt = new Date().toISOString();
      const { error: fe } = await db.from('einstellungen').upsert({ tenant_id: user.tenant_id, funktionen: f, funktionen_am: jetzt, updated_at: jetzt }, { onConflict: 'tenant_id' });
      if (fe) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
      await db.from('protokoll').insert({ tenant_id: user.tenant_id, was: 'funktionen', wer: user.email, hinweis: Object.keys(neu).map((k) => k + (neu[k] ? ' an' : ' aus')).join(', ') }).then(() => {}, () => {});
      return res.status(200).json({ ok: true, funktionen: f, stand: jetzt });
    }

    const satz = { tenant_id: user.tenant_id, updated_at: new Date().toISOString() };
    let fehler = null;
    Object.keys(FELDER).forEach((f) => {
      if (!(f in p)) return;
      const wert = (f === 'datenschutz_url' && String(p[f] || '').trim() === 'clickzauber')
        ? 'https://clickzauber.de/datenschutz-betrieb.html?b=' + encodeURIComponent(user.tenant_id)
        : FELDER[f](p[f]);
      if (wert === false && (f === 'mail_haupt' || f === 'datenschutz_url' || f === 'antwort_an')) { fehler = f; return; }
      satz[f] = wert;
    });
    if (fehler === 'antwort_an') return res.status(400).json({ ok: false, error: 'Die Antwort-Adresse sieht nicht wie eine E-Mail aus.' });
    if (fehler === 'mail_haupt') return res.status(400).json({ ok: false, error: 'Die Empfängeradresse sieht nicht wie eine E-Mail aus.' });
    if (fehler === 'datenschutz_url') return res.status(400).json({ ok: false, error: 'Die Adresse muss mit https:// beginnen.' });
    if (satz.bewertung_url === false) return res.status(400).json({ ok: false, error: 'Der Bewertungs-Link muss mit https:// beginnen.' });
    if (satz.monatsbericht_an === false) return res.status(400).json({ ok: false, error: 'Die Adresse für den Monatsbericht sieht nicht wie eine E-Mail aus.' });

    // Neue Adresse der Datenschutzerklärung: noch einmal lesen und bestätigen. Eine verdiente Mission bleibt.
    let neuB;
    if ('datenschutz_url' in satz) {
      const { data: alt } = await db.from('einstellungen').select('*').eq('tenant_id', user.tenant_id).maybeSingle();
      if (alt && 'bestaetigt' in alt && alt.bestaetigt && alt.bestaetigt.datenschutz && (alt.datenschutz_url || '') !== (satz.datenschutz_url || '')) {
        neuB = { ...alt.bestaetigt }; delete neuB.datenschutz; satz.bestaetigt = neuB;
      }
    }
    const { error } = await db.from('einstellungen').upsert(satz, { onConflict: 'tenant_id' });
    if (error) return res.status(500).json({ ok: false, error: 'speichern fehlgeschlagen' });
    return res.status(200).json({ ok: true, datenschutz_url: satz.datenschutz_url || undefined, bestaetigt: neuB });
  }

  return res.status(405).json({ ok: false });
}

function mail(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(s) ? s : false;
}
function url(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  return /^https:\/\/.+\..+/i.test(s) ? s : false;
}
// Schalter für Funktionen (sql/65): { netzwerk: false, … }. Welche es gibt, steht in js/cz-funktionen.js.
export function fxPruefen(o) {
  const r = {}, k = Object.keys(o || {});
  if (!k.length || k.length > 40) return null;
  for (const x of k) { if (!/^[a-z][a-z0-9_]{1,29}$/.test(x)) return null; r[x] = !!o[x]; }
  return r;
}
