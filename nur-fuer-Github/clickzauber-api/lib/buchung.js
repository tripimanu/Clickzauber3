// POST /api/buchung { token, widget, lead, raum, datum, zeit, bis, notiz, mehrfach }  → Termin fest einplanen
//      mehrfach: so viele Aufträge passen an einen Tag (Food Truck & Co., cfg.auftrag.proTag). Standard 1.
// POST /api/buchung { token, widget, aktion:'eigen', datum, titel, zeit, bis, raum, telefon, notiz }
//                                                                      → eigener Termin ohne Anfrage
// POST /api/buchung { token, widget, lead, datum, aktion:'storno' }    → als storniert markieren (Tag bleibt gesperrt)
// POST /api/buchung { token, widget, lead, datum, aktion:'freigeben' } → Eintrag entfernen, Tag wird wieder frei
// GET  /api/buchung?widget=…&token=…                                   → { raeume, buchungen }
// GET  /api/buchung?widget=*&token=…                                   → Termine aller Formulare des Betriebs
//
// GRUNDREGEL: Nur ein angemeldeter Betreiber kann hier etwas ändern.
// Das Widget besitzt keinen Token und kann deshalb niemals einen Tag
// blockieren. Ein Gast äußert ausschließlich einen Wunschtermin —
// gesperrt wird erst nach dem Gespräch, von Hand, hier im Cockpit.
import { db, cors, body, userByToken } from './_lib.js';
import { wartelisteMelden } from './_warteliste.js';
import { kalenderNachziehen } from './_kalender-direkt.js';

const istIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const istZeit = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const p = req.method === 'POST' ? body(req) : req.query;
  const user = await userByToken(p.token);
  if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

  const slug = String(p.widget || '');
  if (!slug) return res.status(400).json({ ok: false, error: 'widget fehlt' });

  // ── Gesamtansicht: alle Formulare des Betriebs in einem Kalender ──
  if (slug === '*') {
    if (req.method !== 'GET') return res.status(400).json({ ok: false, error: 'Bitte ein Formular angeben.' });
    if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'kein Betrieb hinterlegt' });
    const { data: ws } = await db.from('widgets')
      .select('slug, name, belegung').eq('tenant_id', user.tenant_id);
    const alleRaeume = [], zusammen = {};
    (ws || []).forEach((w) => {
      const b = (w.belegung && typeof w.belegung === 'object') ? w.belegung : {};
      ((Array.isArray(b.raeume) && b.raeume.length) ? b.raeume : ['Hauptraum'])
        .forEach((r) => { if (!alleRaeume.includes(r)) alleRaeume.push(r); });
      const buch = (b.buchungen && typeof b.buchungen === 'object') ? b.buchungen : {};
      Object.keys(buch).forEach((tag) => {
        (buch[tag] || []).forEach((x) => {
          (zusammen[tag] = zusammen[tag] || []).push({ ...x, widget: w.slug, wname: w.name || w.slug });
        });
      });
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, raeume: alleRaeume, buchungen: zusammen, formulare: (ws || []).map((w) => ({ slug: w.slug, name: w.name || w.slug })) });
  }

  const { data: w } = await db.from('widgets').select('id, tenant_id, belegung').eq('slug', slug).maybeSingle();
  if (!w) return res.status(404).json({ ok: false, error: 'widget unbekannt' });
  if (w.tenant_id !== user.tenant_id) return res.status(403).json({ ok: false, error: 'kein Zugriff' });

  const b = (w.belegung && typeof w.belegung === 'object') ? w.belegung : {};
  const raeume = (Array.isArray(b.raeume) && b.raeume.length) ? b.raeume : ['Hauptraum'];
  const buchungen = (b.buchungen && typeof b.buchungen === 'object') ? { ...b.buchungen } : {};

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, raeume, buchungen });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Methode nicht erlaubt' });

  const jetzt = new Date().toISOString();
  const aktion = String(p.aktion || 'belegen');
  const leadId = p.lead ? String(p.lead) : null;

  // ── Tag wieder freigeben: Eintrag verschwindet, der Tag ist buchbar ──
  if (aktion === 'freigeben') {
    const tag = String(p.datum || '');
    if (!istIso(tag)) return res.status(400).json({ ok: false, error: 'Datum fehlt' });
    (buchungen[tag] || []).filter((x) => x.lead === leadId).forEach((x) => { tagFreigeben(slug, tag, x.sperre || x.raum || raeume[0]); });
    const rest = (buchungen[tag] || []).filter((x) => x.lead !== leadId);
    if (rest.length) buchungen[tag] = rest; else delete buchungen[tag];
    await speichern(w.id, b, buchungen);
    if (w.tenant_id) await wartelisteMelden(w.tenant_id, tag, slug);
    return res.status(200).json({ ok: true, buchungen });
  }

  // ── Storno vormerken: Tag bleibt gesperrt, wird aber als frei werdend gezeigt ──
  if (aktion === 'storno') {
    const tag = String(p.datum || '');
    if (!istIso(tag)) return res.status(400).json({ ok: false, error: 'Datum fehlt' });
    buchungen[tag] = (buchungen[tag] || []).map((x) =>
      x.lead === leadId ? { ...x, storniert: jetzt, storniert_von: user.email } : x);
    await speichern(w.id, b, buchungen);
    await verlaufEintrag(leadId, user, 'storno', tag);
    // Der Gast hat abgesagt: Stand „Verloren“. Sonst zählt der Auftrag weiter im Umsatz und die Erinnerung „Morgen: …“ käme trotzdem.
    if (leadId && !String(leadId).startsWith('eigen-')) await db.from('leads').update({ status: 'verloren', status_am: jetzt }).eq('id', leadId).neq('status', 'verloren').then(() => {}, () => {});
    return res.status(200).json({ ok: true, buchungen, status: 'verloren' });
  }

  // ── Zeit oder Notiz eines bestehenden Termins ändern ──
  if (aktion === 'aendern') {
    const tag = String(p.datum || '');
    if (!istIso(tag)) return res.status(400).json({ ok: false, error: 'Datum fehlt' });
    let treffer = false;
    buchungen[tag] = (buchungen[tag] || []).map((x) => {
      if (x.lead !== leadId) return x;
      treffer = true;
      return { ...x, zeit: istZeit(p.zeit) ? String(p.zeit) : null, bis: istZeit(p.bis) ? String(p.bis) : null, notiz: p.notiz ? String(p.notiz).slice(0, 400) : null };
    });
    if (!treffer) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden' });
    await speichern(w.id, b, buchungen);
    return res.status(200).json({ ok: true, buchungen });
  }

  // ── Eigener Termin ohne Anfrage ───────────────────────────
  // Nicht jeder Termin kommt aus dem Formular: Handwerker, Betriebsurlaub,
  // eine Feier, die telefonisch vereinbart wurde. Solche Termine bekommen
  // eine eigene Kennung statt einer Anfrage-Nummer, sperren den Tag genauso
  // und landen im Kalender-Abo des Betreibers.
  if (aktion === 'eigen') {
    const tag = String(p.datum || '');
    if (!istIso(tag)) return res.status(400).json({ ok: false, error: 'Bitte ein Datum angeben.' });
    const titel = String(p.titel || '').trim().slice(0, 120);
    if (titel.length < 2) return res.status(400).json({ ok: false, error: 'Bitte einen Namen für den Termin angeben.' });

    const raumE = raeume.includes(String(p.raum)) ? String(p.raum) : raeume[0];
    const belegtE = buchungen[tag] || [];
    // Food Truck & Co. mit mehreren Aufträgen pro Tag: auch ein Termin vom Telefon bekommt eine eigene Sperre.
    const mehrE = Math.min(20, Math.max(1, parseInt(p.mehrfach, 10) || 1));
    if (p.mehrfach != null) b.pro_tag = mehrE;
    const kennung = 'eigen-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    let sperreE = raumE;
    if (mehrE > 1) {
      const aktiv = belegtE.filter((x) => !x.storniert).length;
      if (aktiv >= mehrE) return res.status(409).json({ ok: false, error: 'An diesem Tag sind schon ' + aktiv + ' Aufträge eingetragen. Mehr passen laut Ihren Einstellungen nicht.' });
      let nr = 1;
      while (nr <= 25 && !(await tagSperren(slug, tag, nr === 1 ? raumE : raumE + '#' + nr, kennung))) nr++;
      if (nr > 25) return res.status(409).json({ ok: false, error: 'Der Tag ist gerade voll.' });
      sperreE = nr === 1 ? raumE : raumE + '#' + nr;
    } else {
      if (belegtE.some((x) => x.raum === raumE)) return res.status(409).json({ ok: false, error: raumE + ' ist an diesem Tag schon vergeben.' });
      if (!(await tagSperren(slug, tag, raumE, kennung))) return res.status(409).json({ ok: false, error: raumE + ' wurde an diesem Tag gerade eben vergeben.' });
    }
    buchungen[tag] = belegtE.concat([{
      lead: kennung,
      eigen: true,
      sperre: sperreE !== raumE ? sperreE : undefined,
      name: titel,
      email: null,
      telefon: p.telefon ? String(p.telefon).slice(0, 40) : null,
      wert: null,
      raum: raumE,
      zeit: istZeit(p.zeit) ? String(p.zeit) : null,
      bis: istZeit(p.bis) ? String(p.bis) : null,
      notiz: p.notiz ? String(p.notiz).slice(0, 400) : null,
      seit: jetzt,
      von: user.email,
      storniert: null
    }]);
    await speichern(w.id, b, buchungen);
    return res.status(200).json({ ok: true, buchungen, datum: tag });
  }

  // ── Fest einplanen ────────────────────────────────────────────────
  if (!leadId) return res.status(400).json({ ok: false, error: 'Anfrage fehlt' });
  const { data: lead } = await db.from('leads').select('*').eq('id', leadId).maybeSingle();
  if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden' });

  const tag = istIso(p.datum) ? String(p.datum) : lead.termin;
  if (!istIso(tag)) return res.status(400).json({ ok: false, error: 'Für diese Anfrage liegt kein Termin vor.' });

  const raum = raeume.includes(String(p.raum)) ? String(p.raum) : raeume[0];
  const belegt = buchungen[tag] || [];
  if (belegt.some((x) => x.lead === leadId)) return res.status(409).json({ ok: false, error: 'Diese Anfrage ist an dem Tag bereits eingeplant.' });
  // Mehrere Aufträge pro Tag: jeder bekommt eine eigene Sperre (Raum#2, Raum#3 …), bis die Höchstzahl erreicht ist.
  const mehrfach = Math.min(20, Math.max(1, parseInt(p.mehrfach, 10) || 1));
  let sperre = raum;
  // Formular und Cockpit sperren den Tag erst, wenn alle vergeben sind (lib/_kaltage.js). Auch zurück auf 1, wenn der Betrieb es so einstellt.
  if (p.mehrfach != null) b.pro_tag = mehrfach;
  if (mehrfach > 1) {
    const aktiv = belegt.filter((x) => !x.storniert).length;
    if (aktiv >= mehrfach) return res.status(409).json({ ok: false, error: 'An diesem Tag ' + (aktiv === 1 ? 'ist schon 1 Auftrag' : 'sind schon ' + aktiv + ' Aufträge') + ' eingetragen. Mehr passen laut Ihren Einstellungen nicht.' });
    let nr = 1;
    while (nr <= 25 && !(await tagSperren(slug, tag, nr === 1 ? raum : raum + '#' + nr, leadId))) nr++;
    if (nr > 25) return res.status(409).json({ ok: false, error: 'Der Tag ist gerade voll.' });
    sperre = nr === 1 ? raum : raum + '#' + nr;
  } else if (belegt.some((x) => x.raum === raum)) return res.status(409).json({ ok: false, error: raum + ' ist an diesem Tag schon vergeben.' });

  const zeit = istZeit(p.zeit) ? String(p.zeit) : null;
  const bis = istZeit(p.bis) ? String(p.bis) : null;

  if (mehrfach === 1 && !(await tagSperren(slug, tag, raum, leadId))) {
    return res.status(409).json({ ok: false, error: raum + ' wurde an diesem Tag gerade eben vergeben.' });
  }
  // Frisch lesen: zwischen dem ersten Lesen und jetzt kann jemand einen anderen Tag eingeplant haben.
  const { data: frisch } = await db.from('widgets').select('belegung').eq('id', w.id).maybeSingle();
  if (frisch && frisch.belegung && frisch.belegung.buchungen) {
    Object.keys(frisch.belegung.buchungen).forEach((t) => { if (t !== tag) buchungen[t] = frisch.belegung.buchungen[t]; });
  }

  buchungen[tag] = belegt.concat([{
    lead: leadId,
    name: lead.name || lead.email || 'Ohne Namen',
    email: lead.email || null,
    telefon: lead.phone || null,
    wert: lead.value_est || null,
    raum,
    sperre: sperre !== raum ? sperre : undefined,
    zeit,
    bis,
    notiz: p.notiz ? String(p.notiz).slice(0, 400) : null,
    seit: jetzt,
    von: user.email,
    storniert: null
  }]);

  await speichern(w.id, b, buchungen);

  // Stand auf „Termin fest eingeplant" ziehen und im Verlauf festhalten.
  const verlauf = Array.isArray(lead.verlauf) ? lead.verlauf : [];
  verlauf.push({ am: jetzt, was: 'buchung', wert: tag + (zeit ? ' ' + zeit : '') + ' · ' + raum, wer: user.email });
  if (lead.status !== 'gebucht') verlauf.push({ am: jetzt, was: 'status', wert: 'gebucht', wer: user.email });
  await db.from('leads').update({ status: 'gebucht', status_am: jetzt, termin: tag, verlauf }).eq('id', leadId);

  return res.status(200).json({ ok: true, buchungen, datum: tag, zeit, raum, status: 'gebucht', verlauf });
}

/* Sperre in der Datenbank: gelingt das Einfügen nicht, hat jemand anderes den
   Raum an diesem Tag gerade eben vergeben. Fehlt die Tabelle noch (sql/29 nicht
   eingespielt), läuft alles wie bisher weiter. */
async function tagSperren(slug, tag, raum, lead) {
  const { error } = await db.from('tages_buchung').insert({ widget_id: slug, datum: tag, raum, lead });
  if (!error) return true;
  return error.code !== '23505';
}
async function tagFreigeben(slug, tag, raum) {
  await db.from('tages_buchung').delete().eq('widget_id', slug).eq('datum', tag).eq('raum', raum).then(() => {}, () => {});
}

async function speichern(id, bestand, buchungen) {
  await db.from('widgets')
    .update({ belegung: { ...bestand, buchungen }, updated_at: new Date().toISOString() })
    .eq('id', id);
  // Echtzeit-Kalender: eingeplante Tage sofort in den Kalender des Betriebs
  try { const { data: w } = await db.from('widgets').select('tenant_id').eq('id', id).maybeSingle(); if (w && w.tenant_id) await kalenderNachziehen(w.tenant_id); } catch (e) {}
}

async function verlaufEintrag(leadId, user, was, wert) {
  if (!leadId) return;
  const { data: l } = await db.from('leads').select('verlauf').eq('id', leadId).maybeSingle();
  if (!l) return;
  const v = Array.isArray(l.verlauf) ? l.verlauf : [];
  v.push({ am: new Date().toISOString(), was, wert, wer: user.email });
  await db.from('leads').update({ verlauf: v }).eq('id', leadId);
}
