// Uhrzeit-Termine (Friseur & Co.)
//
// Öffentlich, für das Widget:
//   GET  /api/termine?aktion=frei&widget=…&datum=YYYY-MM-DD&dauer=30
//        → { zeiten:[{ z:'09:00', p:[personal_id,…] }] }
// Cockpit (token):
//   GET  /api/termine?token=…&aktion=setup                → Mitarbeiter, Leistungen, Regeln
//   GET  /api/termine?token=…&aktion=liste&von=…&bis=…    → Termine im Zeitraum
//   POST { token, aktion:'personal', liste:[{ id?, name, aktiv, zeiten }] }
//   POST { token, aktion:'setup', leistungen, raster, vorlauf_std, tage }
//   POST { token, aktion:'status', id, status:'fest'|'abgelehnt'|'abgesagt', still? }   still = Kunde hat selbst abgesagt (WhatsApp/Telefon), keine Nachricht an ihn
//   POST { token, aktion:'eigen', personal_id, datum, zeit, dauer, name, telefon, nachricht }
//   POST { token, aktion:'vorschlag', id, datum, zeit }   → andere Uhrzeit vorschlagen, Link für den Gast
//   POST { token, aktion:'verlaengern', id, plus, pruefen? } → Termin länger, Folgetermine rücken nach
//   POST { token, aktion:'notiz', email, telefon, notiz, plus } → Notiz am Kunden
//   POST { token, aktion:'beratung', lead, personal_id, datum, zeit, dauer, leistung } → Vorschlag nach Beratungsanfrage
//   GET  /api/termine?token=…&aktion=notiz&email=…&telefon=…
// Öffentlich, für den Gast:
//   GET  /api/termine?aktion=antwort&id=…&k=…&ja=1|0   → Vorschlag annehmen oder ablehnen (HTML-Seite)
//   GET  /api/termine?aktion=ics&id=…&k=…               → Kalender-Eintrag für einen festen Termin (Knopf in der Bestätigung)
import { db, cors, body, userByToken, rolleVon, darf, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { wartelisteMelden } from './_warteliste.js';
import { freieZeiten, setupLaden, lokal, lokalText, istIso, istZeit, minuten, zeitenVon, plusTage, heuteBerlin, notizSchluessel, notizFuer, salonPruefen, leistungSauber, anfrageNachziehen, neusetVon, NEUSET_SATZ, istWimpern } from './_termine.js';
import { meineAnfrage } from './anfrage.js';
import { T, sprache, datum as spDatum, uhr as spUhr, eur as spEur, betriebSprache } from './_sprache.js';
import { pushSenden, betriebMelden } from './_push.js';
import { kalenderNachziehen } from './_kalender-direkt.js';
import crypto from 'crypto';
import { smsSenden, smsNummer, SMS_AN } from './_sms.js';
import { gt, gtWann } from './_gasttexte.js';

// Adresse in Links an Kunden. Mit eigener Adresse (z. B. termin.clickzauber.de) wirkt der Link vertrauter.
const API_HOST = (process.env.GAST_HOST || 'https://clickzauber-api.vercel.app').replace(/\/+$/, '');

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? body(req) : req.query;
  const aktion = String(p.aktion || '');
  if (req.method === 'GET' && String((req.query || {}).aktion || '') === 'ics') return gastKalender(req, res, req.query || {});
  if (String((req.query || {}).aktion || '') === 'antwort' && (req.method === 'GET' || req.method === 'POST')) {
    let form = {}; if (req.method === 'POST') { try { form = typeof req.body === 'object' && req.body ? req.body : Object.fromEntries(new URLSearchParams(String(req.body || ''))); } catch (e) { form = {}; } }
    return gastAntwort(req, res, { ...(req.query || {}), ...form }, req.method === 'POST');
  }

  // ── Öffentlich: freie Zeiten ────────────────────────────────
  if (req.method === 'GET' && aktion === 'frei') {
    const { data: w } = await db.from('widgets').select('tenant_id, status, belegung').eq('slug', String(p.widget || '')).maybeSingle();
    if (!w || !w.tenant_id || w.status !== 'live') return res.status(404).json({ ok: false });
    const ctx = await setupLaden(w.tenant_id);
    ctx.gesperrt = (w.belegung && w.belegung.gesperrt) || [];
    const dauer = Math.min(480, Math.max(5, parseInt(p.dauer, 10) || 30));
    const zeiten = await freieZeiten(w.tenant_id, String(p.datum || ''), dauer, ctx);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, zeiten });
  }

  // ── Öffentlich: Gast antwortet auf einen Vorschlag ──────────────────
  // (Gast antwortet: siehe oben, vor allen anderen Aktionen)

  const user = await userByToken(p.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const tenant = user.tenant_id;
  const rolle = await rolleVon(user);
  // Echtzeit-Kalender: nach jeder erfolgreichen Änderung sofort nachziehen, bevor die Antwort rausgeht.
  if (req.method === 'POST' && ['status', 'vorschlag', 'eigen', 'verlaengern', 'spaeter', 'beratung', 'schluss'].includes(aktion) && !p.pruefen) {
    const senden = res.json.bind(res);
    res.json = (b) => (b && b.ok ? kalenderNachziehen(tenant).catch(() => null).then(() => senden(b)) : senden(b));
  }

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    if (aktion === 'setup') {
      const ctx = await setupLaden(tenant);
      return res.status(200).json({ ok: true, sms: SMS_AN, gast_host: API_HOST, betrieb: (await betriebKurz(tenant).catch(() => ({ wer: '' }))).wer, darf_aendern: darf(rolle, 'bearbeiten'), ...ctx });
    }
    if (aktion === 'liste') {
      const von = istIso(p.von) ? p.von : heuteBerlin();
      const bis = istIso(p.bis) ? p.bis : plusTage(von, 7);
      // lead=…: alle Termine einer Anfrage, egal an welchem Tag (seit 14.10.2026). Hat der Kunde einen anderen Tag gewählt,
      // findet das Cockpit den Termin so auch dann, wenn die Anfrage noch den alten Tag nennt.
      const lead = /^[0-9a-f-]{36}$/i.test(String(p.lead || '')) ? String(p.lead) : '';
      let q = db.from('termine').select('*').eq('tenant_id', tenant);
      q = lead ? q.eq('lead_id', lead) : q.gte('start', lokal(von, '00:00').toISOString()).lt('start', lokal(plusTage(bis, 1), '00:00').toISOString());
      const { data } = await q.order('start').limit(lead ? 100 : 1000);
      const termine = (data || []).map((t) => ({ ...t, ...lokalText(t.start), bis_zeit: lokalText(t.ende).zeit }));
      // Notizen am Kunden gleich mitliefern, damit sie in der Liste stehen.
      try {
        const keys = [...new Set(termine.flatMap((t) => notizSchluessel(t.email, t.telefon)))].slice(0, 500);
        if (keys.length) {
          let { data: nz, error: ne } = await db.from('kunden_notiz').select('schluessel, notiz, plus_min, nicht_da').eq('tenant_id', tenant).in('schluessel', keys);
          if (ne) ({ data: nz } = await db.from('kunden_notiz').select('schluessel, notiz, plus_min').eq('tenant_id', tenant).in('schluessel', keys));
          const nach = {}; (nz || []).forEach((n) => { nach[n.schluessel] = n; });
          termine.forEach((t) => { const k = notizSchluessel(t.email, t.telefon).find((x) => nach[x]); if (k) t.kunden_notiz = { notiz: nach[k].notiz || '', plus: nach[k].plus_min || 0, nicht_da: nach[k].nicht_da || 0 }; });
        }
      } catch (e) { /* ohne sql/47 */ }
      try {
        const lids = [...new Set(termine.map((t) => t.lead_id).filter(Boolean))].slice(0, 500);
        if (lids.length) {
          const { data: ls } = await db.from('leads').select('id, sprache, answers, value_est').in('id', lids);
          const sp = {}, lm = {}; (ls || []).forEach((x) => { sp[x.id] = sprache(x.sprache); lm[x.id] = x; });
          termine.forEach((t) => {
            if (t.lead_id && sp[t.lead_id]) t.sprache = sp[t.lead_id];
            // Kachel im Cockpit: was der Kunde außer der Leistung gewählt hat (answers._auswahl, public/w.js) und der Gesamtbetrag. Bei mehreren Personen nur an der ersten.
            const ld = t.lead_id && lm[t.lead_id];
            if (!ld || (t.person_nr && t.person_nr > 1)) return;
            const aw = ld.answers && Array.isArray(ld.answers._auswahl) ? ld.answers._auswahl : [];
            const ex = aw.filter((x) => x && x.typ === 'wahl' && x.a).map((x) => String(x.a));
            if (ex.length) t.extras = ex.join(', ').slice(0, 140);
            const su = aw.some((x) => x && x.typ === 'termin') ? aw.reduce((s, x) => s + (+(x && x.p) || 0), 0) : 0;
            const w = su > 0 ? Math.round(su * 100) / 100 : +ld.value_est;
            if (aw.length && w > 0) t.wert = w;
          });
        }
        const eids = [...new Set(termine.map((t) => t.ersetzt).filter(Boolean))];
        // Offene Umbuchung nur, solange der bisherige Termin noch fest ist. Ist er weg, ist dieser Termin der eigentliche:
        // ohne ersetzt, sonst schickt das Cockpit beim Ablehnen „Ihr bisheriger Termin bleibt“, obwohl es keinen mehr gibt.
        if (eids.length) { const { data: es } = await db.from('termine').select('id, start, status, gast_key').in('id', eids); const m = {}; (es || []).forEach((x) => { m[x.id] = x; }); termine.forEach((t) => { if (!t.ersetzt) return; const o = m[t.ersetzt]; if (o && o.status === 'fest') { t.ersetzt_iso = o.start; t.ersetzt_key = o.gast_key || null; } else t.ersetzt = null; }); }
      } catch (e) { /* ohne sql/51 */ }
      const { count } = await db.from('termine').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant).in('status', ['wunsch', 'vorschlag']).gte('start', new Date().toISOString());
      return res.status(200).json({ ok: true, termine, offen: count || 0 });
    }
    if (aktion === 'notiz') {
      const n = await notizFuer(tenant, p.email, p.telefon).catch(() => null);
      return res.status(200).json({ ok: true, notiz: n ? n.notiz : '', plus: n ? n.plus : 0, nicht_da: n ? n.nicht_da || 0 : 0, moeglich: notizSchluessel(p.email, p.telefon).length > 0 });
    }
    // Kundenkarte (seit 04.10.2026): alle Termine einer Person, wiedererkannt über E-Mail oder Telefonnummer
    // wie die Notiz zum Kunden. Reicht so weit zurück, wie die Löschfrist Termine aufbewahrt. Anzeige: js/cz-kundenkarte.js
    if (aktion === 'kunde') {
      const keys = notizSchluessel(p.email, p.telefon);
      if (!keys.length) return res.status(200).json({ ok: true, moeglich: false, termine: [] });
      const mail = keys.find((k) => k.startsWith('m:')), tel = keys.find((k) => k.startsWith('t:'));
      const funde = [];
      if (mail) {
        const { data } = await db.from('termine').select('*').eq('tenant_id', tenant).ilike('email', mail.slice(2)).order('start', { ascending: false }).limit(300);
        funde.push(...(data || []));
      }
      if (tel) {
        // Nummern stehen in vielen Schreibweisen da („0176 123 4567“, „+49 176…“): über die letzten sieben Ziffern grob suchen, dann genau vergleichen.
        const muster = '%' + tel.slice(-7).split('').join('%') + '%';
        const { data } = await db.from('termine').select('*').eq('tenant_id', tenant).ilike('telefon', muster).order('start', { ascending: false }).limit(300);
        funde.push(...(data || []));
      }
      const da = new Set();
      const termine = funde.filter((x) => {
        if (da.has(x.id)) return false;
        da.add(x.id);
        if (x.eigen && x.leistung === 'Gesperrt') return false;
        return notizSchluessel(x.email, x.telefon).some((k) => keys.includes(k));
      }).sort((a, b) => String(b.start).localeCompare(String(a.start))).slice(0, 300)
        .map((x) => ({ ...x, ...lokalText(x.start), bis_zeit: lokalText(x.ende).zeit }));
      const n = await notizFuer(tenant, p.email, p.telefon).catch(() => null);
      return res.status(200).json({ ok: true, moeglich: true, termine, notiz: n ? n.notiz : '', plus: n ? n.plus : 0, nicht_da: n ? n.nicht_da || 0 : 0 });
    }
    return res.status(400).json({ ok: false, error: 'Unbekannte Aktion.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Mit Ihrem Zugang können Sie hier nur lesen.' });

  if (aktion === 'personal') {
    const liste = Array.isArray(p.liste) ? p.liste.slice(0, 20) : null;
    if (!liste) return res.status(400).json({ ok: false, error: 'Liste fehlt.' });
    const { data: bisher } = await db.from('personal').select('id').eq('tenant_id', tenant);
    const alt = new Set((bisher || []).map((x) => x.id));
    const behalten = new Set();
    for (let i = 0; i < liste.length; i++) {
      const m = liste[i] || {};
      const name = String(m.name || '').trim().slice(0, 60);
      if (!name) continue;
      const zeile = { tenant_id: tenant, name, aktiv: m.aktiv !== false, reihenfolge: i, zeiten: zeitenPruefen(m.zeiten) };
      if (m.id && alt.has(m.id)) { await db.from('personal').update(zeile).eq('id', m.id).eq('tenant_id', tenant); behalten.add(m.id); }
      else { const { data: n } = await db.from('personal').insert(zeile).select('id').single(); if (n) behalten.add(n.id); }
    }
    const weg = [...alt].filter((id) => !behalten.has(id));
    if (weg.length) {
      // Mit künftigen Terminen nicht löschen, nur ausblenden: sonst verlieren die Termine ihren Mitarbeiter.
      const { data: mit } = await db.from('termine').select('personal_id').in('personal_id', weg).in('status', ['wunsch', 'vorschlag', 'fest']).gte('ende', new Date().toISOString());
      const halten = new Set((mit || []).map((x) => x.personal_id));
      const loeschen = weg.filter((id) => !halten.has(id));
      if (halten.size) await db.from('personal').update({ aktiv: false }).in('id', [...halten]).eq('tenant_id', tenant);
      if (loeschen.length) await db.from('personal').delete().in('id', loeschen).eq('tenant_id', tenant);
    }
    const ctx = await setupLaden(tenant);
    const konflikte = await personalKonflikte(tenant, ctx).catch(() => []);
    return res.status(200).json({ ok: true, sms: SMS_AN, personal: ctx.personal, konflikte });
  }

  if (aktion === 'setup') {
    const leistungen = (Array.isArray(p.leistungen) ? p.leistungen : []).slice(0, 30).map((l) => ({
      name: String((l && l.name) || '').trim().slice(0, 80),
      dauer: Math.min(480, Math.max(5, Math.round((+(l && l.dauer) || 30) / 5) * 5)),
      preis: l && l.preis !== '' && l.preis != null && isFinite(+l.preis) ? Math.max(0, +l.preis) : null,
      tr: trName(l && l.tr),
      zuschlag: zuschlagPruefen(l && l.zuschlag),
      beratung: l && l.beratung ? true : undefined,
      fuer: ['damen', 'herren', 'kinder'].includes(l && l.fuer) ? l.fuer : undefined,   // Funktion „damen_herren“ (sql/65)
      ...inhaltFelder(l)   // Inhaltsverzeichnis (seit 08.10.2026): Kategorie, Haare, Farbe, Waschen, ab-Preis, Hinweis
    })).filter((l) => l.name);
    if (!leistungen.length) return res.status(400).json({ ok: false, error: 'Bitte mindestens eine Leistung eintragen.' });
    const raster = [10, 15, 20, 30, 60].includes(+p.raster) ? +p.raster : 15;
    const vorlauf = Math.min(72, Math.max(0, parseInt(p.vorlauf_std, 10) || 0));
    const tage = Math.min(180, Math.max(1, parseInt(p.tage, 10) || 42));
    const absage = [0, 1, 2, 3, 6, 12, 24, 48].includes(+p.absage_std) ? +p.absage_std : 1;
    const zeile = { tenant_id: tenant, leistungen, raster, vorlauf_std: vorlauf, tage, absage_std: absage, updated_at: new Date().toISOString() };
    if (p.salon && typeof p.salon === 'object') zeile.salon = salonPruefen(p.salon);
    let ohneSalon = false;
    let { error } = await db.from('termin_setup').upsert(zeile);
    if (error && error.code === '42703' && zeile.salon) { delete zeile.salon; ohneSalon = true; ({ error } = await db.from('termin_setup').upsert(zeile)); }   // sql/66 fehlt
    if (error && error.code === '42703') { delete zeile.absage_std; ({ error } = await db.from('termin_setup').upsert(zeile)); }   // ohne sql/52
    if (error) { console.error('termin_setup (sql/28?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    return res.status(200).json({ ok: true, hinweis: ohneSalon ? 'Leistungen gespeichert. Für das Inhaltsverzeichnis fehlt noch sql/66 in Supabase.' : undefined });
  }

  // Nicht erschienen: am Termin markieren und bei der Person mitzählen
  if (aktion === 'nicht_da') {
    const an = p.an !== false && p.an !== '0' && p.an !== 0;
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (t.status !== 'fest') return res.status(400).json({ ok: false, error: 'Nur bestätigte Termine lassen sich markieren.' });
    if (new Date(t.start).getTime() > Date.now()) return res.status(400).json({ ok: false, error: 'Der Termin hat noch nicht begonnen.' });
    if (!!t.nicht_da === an) return res.status(200).json({ ok: true, nicht_da: an });
    const { error } = await db.from('termine').update({ nicht_da: an ? new Date().toISOString() : null }).eq('id', t.id);
    if (error) { console.error('nicht_da (sql/52?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    const keys = notizSchluessel(t.email, t.telefon);
    if (keys.length) {
      const { data: alt } = await db.from('kunden_notiz').select('schluessel, notiz, plus_min, nicht_da').eq('tenant_id', tenant).in('schluessel', keys);
      const vorher = Math.max(0, ...(alt || []).map((x) => +x.nicht_da || 0)), basis = (alt || [])[0] || {};
      const neu = Math.max(0, vorher + (an ? 1 : -1));
      await db.from('kunden_notiz').upsert(keys.map((k) => { const a = (alt || []).find((x) => x.schluessel === k) || basis; return { tenant_id: tenant, schluessel: k, notiz: a.notiz || '', plus_min: a.plus_min || 0, nicht_da: neu, updated_at: new Date().toISOString() }; })).then(() => {}, () => {});
    }
    return res.status(200).json({ ok: true, nicht_da: an });
  }

  // Kunde am Vortag per WhatsApp erinnert
  if (aktion === 'erinnert') {
    const { error } = await db.from('termine').update({ gast_erinnert: new Date().toISOString() }).eq('id', String(p.id || '')).eq('tenant_id', tenant);
    return res.status(error ? 500 : 200).json({ ok: !error });
  }

  // Betrieb hat den Kunden per WhatsApp informiert (Knopf „Ja“ nach „Nachricht gesendet?“)
  if (aktion === 'bescheid') {
    const { error } = await db.from('termine').update({ bescheid: null }).eq('id', String(p.id || '')).eq('tenant_id', tenant);
    return res.status(error ? 500 : 200).json({ ok: !error });
  }

  if (aktion === 'status') {
    const neu = String(p.status || '');
    if (!['fest', 'abgelehnt', 'abgesagt'].includes(neu)) return res.status(400).json({ ok: false, error: 'Unbekannter Status.' });
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    // Nur erlaubte Schritte. Hat ein anderes Gerät den Termin gerade bearbeitet, passiert nichts doppelt.
    const VON = { fest: ['wunsch', 'vorschlag'], abgelehnt: ['wunsch', 'vorschlag'], abgesagt: ['wunsch', 'vorschlag', 'fest'] };
    if (!VON[neu].includes(t.status)) return res.status(409).json({ ok: false, status: t.status, error: t.status === neu ? 'Das ist schon erledigt.' : 'Dieser Termin wurde gerade schon bearbeitet. Bitte die Liste neu laden.' });
    // bei = Tag und Uhrzeit, die das Cockpit gezeigt hat (JJJJ-MM-TTTHH:MM). Hat der Kunde inzwischen eine andere Zeit gewählt
    // oder ein anderes Gerät den Termin verschoben, nichts ändern: Sonst ginge eine Bestätigung mit der alten Uhrzeit raus.
    if (p.bei) { const lt = lokalText(t.start); if (String(p.bei) !== lt.datum + 'T' + lt.zeit) return res.status(409).json({ ok: false, status: t.status, neu_laden: true, error: 'Die Zeit hat sich gerade geändert, jetzt ' + spDatum('de', lt.datum) + ' um ' + lt.zeit + ' Uhr. Das Blatt lädt gleich neu.' }); }
    const echt = !(t.eigen && t.leistung === 'Gesperrt'), vorher = t.status;
    // erinnert_am zurücksetzen: sonst kommt nach dem Annehmen keine Erinnerung „Kunde noch nicht informiert“ mehr
    const upd = { status: neu, status_am: new Date().toISOString(), erinnert_am: null };
    // Fester Termin bekommt einen Link, über den der Kunde selbst absagen kann.
    if (neu === 'fest' && echt && !t.gast_key) upd.gast_key = /^[a-f0-9]{32}$/.test(String(p.gast_key || '')) ? String(p.gast_key) : crypto.randomBytes(16).toString('hex');
    const { data: w, error: fe } = await db.from('termine').update(upd).eq('id', t.id).eq('status', vorher).select('id');
    if (fe) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
    if (!w || !w.length) return res.status(409).json({ ok: false, error: 'Dieser Termin wurde gerade schon bearbeitet. Bitte die Liste neu laden.' });
    if (upd.gast_key) t.gast_key = upd.gast_key;
    // Umbuchung angenommen: der bisherige Termin fällt weg
    if (neu === 'fest' && t.ersetzt) await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).eq('id', t.ersetzt).eq('status', 'fest').then(() => {}, () => {});
    // Fester Termin abgesagt: eine offene Umbuchung dazu fällt mit weg, wie beim Absagen über den Link des Kunden.
    if (neu === 'abgesagt' && vorher === 'fest') await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).eq('tenant_id', tenant).eq('ersetzt', t.id).in('status', ['wunsch', 'vorschlag']).then(() => {}, () => {});
    // Stand und Tag der Anfrage aus allen ihren Terminen: gebucht, offen oder verloren (auch bei Umbuchungen, lib/_termine.js).
    await anfrageNachziehen(t.lead_id);
    let mail = false, sms = false, text = '';
    // still: Der Kunde hat selbst per WhatsApp oder Telefon abgesagt. Er bekommt keine Nachricht mehr.
    if (echt && p.still === true && neu !== 'fest') await bescheidMerken(t.id, null);
    else if (echt) {
      const k = await betriebKurz(tenant);
      const l = await gastSprache(t);
      let art = neu === 'fest' ? 'fest' : neu === 'abgesagt' ? 'abgesagt' : (vorher === 'vorschlag' ? 'zurueck' : 'abgelehnt');
      const ex = {};
      if (t.ersetzt && neu !== 'fest') { const { data: o } = await db.from('termine').select('id, start, status, gast_key').eq('id', t.ersetzt).maybeSingle(); if (o && o.status === 'fest') { art = 'umbuch_nein'; ex.w2 = gtWann(l, o.start); ex.a = antwortLink(o); } }
      text = gastText(art, t, k.wer, l, ex);
      if (t.email && art !== 'umbuch_nein') mail = await bescheidMail(t, neu, tenant);
      if (t.telefon && SMS_AN) sms = await smsSenden(t.telefon, text, k.wer);
      await bescheidMerken(t.id, t.telefon && !sms ? text : null);
    }
    if (neu !== 'fest') await wartelisteMelden(tenant, lokalText(t.start).datum, null);
    return res.status(200).json({ ok: true, status: neu, mail, sms, text, telefon: t.telefon || null, gast_key: t.gast_key || null });
  }

  if (aktion === 'vorschlag') {
    if (!istIso(p.datum) || !istZeit(p.zeit)) return res.status(400).json({ ok: false, error: 'Bitte Tag und Uhrzeit angeben.' });
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon abgesagt oder abgelehnt.' });
    // Dauer wie beim Verschieben: ohne gespeicherte Dauer aus Beginn und Ende, sonst schrumpft ein langer Termin auf 30 Minuten.
    const dauer = t.dauer || Math.max(5, Math.round((new Date(t.ende) - new Date(t.start)) / 60000)) || 30;
    const start = lokal(p.datum, p.zeit), ende = new Date(start.getTime() + dauer * 60000);
    if (start.getTime() < Date.now()) return res.status(400).json({ ok: false, error: 'Diese Uhrzeit liegt in der Vergangenheit.' });
    const key = t.gast_key || crypto.randomBytes(16).toString('hex');
    // Wovon weg vorgeschlagen wird: bei offenem Vorschlag die erste Wunschzeit, sonst die aktuelle Zeit.
    // Ping-Pong (seit 14.10.2026): Hat der Kunde inzwischen eine neue Zeit gewählt, bezieht sich der nächste Vorschlag auf diese.
    const von0 = t.status === 'vorschlag' ? (t.vorschlag_von || t.start) : t.start;
    const { error } = await db.from('termine').update({
      start: start.toISOString(), ende: ende.toISOString(), status: 'vorschlag', status_am: new Date().toISOString(),
      vorschlag_von: von0, gast_key: key, erinnert_am: null,   // „Erneut fragen“: Erinnerung beginnt von vorn
      ...(/^Hat statt /.test(String(t.hinweis || '')) || (t.status === 'fest' && /^Möchte umbuchen/.test(String(t.hinweis || ''))) ? { hinweis: null } : {})   // „Hat statt … gewählt“ und eine längst angenommene Umbuchung gelten nach einem neuen Vorschlag nicht mehr
    }).eq('id', t.id);
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: (t.personal_name || 'Der Mitarbeiter') + ' hat zu dieser Zeit schon einen Termin.' });
    if (error) { console.error('vorschlag (sql/46?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    // Tag der Anfrage nachziehen. Bei offener Umbuchung gilt weiter der bisherige feste Termin.
    await anfrageNachziehen(t.lead_id);
    const link = API_HOST + '/api/termine?aktion=antwort&id=' + t.id + '&k=' + key;
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const alt = lokalText(von0);
    const warFest = t.status === 'fest';
    // Liegt die bisherige Zeit an einem anderen Tag, den Tag mit nennen. „Um 16:30 Uhr …“ allein wäre im Hin und Her missverständlich.
    const grund = warFest ? 'Wir müssen Ihren Termin am ' + spDatum('de', alt.datum) + ' um ' + alt.zeit + ' Uhr leider verschieben.' : (alt.datum !== p.datum ? 'Am ' + spDatum('de', alt.datum) + ' um ' : 'Um ') + alt.zeit + ' Uhr ist es bei uns leider schon voll.';
    const lv = await gastSprache(t);
    const vv = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann(lv, lokal(p.datum, p.zeit).toISOString()), w2: gtWann(lv, von0), a: link, wer };
    const text = gt(lv, 'hallo', vv) + gt(lv, warFest ? 'verschieben' : 'voll', vv) + ' ' + gt(lv, 'vorschlag', vv) + gt(lv, 'gruss', vv);
    let mail = false, sms = false;
    if (t.email && MAIL_KEY) mail = await vorschlagMail(t, p.datum, p.zeit, alt, link, wer, tenant, null, grund);
    if (t.telefon && SMS_AN) sms = await smsSenden(t.telefon, wer + ': ' + grund + ' Passt ' + spDatum('de', p.datum) + ' um ' + p.zeit + ' Uhr? Bitte kurz antworten: ' + link, wer);
    await bescheidMerken(t.id, t.telefon && !sms ? text : null);
    return res.status(200).json({ ok: true, status: 'vorschlag', link, text, mail, sms, telefon: t.telefon || null });
  }

  /* Ansicht 2 (seit 13.10.2026): Termin per Ziehen verschieben.
     Seit 17.10.2026 wie ein Vorschlag (Manuels Wunsch): Status „vorschlag“, der Kunde bestätigt oder wählt eine andere Zeit auf „Ihr Termin“,
     danach läuft das Hin und Her wie bei Anfragen aus dem Formular. Mail und SMS wie bei „vorschlag“, das Cockpit bietet WhatsApp mit demselben Text an. */
  if (aktion === 'verschieben') {
    if (!istIso(p.datum) || !istZeit(p.zeit)) return res.status(400).json({ ok: false, error: 'Bitte Tag und Uhrzeit angeben.' });
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon abgesagt oder abgelehnt.' });
    const dauer = t.dauer || Math.max(5, Math.round((new Date(t.ende) - new Date(t.start)) / 60000)) || 30;
    const start = lokal(p.datum, p.zeit), ende = new Date(start.getTime() + dauer * 60000);
    const key = t.gast_key || crypto.randomBytes(16).toString('hex');
    // Sperren (Früher Schluss, Frei) und Termine ohne Kontakt bleiben, wie sie sind: nur Zeit und Mitarbeiter ändern sich, kein Vorschlag.
    const nurZeit = (t.eigen && t.leistung === 'Gesperrt') || (!t.telefon && !t.email);
    const von0 = t.status === 'vorschlag' ? (t.vorschlag_von || t.start) : t.start;
    const upd = nurZeit ? { start: start.toISOString(), ende: ende.toISOString(), erinnert_am: null, ...(t.gast_key ? {} : { gast_key: key }) } : {
      start: start.toISOString(), ende: ende.toISOString(), status: 'vorschlag', status_am: new Date().toISOString(),
      vorschlag_von: von0, gast_key: key, erinnert_am: null,
      ...(/^Hat statt /.test(String(t.hinweis || '')) || (t.status === 'fest' && /^Möchte umbuchen/.test(String(t.hinweis || ''))) ? { hinweis: null } : {})
    };
    let peName = t.personal_name || '';
    if (p.personal_id && String(p.personal_id) !== String(t.personal_id)) {
      const { data: pe } = await db.from('personal').select('id,name').eq('id', String(p.personal_id)).eq('tenant_id', tenant).maybeSingle();
      if (!pe) return res.status(400).json({ ok: false, error: 'Mitarbeiter nicht gefunden.' });
      upd.personal_id = pe.id; if ('personal_name' in t) upd.personal_name = pe.name; peName = pe.name;
    }
    const { error } = await db.from('termine').update(upd).eq('id', t.id);
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: 'Zu dieser Zeit ist schon ein Termin eingetragen.' });
    if (error) { console.error('verschieben:', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    await anfrageNachziehen(t.lead_id);
    const link = API_HOST + '/api/termine?aktion=antwort&id=' + t.id + '&k=' + key;
    if (nurZeit) return res.status(200).json({ ok: true, id: t.id, status: t.status, datum: p.datum, zeit: p.zeit, telefon: t.telefon || null, name: t.name || '', personal: peName, link: t.eigen && t.leistung === 'Gesperrt' ? '' : link });
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const alt = lokalText(von0);
    const warFest = t.status === 'fest';
    const grund = warFest ? 'Wir müssen Ihren Termin am ' + spDatum('de', alt.datum) + ' um ' + alt.zeit + ' Uhr leider verschieben.' : (alt.datum !== p.datum ? 'Am ' + spDatum('de', alt.datum) + ' um ' : 'Um ') + alt.zeit + ' Uhr ist es bei uns leider schon voll.';
    const lv = await gastSprache(t);
    const vv = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann(lv, start.toISOString()), w2: gtWann(lv, von0), a: link, wer };
    const text = gt(lv, 'hallo', vv) + gt(lv, warFest ? 'verschieben' : 'voll', vv) + ' ' + gt(lv, 'vorschlag', vv) + gt(lv, 'gruss', vv);
    let mail = false, sms = false;
    if (t.email && MAIL_KEY) mail = await vorschlagMail(t, p.datum, p.zeit, alt, link, wer, tenant, null, grund);
    if (t.telefon && SMS_AN) sms = await smsSenden(t.telefon, wer + ': ' + grund + ' Passt ' + spDatum('de', p.datum) + ' um ' + p.zeit + ' Uhr? Bitte kurz antworten: ' + link, wer);
    await bescheidMerken(t.id, t.telefon && !sms ? text : null);
    return res.status(200).json({ ok: true, id: t.id, status: 'vorschlag', datum: p.datum, zeit: p.zeit, telefon: t.telefon || null, name: t.name || '', personal: peName, link, text, mail, sms });
  }

  /* Auf neues Set ändern (seit 15.10.2026, Wimpern): Die Kundin wollte auffüllen, Kate sieht ein neues Set. Leistung, Dauer und Preis wechseln,
     Zeit und Stand bleiben. War die Zeit fürs neue Set schon eingeplant (Formular hat es erkannt, NEUSET_SATZ im Hinweis), bleibt auch die Dauer.
     Die Kundin bekommt per WhatsApp Bescheid, mit Link zu „Ihr Termin“ (absagen oder andere Zeit wählen). Danach läuft das Hin und Her wie immer, mit der neuen Dauer. */
  if (aktion === 'neuset') {
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon abgesagt oder abgelehnt.' });
    const ctx = await setupLaden(tenant), L = (ctx.setup && ctx.setup.leistungen) || [];
    const alt = L.filter((l) => istWimpern(l) && l.name && String(t.leistung || '').includes(l.name)).find((l) => neusetVon(L, l));
    if (!alt) return res.status(400).json({ ok: false, error: 'In diesem Termin steht keine Auffüll-Leistung mit passendem neuen Set.' });
    const ns = neusetVon(L, alt);
    const dauer0 = t.dauer || Math.max(5, Math.round((new Date(t.ende) - new Date(t.start)) / 60000)) || 30;
    const eingeplant = String(t.hinweis || '').includes(NEUSET_SATZ);
    const dauer = Math.min(600, Math.max(+ns.dauer || 30, eingeplant ? dauer0 : dauer0 - (+alt.dauer || 30) + (+ns.dauer || 30)));
    const ende = new Date(new Date(t.start).getTime() + dauer * 60000);
    const altHw = String(t.hinweis || '').split(' · ').filter((x) => x && !x.startsWith(NEUSET_SATZ));
    const key = t.gast_key || crypto.randomBytes(16).toString('hex');
    const upd = { leistung: String(t.leistung || '').replace(alt.name, ns.name).slice(0, 300), dauer, ende: ende.toISOString(),
      hinweis: [...altHw, 'Neues Set statt Auffüllen: ' + ns.name + (ns.preis ? ', ' + ns.preis + ' €' : '')].join(' · ').slice(0, 500), ...(t.gast_key ? {} : { gast_key: key }) };
    const { error } = await db.from('termine').update(upd).eq('id', t.id);
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: 'Für das neue Set reicht die Zeit nicht, danach ist schon ein Termin. Tippen Sie zuerst „Dauert länger?“ (die folgenden Termine rücken nach) oder schlagen Sie eine andere Zeit vor. Dann hier noch einmal.' });
    if (error) { console.error('neuset:', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    // Preis der Anfrage und „Gewünscht“ im Cockpit nachziehen
    const diff = (+ns.preis || 0) - (+alt.preis || 0);
    if (t.lead_id) {
      const { data: ld } = await db.from('leads').select('id, answers, value_est').eq('id', t.lead_id).eq('tenant_id', tenant).maybeSingle();
      if (ld) {
        const ans = ld.answers && typeof ld.answers === 'object' ? { ...ld.answers } : {};
        if (Array.isArray(ans._auswahl)) ans._auswahl = ans._auswahl.map((x) => {
          if (x && x.typ === 'leistung' && x.w === alt.name) return { ...x, w: ns.name, a: ns.name + ' · neues Set statt Auffüllen', p: +ns.preis || null };
          if (x && x.typ === 'termin' && typeof x.w === 'string') return { ...x, w: x.w.replace(alt.name, ns.name) };
          if (x && x.typ === 'wimpern') return { ...x, a: String(x.a || '').replace(/ · Voraussichtlich neues Set$/, '') + ' · Neues Set bestätigt', ns: null };
          return x;
        });
        await db.from('leads').update({ answers: ans, value_est: Math.max(0, (+ld.value_est || 0) + diff) || null }).eq('id', ld.id).then(() => {}, () => {});
      }
    }
    await kalenderNachziehen(tenant).catch(() => null);
    const { data: ein } = await db.from('einstellungen').select('funktionen').eq('tenant_id', tenant).maybeSingle().then((r) => r, () => ({ data: null }));
    const ohnePreis = !!(ein && ein.funktionen && ein.funktionen.preis_gast === false);
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Studio';
    const link = API_HOST + '/api/termine?aktion=antwort&id=' + t.id + '&k=' + (t.gast_key || key);
    const lv = await gastSprache(t);
    const vv = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann(lv, t.start), a: link, wer };
    const dT = dauer >= 60 ? Math.floor(dauer / 60) + ' Std.' + (dauer % 60 ? ' ' + (dauer % 60) + ' Min.' : '') : dauer + ' Min.';
    const text = gt(lv, 'hallo', vv) + 'nach Ihren Angaben ist bei Ihnen ein neues Set nötig: ' + ns.name + ' (' + (!ohnePreis && ns.preis ? ns.preis + ' €, ' : '') + 'ca. ' + dT + '). Ihr Termin bleibt am ' + vv.w
      + '. Passt das für Sie? Falls nicht, können Sie hier absagen oder eine andere Zeit wählen: ' + link + gt(lv, 'gruss', vv);
    await bescheidMerken(t.id, t.telefon ? text : null);
    await anfrageNachziehen(t.lead_id);
    return res.status(200).json({ ok: true, leistung: upd.leistung, dauer, bis: lokalText(ende.toISOString()).zeit, text, telefon: t.telefon || null, link, preis_neu: +ns.preis || 0 });
  }

  if (aktion === 'eigen') {
    if (!istIso(p.datum) || !istZeit(p.zeit)) return res.status(400).json({ ok: false, error: 'Bitte Datum und Uhrzeit angeben.' });
    const dauer = Math.min(600, Math.max(5, parseInt(p.dauer, 10) || 30));
    const { data: m } = await db.from('personal').select('id, name').eq('id', String(p.personal_id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!m) return res.status(400).json({ ok: false, error: 'Bitte einen Mitarbeiter wählen.' });
    const start = lokal(p.datum, p.zeit), ende = new Date(start.getTime() + dauer * 60000);
    const { data, error } = await db.from('termine').insert({
      tenant_id: tenant, personal_id: m.id, personal_name: m.name, eigen: true,
      start: start.toISOString(), ende: ende.toISOString(), dauer, status: 'fest', status_am: new Date().toISOString(),
      leistung: p.leistung ? String(p.leistung).slice(0, 300) : null,
      name: String(p.name || '').trim().slice(0, 120) || 'Eingetragen',
      telefon: p.telefon ? String(p.telefon).slice(0, 40) : null,
      nachricht: p.nachricht ? String(p.nachricht).slice(0, 1000) : null
    }).select('id').single();
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: m.name + ' hat zu dieser Zeit schon einen Termin.' });
    if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
    return res.status(200).json({ ok: true, id: data.id });
  }

  // ── Früher Schluss / spontan frei ─────────────────────────────────────
  // Sperrt einen Tag ab einer Uhrzeit (ab leer = ganzer Tag) für alle oder einen Mitarbeiter.
  // Wer in dieser Zeit schon einen Termin hat, bekommt den nächsten freien Termin bei
  // derselben Person vorgeschlagen: per Mail sofort, sonst Text für WhatsApp. Findet sich
  // in 14 Tagen nichts, bleibt der Termin stehen und die Sperre spart ihn aus.
  // Sperren sind Termine mit eigen=true und leistung='Gesperrt'. Aufheben: im Cockpit absagen.
  if (aktion === 'schluss') {
    const datum = String(p.datum || ''), ab = p.ab ? String(p.ab) : '';
    if (!istIso(datum) || (ab && !istZeit(ab))) return res.status(400).json({ ok: false, error: 'Bitte Tag und Uhrzeit angeben.' });
    const ctx = await setupLaden(tenant);
    let leute = (ctx.personal || []).filter((m) => m.aktiv !== false);
    if (p.personal_id && p.personal_id !== 'alle') leute = leute.filter((m) => m.id === p.personal_id);
    if (!leute.length) return res.status(400).json({ ok: false, error: 'Kein Mitarbeiter gefunden.' });
    const von = lokal(datum, ab || '00:00'), bis = lokal(plusTage(datum, 1), '00:00');
    if (bis.getTime() <= Date.now()) return res.status(400).json({ ok: false, error: 'Dieser Tag liegt in der Vergangenheit.' });
    const istSperre = (t) => t.eigen && t.leistung === 'Gesperrt';
    const { data: tm } = await db.from('termine').select('*').eq('tenant_id', tenant).in('personal_id', leute.map((m) => m.id))
      .in('status', ['wunsch', 'vorschlag', 'fest']).lt('start', bis.toISOString()).gt('ende', von.toISOString()).order('start');
    const betroffen = (tm || []).filter((t) => !istSperre(t));
    const belegt = [], frei = {};
    const vorschlag = async (t) => {
      const dauer = t.dauer || Math.max(5, Math.round((new Date(t.ende) - new Date(t.start)) / 60000)) || 30;
      for (let i = 1; i <= 14; i++) {
        const tag = plusTage(datum, i), k = tag + '|' + dauer;
        if (!frei[k]) frei[k] = await freieZeiten(tenant, tag, dauer, ctx).catch(() => []);
        for (const s of frei[k]) {
          if (!s.p || !s.p.includes(t.personal_id)) continue;
          const a = lokal(tag, s.z).getTime(), e = a + dauer * 60000;
          if (belegt.some((b) => b.pid === t.personal_id && a < b.e && e > b.a)) continue;
          belegt.push({ pid: t.personal_id, a, e });
          return { datum: tag, zeit: s.z, dauer };
        }
      }
      return null;
    };
    const liste = [];
    for (const t of betroffen) liste.push({ t, v: await vorschlag(t), alt: lokalText(t.start) });
    if (p.pruefen) return res.status(200).json({ ok: true, schon: (tm || []).some(istSperre), betroffen: liste.map((x) => ({ id: x.t.id, name: x.t.name || 'Ohne Namen', alt: x.alt, neu: x.v ? { datum: x.v.datum, zeit: x.v.zeit } : null, mail: !!x.t.email, sms: !!(SMS_AN && x.t.telefon), telefon: x.t.telefon || null, personal: x.t.personal_name || null })) });
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const vn = (t) => (t.name ? ' ' + String(t.name).split(/\s+/)[0] : '');
    const grund = (alt) => 'Ihr Termin am ' + spDatum('de', alt.datum) + ' um ' + alt.zeit + ' Uhr muss leider ausfallen, weil wir an diesem Tag ' + (ab ? 'früher schließen.' : 'geschlossen haben.');
    const verschoben = [], offen = [];
    for (const x of liste) {
      const t = x.t;
      const ls = await gastSprache(t);
      const v0 = { vn: vn(t), w2: gtWann(ls, t.start), wer };
      const selbst = () => offen.push({ id: t.id, name: t.name || 'Ohne Namen', alt: x.alt, telefon: t.telefon || null, text: gt(ls, 'hallo', v0) + gt(ls, ab ? 'schluss_ab' : 'schluss_tag', v0) + gt(ls, 'frage', v0) + gt(ls, 'gruss', v0) });
      // Kein freier Termin in 14 Tagen: Termin bleibt stehen, der Betrieb meldet sich selbst.
      if (!x.v) { selbst(); continue; }
      const start = lokal(x.v.datum, x.v.zeit), ende = new Date(start.getTime() + x.v.dauer * 60000);
      const key = t.gast_key || crypto.randomBytes(16).toString('hex');
      const { error } = await db.from('termine').update({ start: start.toISOString(), ende: ende.toISOString(), status: 'vorschlag', status_am: new Date().toISOString(), vorschlag_von: t.status === 'vorschlag' ? (t.vorschlag_von || t.start) : t.start, gast_key: key }).eq('id', t.id);
      if (error) { selbst(); continue; }
      await anfrageNachziehen(t.lead_id);
      const link = API_HOST + '/api/termine?aktion=antwort&id=' + t.id + '&k=' + key;
      const text = gt(ls, 'hallo', v0) + gt(ls, ab ? 'schluss_ab' : 'schluss_tag', v0) + ' ' + gt(ls, 'vorschlag', { ...v0, w: gtWann(ls, start.toISOString()), a: link }) + gt(ls, 'gruss', v0);
      let mail = false;
      if (t.email && MAIL_KEY) mail = await vorschlagMail(t, x.v.datum, x.v.zeit, x.alt, link, wer, tenant, null, grund(x.alt));
      const sms = t.telefon && SMS_AN ? await smsSenden(t.telefon, wer + ': ' + grund(x.alt) + ' Passt ' + spDatum('de', x.v.datum) + ' um ' + x.v.zeit + ' Uhr? Bitte kurz antworten: ' + link, wer) : false;
      await bescheidMerken(t.id, t.telefon && !sms ? text : null);
      verschoben.push({ id: t.id, name: t.name || 'Ohne Namen', alt: x.alt, neu: { datum: x.v.datum, zeit: x.v.zeit }, mail, sms, telefon: t.telefon || null, text });
    }
    for (const o of offen) await bescheidMerken(o.id, o.telefon ? o.text : null);
    // Sperre in die Lücken legen: um Termine ohne Vorschlag und schon bestehende Sperren herum
    const bleibt = new Set(offen.map((x) => x.id));
    let n = 0;
    for (const m of leute) {
      const weg = (tm || []).filter((t) => t.personal_id === m.id && (bleibt.has(t.id) || istSperre(t)))
        .map((t) => [Math.max(von.getTime(), new Date(t.start).getTime()), Math.min(bis.getTime(), new Date(t.ende).getTime())]).sort((a, c) => a[0] - c[0]);
      const luecken = []; let c = von.getTime();
      for (const [s, e] of weg) { if (s - c >= 5 * 60000) luecken.push([c, s]); c = Math.max(c, e); }
      if (bis.getTime() - c >= 5 * 60000) luecken.push([c, bis.getTime()]);
      for (let [s, e] of luecken) {
        while (e - s >= 5 * 60000) {
          const stueck = Math.min(e, s + 600 * 60000);
          const { error } = await db.from('termine').insert({ tenant_id: tenant, personal_id: m.id, personal_name: m.name, eigen: true,
            start: new Date(s).toISOString(), ende: new Date(stueck).toISOString(), dauer: Math.round((stueck - s) / 60000), status: 'fest', status_am: new Date().toISOString(),
            leistung: 'Gesperrt', name: ab ? 'Früher Schluss' : 'Frei' });
          if (!error) n++;
          s = stueck;
        }
      }
    }
    return res.status(200).json({ ok: true, gesperrt: n, verschoben, offen });
  }

  // ── Termin dauert länger ──────────────────────────────────────────────
  // Das Ende rückt nach hinten. Folgetermine desselben Mitarbeiters am selben
  // Tag, die dadurch überlappen würden, rücken um genau so viel nach, wie nötig.
  // Mit pruefen:true nur anzeigen, wer betroffen wäre.
  if (aktion === 'verlaengern') {
    const plus = parseInt(p.plus, 10);
    if (![15, 30, 45, 60, 90, 120].includes(plus)) return res.status(400).json({ ok: false, error: 'Bitte 15 bis 120 Minuten wählen.' });
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon abgesagt oder abgelehnt.' });
    const neuEnde = new Date(new Date(t.ende).getTime() + plus * 60000);
    const tag = lokalText(t.start).datum;
    let folg = [];
    if (t.personal_id) {
      const { data } = await db.from('termine').select('*').eq('tenant_id', tenant).eq('personal_id', t.personal_id)
        .in('status', ['wunsch', 'vorschlag', 'fest']).gte('start', t.ende).lt('start', lokal(plusTage(tag, 1), '00:00').toISOString())
        .neq('id', t.id).order('start');
      folg = data || [];
    }
    const schieben = [];
    let grenze = neuEnde;
    for (const f of folg) {
      const s = new Date(f.start);
      if (s >= grenze) break;
      const um = grenze.getTime() - s.getTime();
      schieben.push({ f, start: new Date(s.getTime() + um), ende: new Date(new Date(f.ende).getTime() + um), um: Math.round(um / 60000) });
      grenze = schieben[schieben.length - 1].ende;
    }
    const liste = schieben.map((x) => ({ id: x.f.id, name: x.f.name || 'Ohne Namen', alt: lokalText(x.f.start).zeit, neu: lokalText(x.start).zeit, um: x.um, mail: !!x.f.email, telefon: x.f.telefon || null }));
    // Warnung, wenn der letzte Termin dadurch nach Feierabend endet
    let feierabend = null;
    try {
      const cx = await setupLaden(tenant);
      const m = (cx.personal || []).find((x) => x.id === t.personal_id);
      const f = ((m && m.zeiten) || {})[new Date(tag + 'T12:00:00Z').getUTCDay()] || [];
      const zu = f.length ? f.map((x) => x[1]).sort().pop() : null;
      const letzt = lokalText((schieben.length ? schieben[schieben.length - 1].ende : neuEnde).toISOString()).zeit;
      if (zu && letzt > zu) feierabend = { zu, letzt };
    } catch (e) {}
    if (p.pruefen) return res.status(200).json({ ok: true, bis: lokalText(neuEnde).zeit, betroffen: liste, feierabend });
    // Von hinten nach vorn verschieben, sonst stößt jeder Schritt an den nächsten Termin.
    for (let i = schieben.length - 1; i >= 0; i--) {
      const x = schieben[i];
      const { error } = await db.from('termine').update({ start: x.start.toISOString(), ende: x.ende.toISOString() }).eq('id', x.f.id);
      if (error) return res.status(409).json({ ok: false, error: 'Der Termin von ' + (x.f.name || 'einem Kunden') + ' ließ sich nicht verschieben. Bitte die Liste neu laden.' });
    }
    const { error } = await db.from('termine').update({ ende: neuEnde.toISOString(), dauer: (t.dauer || 30) + plus }).eq('id', t.id);
    if (error) return res.status(409).json({ ok: false, error: 'Die Zeit danach ist schon belegt. Bitte die Liste neu laden.' });
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    for (let i = 0; i < schieben.length; i++) {
      const x = schieben[i], z = liste[i];
      const lz = await gastSprache(x.f);
      z.text = gt(lz, 'hallo', { vn: x.f.name ? ' ' + String(x.f.name).split(/\s+/)[0] : '' }) + gt(lz, 'spaeter', { z: z.neu, z2: z.alt }) + gt(lz, 'gruss', { wer });
      if (x.f.email && MAIL_KEY && x.f.status === 'fest') z.mail = await spaeterMail(x.f, z, wer, tenant);
      else z.mail = false;
      z.sms = x.f.telefon && SMS_AN && x.f.status === 'fest' ? await smsSenden(x.f.telefon, wer + ': Bei uns dauert es heute etwas länger. Ihr Termin beginnt um ' + z.neu + ' statt um ' + z.alt + ' Uhr. Danke für Ihr Verständnis!', wer) : false;
      if (['fest', 'vorschlag'].includes(x.f.status)) await bescheidMerken(x.f.id, x.f.telefon && !z.sms ? z.text : null);
    }
    return res.status(200).json({ ok: true, bis: lokalText(neuEnde).zeit, verschoben: liste });
  }

  /* Später beginnen (seit 21.10.2026, Termin-Blatt +15/+30/+60/+90): Beginn und Ende rücken um plus Minuten.
     Stößt der Termin danach an andere Termine desselben Mitarbeiters, rücken diese um genau so viel nach, wie nötig (wie verlaengern).
     pruefen:true zeigt nur, was passieren würde (Kollisionen, Feierabend, Sperre). Sperren (Früher Schluss, Frei) rücken nie mit.
     Offene Anfrage oder offener Vorschlag → wird ein Vorschlag mit neuer Zeit (Ping-Pong über „Ihr Termin“). Fester Termin bleibt fest, der Kunde bekommt Bescheid. */
  if (aktion === 'spaeter') {
    const plus = parseInt(p.plus, 10);
    if (![15, 30, 60, 90].includes(plus)) return res.status(400).json({ ok: false, error: 'Bitte 15, 30, 60 oder 90 Minuten wählen.' });
    const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!t) return res.status(404).json({ ok: false, error: 'Termin nicht gefunden.' });
    if (!['wunsch', 'vorschlag', 'fest'].includes(t.status)) return res.status(400).json({ ok: false, error: 'Dieser Termin ist schon abgesagt oder abgelehnt.' });
    const neuStart = new Date(new Date(t.start).getTime() + plus * 60000), neuEnde = new Date(new Date(t.ende).getTime() + plus * 60000);
    if (neuStart.getTime() < Date.now()) return res.status(400).json({ ok: false, error: 'Diese Uhrzeit liegt in der Vergangenheit.' });
    const tag = lokalText(t.start).datum;
    let folg = [];
    if (t.personal_id) {
      const { data } = await db.from('termine').select('*').eq('tenant_id', tenant).eq('personal_id', t.personal_id)
        .in('status', ['wunsch', 'vorschlag', 'fest']).gte('start', t.start).lt('start', lokal(plusTage(tag, 1), '00:00').toISOString())
        .neq('id', t.id).order('start');
      folg = data || [];
    }
    const schieben = [];
    // Seit 21.10.2026 (Manuels Wunsch „immer warnen“): Eine Sperre im Weg wird gemeldet. Mit sperre_auf:true wird sie
    // aufgehoben (wie „Wieder öffnen“) und der Termin trotzdem verschoben. Sperren rücken nie mit.
    let grenze = neuEnde, sperre = null; const sperrenWeg = [];
    for (const f of folg) {
      const s = new Date(f.start);
      if (s >= grenze) break;
      if (f.eigen && f.leistung === 'Gesperrt') { if (!sperre) sperre = { name: f.name || 'Gesperrt', ab: lokalText(f.start).zeit, bis: lokalText(f.ende).zeit }; sperrenWeg.push(f.id); continue; }
      const um = grenze.getTime() - s.getTime();
      schieben.push({ f, start: new Date(s.getTime() + um), ende: new Date(new Date(f.ende).getTime() + um), um: Math.round(um / 60000) });
      grenze = schieben[schieben.length - 1].ende;
    }
    const liste = schieben.map((x) => ({ id: x.f.id, name: x.f.name || 'Ohne Namen', alt: lokalText(x.f.start).zeit, neu: lokalText(x.start).zeit, um: x.um, status: x.f.status, mail: !!x.f.email, telefon: x.f.telefon || null }));
    let feierabend = null;
    try {
      const cx = await setupLaden(tenant);
      const m = (cx.personal || []).find((x) => x.id === t.personal_id);
      const f = ((m && m.zeiten) || {})[new Date(tag + 'T12:00:00Z').getUTCDay()] || [];
      const zu = f.length ? f.map((x) => x[1]).sort().pop() : null;
      const letzt = lokalText((schieben.length ? schieben[schieben.length - 1].ende : neuEnde).toISOString()).zeit;
      if (zu && letzt > zu) feierabend = { zu, letzt };
      if (m && !f.length) feierabend = { zu: 'kein Arbeitstag', letzt };
    } catch (e) {}
    const alt = lokalText(t.start).zeit, neu = lokalText(neuStart).zeit, bis = lokalText(neuEnde).zeit;
    if (p.pruefen) return res.status(200).json({ ok: true, alt, neu, bis, betroffen: liste, feierabend, sperre });
    if (sperre && p.sperre_auf !== true) return res.status(409).json({ ok: false, error: 'Ab ' + sperre.ab + ' Uhr ist gesperrt (' + sperre.name + '). Bitte noch einmal tippen und die Sperre aufheben.' });
    if (sperrenWeg.length) await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).in('id', sperrenWeg).eq('tenant_id', tenant);
    for (let i = schieben.length - 1; i >= 0; i--) {
      const x = schieben[i];
      const { error } = await db.from('termine').update({ start: x.start.toISOString(), ende: x.ende.toISOString(), erinnert_am: null }).eq('id', x.f.id);
      if (error) return res.status(409).json({ ok: false, error: 'Der Termin von ' + (x.f.name || 'einem Kunden') + ' ließ sich nicht verschieben. Bitte neu laden.' });
    }
    const gast = !(t.eigen && t.leistung === 'Gesperrt') && !!(t.telefon || t.email);
    const warFest = t.status === 'fest';
    const key = t.gast_key || crypto.randomBytes(16).toString('hex');
    const upd = { start: neuStart.toISOString(), ende: neuEnde.toISOString(), erinnert_am: null, gast_key: key };
    if (gast && !warFest) Object.assign(upd, { status: 'vorschlag', status_am: new Date().toISOString(), vorschlag_von: t.status === 'vorschlag' ? (t.vorschlag_von || t.start) : t.start, ...(/^Hat statt /.test(String(t.hinweis || '')) ? { hinweis: null } : {}) });
    const { error } = await db.from('termine').update(upd).eq('id', t.id);
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: 'Zu dieser Zeit ist schon ein Termin eingetragen. Bitte neu laden.' });
    if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
    await anfrageNachziehen(t.lead_id);
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const link = API_HOST + '/api/termine?aktion=antwort&id=' + t.id + '&k=' + key;
    const lv = await gastSprache(t);
    let text = '', mail = false, sms = false;
    if (gast) {
      if (warFest) {
        text = gt(lv, 'hallo', { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '' }) + gt(lv, 'spaeter', { z: neu, z2: alt }) + gt(lv, 'gruss', { wer });
        if (t.email && MAIL_KEY) mail = await spaeterMail(t, { neu, alt }, wer, tenant);
        if (t.telefon && SMS_AN) sms = await smsSenden(t.telefon, wer + ': Ihr Termin beginnt um ' + neu + ' statt um ' + alt + ' Uhr. Danke für Ihr Verständnis!', wer);
      } else {
        const vv = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann(lv, neuStart.toISOString()), w2: gtWann(lv, t.start), a: link, wer };
        text = gt(lv, 'hallo', vv) + gt(lv, 'voll', vv) + ' ' + gt(lv, 'vorschlag', vv) + gt(lv, 'gruss', vv);
        const grund = 'Um ' + alt + ' Uhr ist es bei uns leider schon voll.';
        if (t.email && MAIL_KEY) mail = await vorschlagMail(t, tag, neu, lokalText(t.start), link, wer, tenant, null, grund);
        if (t.telefon && SMS_AN) sms = await smsSenden(t.telefon, wer + ': ' + grund + ' Passt ' + spDatum('de', tag) + ' um ' + neu + ' Uhr? Bitte kurz antworten: ' + link, wer);
      }
      await bescheidMerken(t.id, t.telefon && !sms ? text : null);
    }
    for (let i = 0; i < schieben.length; i++) {
      const x = schieben[i], z = liste[i];
      const lz = await gastSprache(x.f);
      z.text = gt(lz, 'hallo', { vn: x.f.name ? ' ' + String(x.f.name).split(/\s+/)[0] : '' }) + gt(lz, 'spaeter', { z: z.neu, z2: z.alt }) + gt(lz, 'gruss', { wer });
      z.mail = x.f.email && MAIL_KEY && x.f.status === 'fest' ? await spaeterMail(x.f, z, wer, tenant) : false;
      z.sms = x.f.telefon && SMS_AN && x.f.status === 'fest' ? await smsSenden(x.f.telefon, wer + ': Ihr Termin beginnt um ' + z.neu + ' statt um ' + z.alt + ' Uhr. Danke für Ihr Verständnis!', wer) : false;
      if (['fest', 'vorschlag'].includes(x.f.status)) await bescheidMerken(x.f.id, x.f.telefon && !z.sms ? z.text : null);
    }
    return res.status(200).json({ ok: true, alt, neu, bis, status: upd.status || t.status, link: gast ? link : '', text, mail, sms, telefon: t.telefon || null, verschoben: liste });
  }

  // ── Notiz am Kunden ────────────────────────────────────────────────────
  if (aktion === 'notiz') {
    const keys = notizSchluessel(p.email, p.telefon);
    if (!keys.length) return res.status(400).json({ ok: false, error: 'Ohne E-Mail oder Telefonnummer lässt sich der Kunde nicht wiedererkennen.' });
    const notiz = String(p.notiz || '').trim().slice(0, 300);
    const plus = Math.min(240, Math.max(0, Math.round((parseInt(p.plus, 10) || 0) / 5) * 5));
    if (!notiz && !plus) {
      // Zähler „nicht erschienen“ bleibt erhalten
      const { error: de } = await db.from('kunden_notiz').delete().eq('tenant_id', tenant).in('schluessel', keys).eq('nicht_da', 0);
      if (de) await db.from('kunden_notiz').delete().eq('tenant_id', tenant).in('schluessel', keys);   // ohne sql/52
      else await db.from('kunden_notiz').update({ notiz: '', plus_min: 0 }).eq('tenant_id', tenant).in('schluessel', keys);
      return res.status(200).json({ ok: true, notiz: '', plus: 0 });
    }
    const { error } = await db.from('kunden_notiz').upsert(keys.map((k) => ({ tenant_id: tenant, schluessel: k, notiz, plus_min: plus, updated_at: new Date().toISOString() })));
    if (error) { console.error('kunden_notiz (sql/47?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    return res.status(200).json({ ok: true, notiz, plus });
  }

  // ── Beratungsanfrage: Betrieb hat sich die Fotos angesehen und schlägt Zeit und Dauer vor ──
  if (aktion === 'beratung') {
    if (!istIso(p.datum) || !istZeit(p.zeit)) return res.status(400).json({ ok: false, error: 'Bitte Tag und Uhrzeit angeben.' });
    const ld = await meineAnfrage(String(p.lead || ''), user);
    if (!ld) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden.' });
    const dauer = Math.min(600, Math.max(15, Math.round((parseInt(p.dauer, 10) || 60) / 5) * 5));
    const { data: m } = await db.from('personal').select('id, name').eq('id', String(p.personal_id || '')).eq('tenant_id', tenant).maybeSingle();
    if (!m) return res.status(400).json({ ok: false, error: 'Bitte einen Mitarbeiter wählen.' });
    const start = lokal(p.datum, p.zeit), ende = new Date(start.getTime() + dauer * 60000);
    if (start.getTime() < Date.now()) return res.status(400).json({ ok: false, error: 'Diese Uhrzeit liegt in der Vergangenheit.' });
    const key = crypto.randomBytes(16).toString('hex');
    const b0 = (ld.beratung && ld.beratung[0]) || {};
    const zeile = {
      tenant_id: tenant, widget_id: ld.widget_id || null, lead_id: ld.id, person_nr: 1,
      personal_id: m.id, personal_name: m.name, start: start.toISOString(), ende: ende.toISOString(), dauer,
      leistung: String(p.leistung || b0.leistung || '').slice(0, 300) || null, status: 'vorschlag', status_am: new Date().toISOString(), gast_key: key,
      name: ld.name || null, telefon: ld.phone || null, email: ld.email || null, hinweis: 'Nach Beratung'
    };
    let { data: neu, error } = await db.from('termine').insert(zeile).select('*').single();
    if (error && error.code === '42703') { delete zeile.hinweis; ({ data: neu, error } = await db.from('termine').insert(zeile).select('*').single()); }
    if (error && error.code === '23P01') return res.status(409).json({ ok: false, error: m.name + ' hat zu dieser Zeit schon einen Termin.' });
    if (error) { console.error('beratung:', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    await db.from('leads').update({ termin: p.datum, status: ld.status === 'neu' || !ld.status ? 'angerufen' : ld.status, status_am: new Date().toISOString() }).eq('id', ld.id).then(() => {}, () => {});
    const link = API_HOST + '/api/termine?aktion=antwort&id=' + neu.id + '&k=' + key;
    const { data: b } = await db.from('tenants').select('name').eq('id', tenant).maybeSingle();
    const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
    const dauerText = dauer >= 60 ? (dauer % 60 ? Math.floor(dauer / 60) + ' Std. ' + (dauer % 60) + ' Min.' : (dauer / 60) + ' Std.') : dauer + ' Min.';
    const text = 'Guten Tag' + (ld.name ? ' ' + String(ld.name).split(/\s+/)[0] : '') + ', danke für Ihre Anfrage' + (zeile.leistung ? ' (' + zeile.leistung + ')' : '') + '. Wir planen etwa ' + dauerText + ' ein. '
      + 'Passt Ihnen ' + spDatum('de', p.datum) + ' um ' + p.zeit + ' Uhr? Kurz bestätigen: ' + link + '&ja=1 – Passt nicht: ' + link + '&ja=0 – Viele Grüße, ' + wer;
    let mail = false;
    if (ld.email && MAIL_KEY) mail = await vorschlagMail(neu, p.datum, p.zeit, null, link, wer, tenant, dauerText);
    let sms = false;
    if (ld.phone && SMS_AN) sms = await smsSenden(ld.phone, wer + ': Danke für Ihre Anfrage. Wir planen etwa ' + dauerText + ' ein. Passt ' + spDatum('de', p.datum) + ' um ' + p.zeit + ' Uhr? Bitte kurz antworten: ' + link, wer);
    await bescheidMerken(neu.id, ld.phone && !sms ? text : null);
    return res.status(200).json({ ok: true, id: neu.id, link, text, mail, sms, telefon: ld.phone || null });
  }

  return res.status(400).json({ ok: false, error: 'Unbekannte Aktion.' });
}

// Zuschlag in Minuten für [mittel, lang, sehr dick]; nur wenn wenigstens einer > 0
function inhaltFelder(l) {
  const r = leistungSauber(l), x = {};
  ['kat', 'haar', 'farbe', 'waschen', 'ab', 'info', 'wimpern', 'neuset'].forEach((k) => { if (r[k] != null) x[k] = r[k]; });
  return x;
}
function zuschlagPruefen(z) {
  if (!Array.isArray(z)) return undefined;
  const r = [0, 1, 2].map((i) => Math.min(240, Math.max(0, Math.round((+z[i] || 0) / 5) * 5)));
  return r.some((x) => x > 0) ? r : undefined;
}

async function spaeterMail(t, z, wer, tenant) {
  const { data: e } = await db.from('einstellungen').select('telefon, antwort_an, mail_haupt').eq('tenant_id', tenant).maybeSingle();
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:26px 28px">
<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a9741d">Etwas später</div>
<div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px">Neuer Beginn: ${esc(z.neu)} Uhr</div>
<p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">Bei ${esc(wer)} dauert es heute etwas länger. Ihr Termin beginnt deshalb um ${esc(z.neu)} Uhr statt um ${esc(z.alt)} Uhr. Danke für Ihr Verständnis!</p>
${e && e.telefon ? `<p style="color:#5f584a;font-size:14px;margin:16px 0 0">Passt es nicht mehr? Rufen Sie kurz an: ${esc(e.telefon)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [t.email], reply_to: (e && (e.antwort_an || e.mail_haupt)) || undefined, subject: 'Ihr Termin beginnt um ' + z.neu + ' Uhr · ' + wer, html })
    });
    return r.ok;
  } catch { return false; }
}

// Name der Leistung in anderen Sprachen: nur { de|en|sq|fr|it|es|tr: { name } }, sonst nichts
function trName(tr) {
  const raus = {};
  if (tr && typeof tr === 'object') for (const s of ['de', 'en', 'sq', 'fr', 'it', 'es', 'tr']) {
    const n = tr[s] && String(tr[s].name || '').trim().slice(0, 80);
    if (n) raus[s] = { name: n };
  }
  return Object.keys(raus).length ? raus : undefined;
}

function zeitenPruefen(z) {
  const raus = {};
  const quelle = (z && typeof z === 'object') ? z : zeitenVon(null);
  for (let d = 0; d <= 6; d++) {
    const r = (Array.isArray(quelle[d]) ? quelle[d] : []).filter((x) =>
      Array.isArray(x) && istZeit(x[0]) && istZeit(x[1]) && minuten(x[0]) < minuten(x[1])).slice(0, 3);
    if (r.length) raus[d] = r.map((x) => [x[0], x[1]]);
  }
  return raus;
}

// Bestätigung, Absage oder „nicht möglich“ an den Kunden. Seit 15.10.2026 in der clickzauber-Gestaltung
// (Skizze: NICHT-HOCHLADEN/skizzen-und-vorschlaege/Mails-und-Hauptaktion-Kate.html): Absendername = Betrieb, oben Logo und Adresse,
// Karte mit Wann, Was, Bei, Preis (nur wenn preis_gast nicht aus ist), ein grüner Knopf (bestätigt: Kalender, sonst neuen Termin wählen),
// darunter leise „Termin ändern“ und Anrufen. Tabellen statt Raster, damit Outlook und Gmail es gleich zeigen.
const MW = {
  de: { wann: 'Wann', was: 'Was', bei: 'Bei', preis: 'Preis', kal: 'In meinen Kalender eintragen', dazw: 'Etwas dazwischengekommen?', aendern: 'Termin ändern', anrufen: 'Anrufen', neu: 'Neuen Termin wählen', ca: 'ca. ' },
  en: { wann: 'When', was: 'What', bei: 'With', preis: 'Price', kal: 'Add to my calendar', dazw: 'Something came up?', aendern: 'Change appointment', anrufen: 'Call', neu: 'Choose a new time', ca: 'approx. ' },
  sq: { wann: 'Kur', was: 'Çfarë', bei: 'Te', preis: 'Çmimi', kal: 'Shto në kalendar', dazw: 'Ju doli diçka?', aendern: 'Ndrysho terminin', anrufen: 'Telefono', neu: 'Zgjidh një termin të ri', ca: 'rreth ' },
  fr: { wann: 'Quand', was: 'Quoi', bei: 'Avec', preis: 'Prix', kal: 'Ajouter à mon agenda', dazw: 'Un empêchement ?', aendern: 'Modifier le rendez-vous', anrufen: 'Appeler', neu: 'Choisir un autre créneau', ca: 'env. ' },
  it: { wann: 'Quando', was: 'Cosa', bei: 'Con', preis: 'Prezzo', kal: 'Aggiungi al calendario', dazw: 'Un imprevisto?', aendern: 'Modifica appuntamento', anrufen: 'Chiama', neu: 'Scegli un altro orario', ca: 'ca. ' },
  es: { wann: 'Cuándo', was: 'Qué', bei: 'Con', preis: 'Precio', kal: 'Añadir a mi calendario', dazw: '¿Le ha surgido algo?', aendern: 'Cambiar la cita', anrufen: 'Llamar', neu: 'Elegir otra hora', ca: 'aprox. ' },
  tr: { wann: 'Ne zaman', was: 'Hizmet', bei: 'Kiminle', preis: 'Fiyat', kal: 'Takvimime ekle', dazw: 'Bir şey mi çıktı?', aendern: 'Randevuyu değiştir', anrufen: 'Ara', neu: 'Yeni saat seç', ca: 'yakl. ' }
};
const escA = (x) => esc(x).replace(/"/g, '&quot;');
async function betriebAdresse(tenant) {
  try {
    const { data } = await db.from('users').select('strasse, plz_ort').eq('tenant_id', tenant).order('created_at').limit(1);
    const u = data && data[0];
    return u ? [u.strasse, u.plz_ort].filter(Boolean).join(', ') : '';
  } catch (e) { return ''; }
}
function icsLink(t) { return t && t.gast_key ? API_HOST + '/api/termine?aktion=ics&id=' + encodeURIComponent(t.id) + '&k=' + t.gast_key : ''; }
// Die Mail darf das Annehmen oder Absagen nie aufhalten: jeder Fehler hier ergibt nur „keine Mail“.
async function bescheidMail(t, status, tenant) {
  try { return await bescheidMailBauen(t, status, tenant); } catch (err) { console.error('bescheidMail', err && err.message); return false; }
}
async function bescheidMailBauen(t, status, tenant) {
  if (!MAIL_KEY) return false;
  const [{ data: b }, { data: e }, logo, adresse] = await Promise.all([
    db.from('tenants').select('name').eq('id', tenant).maybeSingle(),
    db.from('einstellungen').select('telefon, antwort_an, mail_haupt, funktionen').eq('tenant_id', tenant).maybeSingle().then((r) => (r.error ? db.from('einstellungen').select('telefon, antwort_an, mail_haupt').eq('tenant_id', tenant).maybeSingle() : r)),
    betriebLogo(tenant), betriebAdresse(tenant)
  ]);
  // Sprache und Richtwert aus der Anfrage des Gastes
  let l = 'de', wert = null;
  if (t.lead_id) {
    const { data: ld } = await db.from('leads').select('sprache, value_est').eq('id', t.lead_id).maybeSingle().then((r) => r, () => ({}));
    l = sprache(ld && ld.sprache); wert = ld && +ld.value_est > 0 ? +ld.value_est : null;
  }
  const X = T(l), W = MW[l] || MW.en;
  const name = (b && b.name && !/@/.test(b.name)) ? b.name : '';
  const wer = name || X.ihr_termin;
  const { datum, zeit } = lokalText(t.start);
  const bis = t.ende ? lokalText(t.ende).zeit : '';
  const wann = X.t_wann(spDatum(l, datum), zeit);
  const ja = status === 'fest', weg = status === 'abgesagt';
  const lk = ja ? antwortLink(t) : '', fl = !ja ? formLink(t) : '', kal = ja ? icsLink(t) : '';
  const preisAn = !(e && e.funktionen && e.funktionen.preis_gast === false);
  const preis = ja && wert && preisAn ? W.ca + spEur(l, Math.round(wert * 100) / 100) : '';
  const tel = (e && e.telefon) || '';
  const telHref = tel ? 'tel:' + String(tel).replace(/[^+\d]/g, '') : '';
  const F = 'font-family:Figtree,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif';
  const zeile = (k, v) => v ? '<tr><td style="padding:6px 16px 6px 0;color:#7a7266;font-size:15px;vertical-align:top;white-space:nowrap">' + esc(k) + '</td><td style="padding:6px 0;color:#241f19;font-size:15px;font-weight:600">' + esc(v) + '</td></tr>' : '';
  const kopfBild = logo && logo.u
    ? (logo.grund ? '<div style="background:' + logo.grund + ';border-radius:8px;padding:5px 8px">' : '<div>') + '<img src="' + escA(logo.u) + '" height="' + (logo.grund ? 34 : 44) + '" alt="" style="display:block;height:' + (logo.grund ? 34 : 44) + 'px;width:auto;max-width:160px;border:0"></div>'
    : '<div style="width:44px;height:44px;border-radius:50%;background:#241f19;color:#fffdf8;font-size:17px;font-weight:700;line-height:44px;text-align:center">' + esc(String(wer).trim().charAt(0).toUpperCase() || 'C') + '</div>';
  const knopf = (href, text) => '<tr><td style="padding:20px 0 0"><a href="' + escA(href) + '" style="display:block;background:#2f7d59;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;text-align:center;padding:14px 18px;border-radius:12px">' + esc(text) + '</a></td></tr>';
  const leise = ja && (lk || telHref)
    ? '<tr><td style="padding:14px 0 0;text-align:center;font-size:14px;color:#7a7266">' + esc(W.dazw) + ' '
      + [lk ? '<a href="' + escA(lk) + '" style="color:#5c544a">' + esc(W.aendern) + '</a>' : '', telHref ? '<a href="' + escA(telHref) + '" style="color:#5c544a">' + esc(W.anrufen) + '</a>' : ''].filter(Boolean).join(' · ') + '</td></tr>'
    : (!ja && tel ? '<tr><td style="padding:14px 0 0;text-align:center;font-size:14px;color:#7a7266">' + esc(X.telefon) + ': <a href="' + escA(telHref) + '" style="color:#5c544a">' + esc(tel) + '</a></td></tr>' : '');
  const html = `<!DOCTYPE html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f5f2ea;${F};color:#241f19">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ea"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fffdf8;border:1px solid #e6dfd2;border-radius:14px">
<tr><td style="padding:16px 22px;border-bottom:1px solid #ece6da"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;vertical-align:middle">${kopfBild}</td>
<td style="vertical-align:middle"><div style="font-size:16px;font-weight:700;color:#241f19">${esc(wer)}</div>${adresse ? '<div style="font-size:13px;color:#7a7266;margin-top:1px">' + esc(adresse) + '</div>' : ''}</td>
</tr></table></td></tr>
<tr><td style="padding:22px 22px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td><span style="display:inline-block;background:${ja ? '#e3efe8' : '#f6e7e2'};color:${ja ? '#255f45' : '#8e3a27'};font-size:13px;font-weight:600;border-radius:20px;padding:4px 12px">${ja ? '✓ ' : ''}${esc(ja ? X.t_ja : weg ? 'Termin abgesagt' : X.t_nein)}</span></td></tr>
<tr><td style="padding:14px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#241f19">${esc(wann)}</td></tr>
<tr><td style="padding:8px 0 0;font-size:15px;line-height:1.6;color:#5c544a">${ja ? esc(X.t_ja_text('', '')) : weg ? 'Ihr Termin muss leider ausfallen. Bitte melden Sie sich für einen neuen Termin.' : esc(X.t_nein_text)}</td></tr>
${ja ? '<tr><td style="padding:16px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece6da;padding-top:8px">'
    + zeile(W.wann, spDatum(l, datum) + ' · ' + zeit + (bis ? '–' + bis : '')) + zeile(W.was, t.leistung || '') + zeile(W.bei, t.personal_name || '') + zeile(W.preis, preis) + '</table></td></tr>' : ''}
${kal ? knopf(kal, W.kal) : fl ? knopf(fl, W.neu) : ''}
${leise}
</table></td></tr></table>
<p style="max-width:540px;margin:14px auto 0;font-size:12px;color:#9a9284;text-align:center"><a href="https://clickzauber.de" style="color:#9a9284;text-decoration:none">Erstellt mit clickzauber</a></p>
</td></tr></table></body></html>`;
  const adr = String(MAIL_FROM).replace(/^.*<|>.*$/g, '');
  const von = name ? '"' + name.replace(/["<>\r\n]/g, '').slice(0, 60) + '" <' + adr + '>' : MAIL_FROM;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: von, to: [t.email], reply_to: (e && (e.antwort_an || e.mail_haupt)) || undefined, subject: (ja ? X.t_ja_betreff : weg ? 'Termin abgesagt: ' : X.t_nein_betreff) + wann + ' · ' + wer, html })
    });
    return r.ok;
  } catch { return false; }
}
// Kalender-Eintrag für den Kunden (Knopf in der Bestätigung). Nur mit Schlüssel, nur für feste Termine.
async function gastKalender(req, res, p) {
  const id = String(p.id || ''), k = String(p.k || '');
  const { data: t } = /^[0-9a-f-]{8,64}$/i.test(id) ? await db.from('termine').select('*').eq('id', id).maybeSingle() : { data: null };
  if (!t || !t.gast_key || k !== t.gast_key || t.status !== 'fest') { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(404).send('Dieser Termin ist nicht mehr gültig.'); }
  const [{ data: b }, adresse] = await Promise.all([db.from('tenants').select('name').eq('id', t.tenant_id).maybeSingle(), betriebAdresse(t.tenant_id)]);
  const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Termin';
  const z = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const tx = (x) => String(x || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const ende = t.ende || new Date(new Date(t.start).getTime() + (t.dauer || 30) * 60000).toISOString();
  const titel = (t.leistung ? t.leistung + ' · ' : '') + wer;
  const info = [t.personal_name ? 'Bei ' + t.personal_name : '', 'Termin ändern: ' + antwortLink(t)].filter(Boolean).join('\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//clickzauber//Termin//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + t.id + '@clickzauber.de', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(t.start), 'DTEND:' + z(ende),
    'SUMMARY:' + tx(titel), 'DESCRIPTION:' + tx(info), adresse ? 'LOCATION:' + tx(adresse) : '',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + tx(titel), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="termin.ics"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(ics);
}
// Links und Texte an den Kunden. Dieselben Sätze baut das Cockpit für WhatsApp.
function formLink(t) { return t && t.widget_id ? API_HOST + '/share.html?w=' + encodeURIComponent(t.widget_id) : ''; }
function antwortLink(t) { return t && t.gast_key ? API_HOST + '/api/termine?aktion=antwort&id=' + encodeURIComponent(t.id) + '&k=' + t.gast_key : ''; }
function gastText(art, t, wer, l, extra) {
  const v = { vn: t.name ? ' ' + String(t.name).split(/\s+/)[0] : '', w: gtWann(l, t.start), f: formLink(t), a: antwortLink(t), wer, ...(extra || {}) };
  const neuW = v.f ? gt(l, 'frei', v) : gt(l, 'frage', v);
  const s = {
    fest: gt(l, 'fest', v) + (v.a ? gt(l, 'fest_ab', v) : ''),
    abgelehnt: gt(l, 'abgelehnt', v) + neuW,
    zurueck: gt(l, 'zurueck', v) + neuW,
    abgesagt: gt(l, 'abgesagt', v) + (v.f ? gt(l, 'neu_hier', v) : gt(l, 'frage', v)),
    umbuch_nein: gt(l, 'umbuch_nein', v) + (v.a ? gt(l, 'umb_neu', v) : neuW), // seit 21.10.2026 immer mit Link für eine neue Zeit
    erinnerung: gt(l, 'erinnerung', v) + (v.a ? gt(l, 'erinn_ab', v) : '')
  }[art] || '';
  return gt(l, 'hallo', v) + s + (wer ? gt(l, 'gruss', v) : '');
}
async function gastSprache(t) {
  if (!t || !t.lead_id) return 'de';
  try { const { data } = await db.from('leads').select('sprache').eq('id', t.lead_id).maybeSingle(); return sprache(data && data.sprache); } catch { return 'de'; }
}
// Termine, die nach einer Änderung an Mitarbeitern oder Arbeitszeiten nicht mehr passen
async function personalKonflikte(tenant, ctx) {
  const { data } = await db.from('termine').select('*').eq('tenant_id', tenant).in('status', ['wunsch', 'vorschlag', 'fest'])
    .gte('start', new Date().toISOString()).lt('start', new Date(Date.now() + 200 * 864e5).toISOString()).order('start').limit(1000);
  const raus = [];
  for (const t of data || []) {
    if (!t.personal_id || (t.eigen && t.leistung === 'Gesperrt')) continue;
    const m = (ctx.personal || []).find((x) => x.id === t.personal_id);
    const a = lokalText(t.start), e = lokalText(t.ende);
    let grund = '';
    if (!m) grund = 'Mitarbeiter entfernt';
    else if (m.aktiv === false) grund = m.name + ' ist ausgeblendet';
    else {
      const z = m.zeiten || {};
      if (Object.keys(z).some((k) => Array.isArray(z[k]) && z[k].length)) {
        const f = z[new Date(a.datum + 'T12:00:00Z').getUTCDay()] || [];
        const st = minuten(a.zeit), en = e.datum === a.datum ? minuten(e.zeit) : 1440;
        if (!f.some((w) => st >= minuten(w[0]) && en <= minuten(w[1]))) grund = 'außerhalb der Arbeitszeit von ' + m.name;
      }
    }
    if (grund) raus.push({ ...t, ...a, bis_zeit: e.zeit, grund });
    if (raus.length >= 50) break;
  }
  return raus;
}

// Merkt sich den WhatsApp-Text, bis der Betrieb „gesendet“ bestätigt (ohne sql/50: still).
async function bescheidMerken(id, text) {
  await db.from('termine').update({ bescheid: text || null, erinnert_am: null }).eq('id', id).then(() => {}, () => {});
}

async function betriebKurz(tenant) {
  const [{ data: b }, { data: e }] = await Promise.all([
    db.from('tenants').select('name').eq('id', tenant).maybeSingle(),
    db.from('einstellungen').select('telefon').eq('id', tenant).maybeSingle().then((r) => (r && r.data ? r : db.from('einstellungen').select('telefon').eq('tenant_id', tenant).maybeSingle()), () => ({ data: null }))
  ]);
  const wer = (b && b.name && !/@/.test(b.name)) ? b.name : 'Ihr Salon';
  return { wer, tel: (e && e.telefon) || '' };
}
// Logo des Betriebs für Kunden-Seite und Mail: aus dem neuesten veröffentlichten Formular (wie public/w.js: cfg.logo oder theme.logo).
// grund: Ist das Formular dunkel (Design ohne „hell“ in public/w.js SKINS, oder eigene dunkle Fläche), ist das Logo meist hell
// und braucht einen dunklen Hintergrund, sonst verschwindet es auf Weiß (z. B. Barber by Becks, logo-weiss.png).
const DUNKLE_SKINS = ['glass-sunset', 'glass-blue', 'glass-garden', 'glass-gold', 'glass-blush', 'glass-lake', 'glass-minimal', 'dunkel-minimal', 'concierge', 'terminal', 'glass'];
function istDunkelFarbe(h) {
  const m = String(h || '').match(/^#?([0-9a-f]{6})$/i); if (!m) return false;
  const n = parseInt(m[1], 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 140;
}
async function betriebLogo(tenant) {
  try {
    const { data: ws } = await db.from('widgets').select('slug').eq('tenant_id', tenant).order('created_at', { ascending: true }).limit(3);
    for (const w of ws || []) {
      const { data: v } = await db.from('widget_versions').select('config_json').eq('widget_id', w.slug).not('published_at', 'is', null).order('version', { ascending: false }).limit(1).maybeSingle();
      const c = (v && v.config_json) || {}, th = c.theme || {}, u = String(c.logo || th.logo || '');
      let url = '';
      if (/^https:\/\//.test(u)) url = u;
      else if (u && !/^(data:|javascript:)/i.test(u)) url = 'https://clickzauber.de/' + u.replace(/^\/+/, '');
      if (!url) continue;
      const ei = th.eigen || c.eigen || null;
      const dunkel = ei ? (!!ei.bild || istDunkelFarbe(ei.flaeche)) : DUNKLE_SKINS.includes(String(th.skin || c.skin || ''));
      return { u: url, grund: dunkel ? (ei && istDunkelFarbe(ei.flaeche) ? ei.flaeche : '#1c1a16') : '' };
    }
  } catch (e) {}
  return null;
}
function smsWann(iso) { const { datum, zeit } = lokalText(iso); return spDatum('de', datum) + ' um ' + zeit + ' Uhr'; }
function smsMelden(k) { return k.tel ? ' Für eine andere Zeit rufen Sie gern an: ' + k.tel : ' Für eine andere Zeit melden Sie sich gern bei uns.'; }

// Seit 15.10.2026 auch " maskiert: esc steht hier oft in Attributen (src="…", href="…", value="…").
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Der Kunde öffnet den Link aus WhatsApp oder Mail. GET zeigt nur eine Seite mit Knöpfen,
// erst ein Tipp (POST) ändert etwas. So lösen Link-Vorschauen und Mail-Scanner nichts aus.
//   Vorschlag offen → „Ja, passt“ / „Passt nicht“. Bei „Passt nicht“ wählt der Kunde gleich eine
//                     andere freie Zeit; sie kommt als Terminwunsch zurück ins Cockpit.
//   Termin fest     → „Andere Zeit wählen“ (Umbuchung, der Betrieb bestätigt) oder „Termin absagen“.
//                     Kurz vor Beginn (Frist: Leistungen & Regeln) nur noch Anrufen oder WhatsApp.
// Umbuchung: neuer Termin als Anfrage mit ersetzt = alter Termin. Der alte bleibt fest, bis der
// Betrieb annimmt. Freie Zeiten zählen den eigenen Termin nicht als belegt (14:00 → 14:30 geht).
async function gastAntwort(req, res, p, post) {
  let wer = 'clickzauber', l = 'de', tel = '', logo = '', logoGrund = '';
  const T_ = (k, v) => gt(l, k, Object.assign({ wer }, v || {}));
  // Seit 15.10.2026 in der Gestaltung von clickzauber (css/cz-basis.css): Figtree, #f5f2ea, Grün #2f7d59, Logo des Betriebs oben.
  const seite = (titel, satz, gut, extra) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const kopf = wer && wer !== 'clickzauber' && wer !== 'Ihr Salon'
      ? '<div style="display:flex;align-items:center;gap:12px;padding:0 4px 14px">' + (logo
        ? '<img src="' + esc(logo) + '" alt="" style="display:block;height:44px;width:auto;max-width:160px;object-fit:contain;border-radius:8px' + (logoGrund ? ';background:' + logoGrund + ';padding:5px 8px;box-sizing:content-box;height:34px' : '') + '">'
        : '<span style="width:44px;height:44px;border-radius:50%;background:#241f19;color:#fffdf8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px">' + esc(String(wer).trim().charAt(0).toUpperCase()) + '</span>')
        + '<b style="font-size:16px;font-weight:600">' + esc(wer) + '</b></div>'
      : '';
    return res.status(200).send('<!DOCTYPE html><html lang="' + l + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#f5f2ea"><title>' + esc(titel) + '</title>'
      + '<link rel="preconnect" href="https://fonts.bunny.net"><link rel="stylesheet" href="https://fonts.bunny.net/css2?family=Figtree:wght@400;500;600;700&display=swap"></head>'
      + '<body style="margin:0;background:#f5f2ea;font-family:Figtree,system-ui,-apple-system,Segoe UI,sans-serif;color:#241f19;-webkit-font-smoothing:antialiased"><div style="max-width:480px;margin:0 auto;padding:6vh 16px 32px">' + kopf
      + '<main style="padding:24px 22px;background:#fffdf8;border:1px solid rgba(36,31,25,.1);border-radius:14px">'
      + '<h1 style="font-size:22px;line-height:1.25;font-weight:700;margin:0 0 10px">' + esc(titel) + '</h1>' + (satz ? '<p style="font-size:16px;line-height:1.6;color:rgba(36,31,25,.68);margin:0">' + esc(satz) + '</p>' : '')
      + (extra ? '<div style="display:flex;flex-direction:column;gap:10px;margin-top:20px">' + extra + '</div>' : '') + '</main>'
      + '<p style="text-align:center;font-size:12px;color:rgba(36,31,25,.5);margin:18px 0 0"><a href="https://clickzauber.de" style="color:inherit;text-decoration:none">Erstellt mit clickzauber</a></p></div></body></html>');
  };
  const { data: t } = await db.from('termine').select('*').eq('id', String(p.id || '')).maybeSingle();
  if (!t || !t.gast_key || String(p.k || '') !== t.gast_key) return seite(T_('p_ungueltig'), T_('p_ungueltig_s'), false);
  // Umbuchung angenommen: Der alte Termin ist abgesagt, der Kunde hat aber einen neuen (ersetzt = alter Termin, auch über
  // mehrere Umbuchungen). Der alte Link zeigt dann den neuen Termin statt „Nicht mehr offen“. Ein Tipp auf einer alten
  // Seite ändert dabei nichts: 303 macht aus dem POST ein GET auf den neuen Link.
  const AKTIV = ['fest', 'wunsch', 'vorschlag'];
  if (!AKTIV.includes(t.status)) {
    let n = t;
    for (let i = 0; i < 6; i++) {
      const { data: nf } = await db.from('termine').select('*').eq('ersetzt', n.id).order('status_am', { ascending: false, nullsFirst: false }).limit(10).then((r) => r, () => ({ data: null }));
      const nx = (nf || []).find((x) => AKTIV.includes(x.status)) || (nf || [])[0];
      if (!nx) break;
      n = nx;
      if (AKTIV.includes(n.status)) break;
    }
    if (n !== t && AKTIV.includes(n.status) && n.gast_key) {
      res.statusCode = 303; res.setHeader('Location', antwortLink(n)); res.setHeader('Cache-Control', 'no-store'); return res.end();
    }
  }
  l = await gastSprache(t);
  try { const [k, lg] = await Promise.all([betriebKurz(t.tenant_id), betriebLogo(t.tenant_id)]); wer = k.wer; tel = k.tel || ''; logo = (lg && lg.u) || ''; logoGrund = (lg && lg.grund) || ''; } catch (e) {}
  const ziel = antwortLink(t), form = formLink(t);
  const stil = (farbe) => 'display:block;box-sizing:border-box;width:100%;min-height:56px;padding:16px;border-radius:12px;font-size:17px;font-weight:600;font-family:inherit;cursor:pointer;text-align:center;text-decoration:none;line-height:1.3;' + (farbe ? 'border:0;background:' + farbe + ';color:#fff' : 'border:1px solid rgba(36,31,25,.18);background:#fffdf8;color:#241f19');
  // vs = Beginn, den der Kunde auf dieser Seite gesehen hat. Hat sich der Termin seitdem geändert (neuer Vorschlag, verschoben),
  // wird nichts bestätigt oder gestrichen, sondern zuerst der aktuelle Stand gezeigt (veraltet).
  const knopf = (name, wert, txt, farbe) => '<form method="post" action="' + esc(ziel) + '" style="margin:0"><input type="hidden" name="vs" value="' + new Date(t.start).getTime() + '"><input type="hidden" name="' + name + '" value="' + esc(wert) + '"><button type="submit" style="' + stil(farbe) + '">' + esc(txt) + '</button></form>';
  const link = (href, txt, farbe) => '<a href="' + esc(href) + '" style="' + stil(farbe) + '">' + esc(txt) + '</a>';
  const neuWahl = form ? link(form, T_('p_neu'), '#2f7d59') : '';
  const { datum } = lokalText(t.start);
  const wann = gtWann(l, t.start), wannDe = gtWann('de', t.start);
  const was = [t.leistung, t.personal_name ? t.personal_name : ''].filter(Boolean).join(' · ');
  const jetzt = Date.now(), beginn = new Date(t.start).getTime(), zukunft = beginn > jetzt;
  const veraltet = !!(post && p.vs && String(p.vs) !== String(beginn));
  const cockpit = 'clickzauber-cockpit-live.html' + (t.lead_id ? '#anfrage-' + t.lead_id : '#zeiten');
  const ctx = await setupLaden(t.tenant_id);
  const dauer = t.dauer || Math.max(5, Math.round((new Date(t.ende) - new Date(t.start)) / 60000)) || 30;
  const frei = async (tag) => (await freieZeiten(t.tenant_id, tag, dauer, { ...ctx, ohne: [t.id] }).catch(() => [])).filter((x) => !t.personal_id || (x.p || []).includes(t.personal_id)).map((x) => x.z);
  const tageListe = async () => {
    const out = []; let tag = heuteBerlin();
    for (let i = 0; i < 28 && out.length < 6; i++, tag = plusTage(tag, 1)) { const zs = (await frei(tag)).filter((z) => lokal(tag, z).getTime() !== beginn).slice(0, 12); if (zs.length) out.push({ tag, zs }); }
    return out;
  };
  const zeitenHTML = (tage) => tage.map((d) => '<div style="margin-top:8px;font-weight:600;font-size:15px">' + esc(spDatum(l, d.tag)) + '</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'
    + d.zs.map((z) => '<form method="post" action="' + esc(ziel) + '" style="margin:0"><input type="hidden" name="neu" value="' + d.tag + 'T' + z + '"><button type="submit" style="width:100%;min-height:48px;border-radius:10px;border:1px solid rgba(36,31,25,.18);background:#fffdf8;color:#241f19;font-size:16px;font-family:inherit;cursor:pointer">' + z + '</button></form>').join('') + '</div>').join('');
  const neuPruefen = async () => {
    const m = String(p.neu || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
    if (!m || !(await frei(m[1])).includes(m[2])) return null;
    const start = lokal(m[1], m[2]); return { start, ende: new Date(start.getTime() + dauer * 60000) };
  };
  const telKnoepfe = () => { const n = smsNummer(tel); return (tel ? link('tel:' + String(tel).replace(/[^\d+]/g, ''), T_('p_anrufen') + ' · ' + tel, '#2f7d59') : '') + (n ? link('https://wa.me/' + n, T_('p_wa'), null) : ''); };

  if (t.status === 'fest') {
    const spaet = zukunft && beginn - jetzt < (ctx.setup.absage_std != null ? ctx.setup.absage_std : 1) * 3600e3;
    const st = String(p.storno || '');
    if (spaet && (st || p.umb || p.neu)) return seite(T_('p_steht'), wann + (was ? ' · ' + was : '') + '. ' + T_('p_spaet'), true, telKnoepfe());
    // Seite von vorher, der Termin wurde inzwischen verschoben: mit der aktuellen Zeit noch einmal fragen.
    if (post && st === '2' && zukunft && veraltet) return seite(T_('p_wirklich'), wann + (was ? ' · ' + was : ''), false, knopf('storno', '2', T_('p_ja_ab'), '#a8442f') + link(ziel, T_('p_behalten'), null));
    if (post && st === '2' && zukunft) {
      const { data: w } = await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).eq('id', t.id).eq('status', 'fest').select('id');
      if (w && w.length) {
        await db.from('termine').update({ bescheid: null }).eq('id', t.id).then(() => {}, () => {});
        await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).eq('ersetzt', t.id).in('status', ['wunsch', 'vorschlag']).then(() => {}, () => {});
        await anfrageNachziehen(t.lead_id);
        await wartelisteMelden(t.tenant_id, datum, null).catch(() => {});
        await kalenderNachziehen(t.tenant_id).catch(() => null);
        const bald = beginn - jetzt < 24 * 3600e3;
        await betriebMelden(t.tenant_id, { titel: bald ? 'Kurzfristig abgesagt' : 'Termin abgesagt', text: (t.name || 'Ein Kunde') + ' hat den Termin am ' + wannDe + ' abgesagt. Die Zeit ist wieder frei.', url: cockpit, tag: 'cz-termin-' + t.id }).catch(() => {});
      }
      return seite(T_('p_abgesagt'), T_('p_abgesagt_s', { w: wann }), false, neuWahl);
    }
    if (post && st === '1' && zukunft) return seite(T_('p_wirklich'), wann + (was ? ' · ' + was : ''), false, knopf('storno', '2', T_('p_ja_ab'), '#a8442f') + link(ziel, T_('p_behalten'), null));
    if (zukunft && (String(p.umb || '') === '1' || (post && p.neu))) {
      const { data: off } = await db.from('termine').select('id, start').eq('ersetzt', t.id).in('status', ['wunsch', 'vorschlag']).limit(1).then((r) => r, () => ({ data: null }));
      if (off && off.length) return seite(T_('p_umb_ges'), T_('p_umb_offen', { w: gtWann(l, off[0].start) }), true, link(ziel, T_('p_zurueck'), null));
      let fehler = '';
      if (post && p.neu) {
        const nz = await neuPruefen();
        if (nz) {
          const zeile = {
            tenant_id: t.tenant_id, widget_id: t.widget_id || null, lead_id: t.lead_id || null, person_nr: 1,
            personal_id: t.personal_id, personal_name: t.personal_name, start: nz.start.toISOString(), ende: nz.ende.toISOString(), dauer,
            leistung: t.leistung, status: 'wunsch', status_am: new Date().toISOString(), name: t.name, telefon: t.telefon, email: t.email,
            gast_key: crypto.randomBytes(16).toString('hex'), ersetzt: t.id, hinweis: 'Möchte umbuchen, bisher ' + wannDe
          };
          const { data: nt, error } = await db.from('termine').insert(zeile).select('id').single();
          if (!error) {
            await kalenderNachziehen(t.tenant_id).catch(() => null);
            await betriebMelden(t.tenant_id, { titel: 'Umbuchung gewünscht', text: (t.name || 'Ein Kunde') + ' möchte von ' + wannDe + ' auf ' + gtWann('de', nz.start.toISOString()) + ' umbuchen.', url: cockpit, tag: 'cz-termin-' + nt.id }).catch(() => {});
            return seite(T_('p_umb_ges'), T_('p_umb_ges_s', { w: gtWann(l, nz.start.toISOString()), w2: wann }), true);
          }
          if (error.code !== '23P01') console.error('umbuchen (sql/51?):', error.message);
        }
        fehler = T_('p_umb_weg');
      }
      const tage = await tageListe();
      if (!tage.length) return seite(T_('p_umb_t'), T_('p_umb_leer'), false, link(ziel, T_('p_zurueck'), null));
      return seite(T_('p_umb_t'), (fehler ? fehler + ' ' : '') + T_('p_umb_s', { w: wann }), !fehler, zeitenHTML(tage) + link(ziel, T_('p_zurueck'), null));
    }
    return seite(T_('p_steht'), wann + (was ? ' · ' + was : '') + '. ' + T_('p_bisdann') + (spaet ? ' ' + T_('p_spaet') : ''), true,
      !zukunft ? '' : spaet ? telKnoepfe() : link(ziel + '&umb=1', T_('p_umbuchen'), null) + knopf('storno', '1', T_('p_absagen'), null));
  }
  // Der Kunde hat schon eine andere Zeit gewählt und öffnet den Link noch einmal: Stand zeigen statt „Nicht mehr offen“.
  // Schlägt der Betrieb danach wieder etwas vor, zeigt derselbe Link den neuen Vorschlag.
  if (t.status === 'wunsch' && zukunft) return seite(T_('p_gewaehlt'), T_('p_gewaehlt_s', { w: wann }), true);
  // Vorschlag, dessen Uhrzeit vorbei ist, lässt sich nicht mehr annehmen (bisher noch bis zum Aufräumen eine Stunde danach).
  if (t.status !== 'vorschlag' || !zukunft) return seite(T_('p_offen'), T_('p_offen_s'), false, neuWahl);
  const wahl = String(p.ja || '');
  if (post && p.neu) {
    const nz = await neuPruefen();
    if (nz) {
      const upd = { start: nz.start.toISOString(), ende: nz.ende.toISOString(), status: 'wunsch', status_am: new Date().toISOString(), hinweis: 'Hat statt ' + wannDe + ' diese Zeit gewählt', bescheid: null, erinnert_am: null };
      let { data: w, error } = await db.from('termine').update(upd).eq('id', t.id).eq('status', 'vorschlag').select('id');
      if (error && error.code === '42703') { delete upd.bescheid; delete upd.erinnert_am; ({ data: w, error } = await db.from('termine').update(upd).eq('id', t.id).eq('status', 'vorschlag').select('id')); }
      if (w && w.length) {
        // Sonst nennt die Anfrage weiter den alten Tag (Ping-Pong: 14:00 → Vorschlag 15:00 → Kunde wählt morgen 16:30).
        await anfrageNachziehen(t.lead_id);
        await kalenderNachziehen(t.tenant_id).catch(() => null);
        await betriebMelden(t.tenant_id, { titel: 'Neue Wunschzeit', text: (t.name || 'Der Kunde') + ' möchte lieber ' + gtWann('de', nz.start.toISOString()) + '. Bitte bestätigen.', url: cockpit, tag: 'cz-termin-' + t.id }).catch(() => {});
        return seite(T_('p_gewaehlt'), T_('p_gewaehlt_s', { w: gtWann(l, nz.start.toISOString()) }), true);
      }
      if (!error) return seite(T_('p_offen'), T_('p_offen_s'), false, neuWahl);
      if (error.code !== '23P01') console.error('neue Wunschzeit:', error.message);
    }
    const tage = await tageListe();
    return seite(T_('p_andere'), T_('p_umb_weg') + ' ' + T_('p_andere_s'), false, zeitenHTML(tage) + knopf('ja', 'x', T_('p_keine'), null));
  }
  if (post && wahl === '0') {
    const tage = await tageListe();
    if (tage.length) return seite(T_('p_andere'), T_('p_andere_s'), true, zeitenHTML(tage) + knopf('ja', '1', T_('p_doch') + ' · ' + wann, null) + knopf('ja', 'x', T_('p_keine'), null));
    // In den nächsten Wochen nichts frei: nicht still streichen (bisher wurde der Vorschlag hier sofort abgesagt), sondern fragen.
    return seite(T_('p_andere'), T_('p_umb_leer'), false, knopf('ja', '1', T_('p_doch') + ' · ' + wann, '#2f7d59') + telKnoepfe() + knopf('ja', 'x', T_('p_keine'), null));
  }
  if (!post || !['1', '0', 'x'].includes(wahl)) {
    return seite(wann, was || T_('p_frage'), true, wahl === '0'
      ? knopf('ja', '0', T_('p_nein'), '#a8442f') + knopf('ja', '1', T_('p_doch'), null)
      : knopf('ja', '1', T_('p_ja'), '#2f7d59') + knopf('ja', '0', T_('p_nein'), null));
  }
  // Seite von vorher: Der Betrieb hat inzwischen eine andere Zeit vorgeschlagen. Nichts bestätigen oder streichen, den aktuellen Vorschlag zeigen.
  if (veraltet) return seite(wann, was || T_('p_frage'), true, knopf('ja', '1', T_('p_ja'), '#2f7d59') + knopf('ja', '0', T_('p_nein'), null));
  const ja = wahl === '1';
  // Seit 21.10.2026: Zusage steht sofort fest, im Cockpit sichtbar als „Terminvorschlag bestätigt“ mit der neuen Uhrzeit (Hinweis am Termin).
  const { data: w } = await db.from('termine').update({ status: ja ? 'fest' : 'abgesagt', status_am: new Date().toISOString(), ...(ja ? { hinweis: 'Terminvorschlag bestätigt: ' + lokalText(t.start).zeit + ' Uhr' } : {}) }).eq('id', t.id).eq('status', 'vorschlag').select('id');
  if (!w || !w.length) return seite(T_('p_offen'), T_('p_offen_s'), false, neuWahl);
  await db.from('termine').update({ bescheid: null }).eq('id', t.id).then(() => {}, () => {});
  if (ja && t.ersetzt) await db.from('termine').update({ status: 'abgesagt', status_am: new Date().toISOString() }).eq('id', t.ersetzt).eq('status', 'fest').then(() => {}, () => {});
  await anfrageNachziehen(t.lead_id);
  if (!ja) await wartelisteMelden(t.tenant_id, datum, null).catch(() => {});
  await kalenderNachziehen(t.tenant_id).catch(() => null);
  await betriebMelden(t.tenant_id, { titel: ja ? 'Terminvorschlag bestätigt' : 'Vorschlag passt nicht', text: (t.name || 'Der Kunde') + (ja ? ' hat den neuen Termin bestätigt: ' + wannDe + '. Er steht fest im Kalender.' : ' kann nicht am ' + wannDe + '.'), url: cockpit, tag: 'cz-termin-' + t.id }).catch(() => {});
  return ja
    ? seite(T_('p_danke'), T_('p_danke_s', { w: wann }), true)
    : seite(T_('p_schade'), form ? T_('p_schade_s') : T_('p_schade_ohne'), false, neuWahl);
}

async function vorschlagMail(t, datum, zeit, alt, link, wer, tenant, dauerText, grund) {
  const { data: e } = await db.from('einstellungen').select('telefon, antwort_an, mail_haupt').eq('tenant_id', tenant).maybeSingle();
  const wann = spDatum('de', datum) + ' um ' + zeit + ' Uhr';
  const knopf = (href, txt, farbe) => `<a href="${href}" style="display:inline-block;background:${farbe};color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;margin:6px 8px 0 0">${txt}</a>`;
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6ddca;border-radius:16px"><tr><td style="padding:26px 28px">
<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">Neuer Vorschlag</div>
<div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px">${esc(wann)}</div>
<p style="color:#5f584a;font-size:15px;line-height:1.65;margin:14px 0 0">${grund ? esc(grund) + ' Passt Ihnen diese Zeit?' : alt ? `Um ${esc(alt.zeit)} Uhr ist bei ${esc(wer)} leider schon alles belegt. Passt Ihnen diese Zeit?` : `Danke für Ihre Anfrage bei ${esc(wer)}${t.leistung ? ' (' + esc(t.leistung) + ')' : ''}. Wir planen etwa ${esc(dauerText || '')} ein. Passt Ihnen diese Zeit?`}</p>
<div style="margin-top:10px">${knopf(link + '&ja=1', 'Passt, eintragen', '#1f6d4a')}${knopf(link + '&ja=0', 'Passt nicht', '#8a8272')}</div>
${e && e.telefon ? `<p style="color:#5f584a;font-size:14px;margin:16px 0 0">Oder rufen Sie an: ${esc(e.telefon)}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [t.email], reply_to: (e && (e.antwort_an || e.mail_haupt)) || undefined, subject: 'Vorschlag: ' + wann + ' · ' + wer, html })
    });
    return r.ok;
  } catch { return false; }
}
