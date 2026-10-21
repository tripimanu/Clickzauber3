// POST /api/lead — Anfrage speichern, Betrieb benachrichtigen, dem Gast eine Bestätigung schicken.
import { db, cors, body, MAIL_KEY, MAIL_TO, MAIL_FROM, gebremst, ipVon, blockHash } from './_lib.js';
import { absender } from './_vertrauen.js';
import { Resend } from 'resend';
import { pushSenden } from './_push.js';
import { weitergeben } from './netz.js';
import { reservieren, lokalText } from './_termine.js';
import { kalenderNachziehen } from './_kalender-direkt.js';
import { kalFrischFuer } from './_kalender-lesen.js';
import { kalTage } from './_kaltage.js';
import crypto from 'crypto';

/* Option B: Auf der Danke-Seite wählt der Gast selbst, welche Partner seine Anfrage auch bekommen.
   Die Signatur beweist, dass die Anfrage gerade von diesem Gerät kam (gültig 2 Stunden). */
// Seit 15.10.2026 derselbe Schlüssel wie bei Gast- und Kalender-Links. Vorher wurden hier Variablennamen gesucht,
// die es bei Vercel nicht gibt, und es galt der feste Wert 'cz': Jeder hätte die Signatur nachbauen können.
// Ohne Schlüssel geht die Weitergabe von der Danke-Seite gar nicht, statt mit einem erratbaren.
const GEHEIM = process.env.KALENDER_SCHLUESSEL || process.env.SB_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sig = (id, ts) => crypto.createHmac('sha256', GEHEIM).update('mit.' + id + '.' + ts).digest('hex').slice(0, 32);

async function mitAnfragen(p, res) {
  const id = String(p.id || ''), ts = +p.ts || 0, an = (Array.isArray(p.mit_an) ? p.mit_an : []).map(String).slice(0, 6);
  if (!GEHEIM || !id || !an.length || Date.now() - ts > 2 * 3600e3 || p.sig !== sig(id, ts)) return res.status(403).json({ ok: false });
  const { data: lead } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return res.status(404).json({ ok: false });
  const { data: ws } = await db.from('widgets').select('slug, tenant_id').in('slug', an);
  const ids = [...new Set((ws || []).map((w) => w.tenant_id).filter((t) => t && t !== lead.tenant_id))];
  const { data: ok } = ids.length ? await db.from('netz_partner').select('partner_id').eq('tenant_id', lead.tenant_id).eq('zugestimmt', true).in('partner_id', ids) : { data: [] };
  // Der Gast hat hier ausdrücklich gewählt: diese Weitergabe gilt als Zustimmung, aber nur für diese Partner.
  const l2 = Object.assign({}, lead, { weiter_ok: true });
  const erg = [];
  for (const x of ok || []) { const r = await weitergeben(lead.tenant_id, l2, x.partner_id, 'Der Gast hat auf der Danke-Seite selbst gewählt, dass seine Anfrage auch an Sie geht.', ''); erg.push(!!r.ok); l2.weitergeleitet = lead.weitergeleitet = l2.weitergeleitet; }
  return res.status(200).json({ ok: true, gesendet: erg.filter(Boolean).length });
}
import { T, sprache, datum as spDatum, uhr as spUhr, eur as spEur, betriebSprache } from './_sprache.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  if (p && p.mit_an) return mitAnfragen(p, res);
  const { widget, session, answers, score, consent } = p;
  // Seit 15.10.2026: Name, E-Mail und Telefon bereinigt. Vorher ging alles ungeprüft in die Datenbank. Ein Anführungszeichen
  // in der E-Mail-Adresse reichte, um im Cockpit fremden Code auszuführen (Link „E-Mail“). Spitze Klammern, Anführungszeichen,
  // Backslash und Steuerzeichen kommen nie in echten Angaben vor. Apostroph bleibt (O'Brien, D'Angelo).
  const sauber = (s, n) => (s == null || typeof s === 'object' ? null : String(s).replace(/[\u0000-\u001f\u007f"<>`\\]/g, '').trim().slice(0, n) || null);
  const name = sauber(p.name, 120);
  const email = sauber(p.email, 254) ? sauber(p.email, 254).replace(/\s+/g, '') : null;
  const phone = sauber(p.phone, 60);
  // Größe begrenzen: Echte Antworten bleiben weit unter 200 KB, auch bei vielen Fragen.
  if (answers && JSON.stringify(answers).length > 200000) return res.status(413).json({ ok: false, error: 'zu-gross' });
  // Das Widget sendet "wert" und "termin"; ältere Einbauten "value_est".
  let wert = p.wert ?? p.value_est ?? null;
  wert = Number.isFinite(+wert) && +wert > 0 ? Math.round(+wert * 100) / 100 : null;
  let termin = /^\d{4}-\d{2}-\d{2}$/.test(String(p.termin || '')) ? p.termin : null;
  if (!widget || !consent) return res.status(400).json({ ok: false, error: 'widget/consent fehlt' });
  // Bremse (seit 15.10.2026, sql/71): Jede Anfrage schickt eine Mail an die eingegebene Adresse, im Namen des Betriebs.
  // Ohne Grenze ließe sich darüber massenhaft Mail an Fremde verschicken. 20 je Stunde und Anschluss reichen jedem Gast.
  if (await gebremst('lead:' + ipVon(req), 20, 60)) return res.status(429).json({ ok: false, error: 'zu-viele', hinweis: 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es später noch einmal.' });

  // Betrieb zuerst auflösen: ohne tenant_id greifen Export, Löschfrist und Konto-Löschung nicht.
  let betrieb = { name: null, email: null, telefon: null };
  let tenantId = null;
  try {
    const { data: w } = await db.from('widgets').select('name, tenant_id').eq('slug', widget).maybeSingle();
    if (w) {
      tenantId = w.tenant_id || null;
      // Beim Anmelden wird der Betrieb zunächst unter der E-Mail-Adresse angelegt.
      // Die darf nie als Name des Betriebs in einer Gast-Mail auftauchen.
      // Kein Name ist besser als ein falscher: die Mail schreibt dann „bei uns“.
      // Gefiltert werden E-Mail-Adressen (so wird der Betrieb beim Anmelden
      // angelegt) und stehengebliebene Platzhalter.
      const TABU = /^(dein|ihr|mein)[\s_-]*(betriebs?name|firmenname|name)|^betriebsname$|^firmenname$|^name des betriebs$|^ihr betriebsname$|^platzhalter$|^test$|^xxx+$|^tbd$|^todo$/i;
      const echterName = (s) => {
        const t = String(s == null ? '' : s).trim();
        return t.length >= 2 && !/@/.test(t) && !TABU.test(t) ? t : null;
      };
      betrieb.name = echterName(w.name);
      if (w.tenant_id) {
        const { data: t } = await db.from('tenants').select('name, email').eq('id', w.tenant_id).maybeSingle();
        if (t) betrieb = { name: echterName(t.name) || echterName(w.name), email: t.email, telefon: null };
      }
    }
  } catch (e) { /* Ohne Betriebsdaten geht es auch — dann eben neutral. */ }

  // Einstellungen des Betriebs: Empfänger und ob der Gast eine Bestätigung will.
  let ein = {};
  if (tenantId) {
    const { data: e } = await db.from('einstellungen')
      .select('*')
      .eq('tenant_id', tenantId).maybeSingle();
    ein = e || {};
  }

  // Doppelt abgeschickt (zweimal getippt, Netz hing): gleiche Kontaktdaten und gleicher Inhalt im
  // selben Formular binnen 3 Minuten → dieselbe Anfrage zurückgeben, nichts doppelt anlegen.
  if (email || phone) {
    try {
      let q = db.from('leads').select('id, answers').eq('widget_id', widget).gte('ts', new Date(Date.now() - 180000).toISOString()).order('ts', { ascending: false }).limit(5);
      q = email ? q.eq('email', email) : q.eq('phone', phone);
      const { data: kurz } = await q;
      for (const k of kurz || []) {
        let gleich = JSON.stringify(k.answers || null) === JSON.stringify(answers || null);
        if (Array.isArray(p.termine) && p.termine.length) {
          const t0 = p.termine[0] || {};
          const { data: tt } = await db.from('termine').select('start').eq('lead_id', k.id).in('status', ['wunsch', 'vorschlag', 'fest']).limit(4);
          gleich = (tt || []).some((x) => { const a = lokalText(x.start); return a.datum === t0.datum && a.zeit === t0.zeit; });
        }
        if (gleich) { const ts = Date.now(); return res.status(200).json({ ok: true, id: k.id, ts, sig: sig(k.id, ts), doppelt: true }); }
      }
    } catch (e) { /* im Zweifel normal weiter */ }
  }

  // Eigenen Kalender des Betriebs kurz neu lesen, wenn der Stand älter als 10 Minuten ist
  // (lib/_kalender-lesen.js, höchstens 3,5 Sekunden). So rutscht nichts durch, was gerade erst eingetragen wurde.
  let frischB = null;
  if (termin || (Array.isArray(p.termine) && p.termine.length)) frischB = await kalFrischFuer(widget).catch(() => null);
  // Ganzer Tag (Food Truck, Location …): steht an dem Tag schon etwas im eigenen Kalender, kommt die
  // Anfrage trotzdem an (der Gast hat abgeschickt), aber der Betrieb sieht sofort den Hinweis.
  const kalBelegt = !!(termin && frischB && !(Array.isArray(p.termine) && p.termine.length) && kalTage(frischB).includes(termin));

  // Uhrzeit-Termine (Friseur & Co.): zuerst die Zeiten sichern. Ist eine schon
  // weg, kommt die Anfrage gar nicht erst an — der Gast wählt neu.
  /* Blockiert (seit 15.10.2026, sql/72): Hat der Betrieb diese Person blockiert (Telefon, E-Mail, Handy oder für 24 Std. der Anschluss),
     kommt nichts an. Das Formular zeigt trotzdem „Danke“ (Manuels Wahl), damit niemand merkt, dass er gesperrt ist, und es anders versucht. */
  const bh = { tel: blockHash('tel', phone), mail: blockHash('mail', email), geraet: blockHash('geraet', p.geraet), ip: blockHash('ip', ipVon(req)) };
  if (tenantId) {
    /* Seit 17.10.2026 ohne Anschluss: ein WLAN teilen viele (Salon, Familie, Mobilfunk), alte Anschluss-Sperren gelten nicht mehr. */
    const liste = [bh.tel, bh.mail, bh.geraet].filter(Boolean);
    const { data: bl, error: be } = liste.length ? await db.from('blockiert').select('art, bis').eq('tenant_id', tenantId).in('hash', liste).then((r) => r, () => ({ data: null, error: true })) : { data: null };
    if (!be && (bl || []).some((x) => !x.bis || Date.parse(x.bis) > Date.now())) return res.status(200).json({ ok: true, id: null });
  }
  let reserviert = null;
  /* Höchstzahl Anfragen je Gerät und je Anschluss in 24 Stunden (seit 15.10.2026, Cockpit → Leistungen & Regeln, salon.limit, z. B. 3).
     Erst nur zählen; gezählt wird eine Anfrage, wenn sie gespeichert ist. Eine vergebene Uhrzeit (409) kostet also keinen Versuch. */
  const limKeys = [];
  // Seit 15.10.2026 für alle Formulare: Inhaltsverzeichnis → salon.limit (Cockpit), sonst „limit“ im Formular (Konfigurator, letzte Seite). Fehlt beides: keine Grenze (seit 17.10.2026, vorher 3; der Betrieb schaltet sie selbst ein).
  if (tenantId) {
    const zahl = (v) => (v == null || v === '' ? 0 : Math.min(20, Math.max(0, parseInt(v, 10) || 0)));
    let lim = null;
    if (Array.isArray(p.termine) && p.termine.length) {
      const { data: tsl } = await db.from('termin_setup').select('salon').eq('tenant_id', tenantId).maybeSingle().then((r) => r, () => ({ data: null }));
      if (tsl && tsl.salon && tsl.salon.an) lim = zahl(tsl.salon.limit);
    }
    if (lim == null) {
      const { data: wv } = await db.from('widget_versions').select('lim:config_json->limit').eq('widget_id', widget).not('published_at', 'is', null).order('version', { ascending: false }).limit(1).maybeSingle().then((r) => r, () => ({ data: null }));
      lim = zahl(wv ? wv.lim : null);
    }
    if (lim) {
      const g = String(p.geraet || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
      limKeys.push('anf:' + widget + ':' + ipVon(req)); if (g) limKeys.push('anf:' + widget + ':g:' + g);
      const seit = new Date(Date.now() - 864e5).toISOString();
      for (const k of limKeys) {
        const { count, error: le } = await db.from('bremse').select('id', { count: 'exact', head: true }).eq('schluessel', k).gte('am', seit);
        if (!le && (count || 0) >= lim) return res.status(429).json({ ok: false, error: 'limit', max: lim });
      }
    }
  }
  if (Array.isArray(p.termine) && p.termine.length) {
    if (!tenantId) return res.status(400).json({ ok: false, error: 'kein Betrieb' });
    let gesperrt = [];
    try {
      const wbB = frischB || ((await db.from('widgets').select('belegung').eq('slug', widget).maybeSingle()).data || {}).belegung;
      gesperrt = (wbB && wbB.gesperrt) || [];
    } catch (e) {}
    reserviert = await reservieren(tenantId, widget, p.termine.slice(0, 4),
      { name, telefon: phone, email, nachricht: p.nachricht }, gesperrt);
    if (!reserviert.ok) return res.status(409).json({ ok: false, error: reserviert.grund || 'vergeben', index: reserviert.index });
    if (!termin && reserviert.termine[0]) termin = reserviert.termine[0].datum;
  }

  // Lesbare Auswahl des Gastes (public/w.js, answers._auswahl): kürzen und prüfen.
  if (answers && typeof answers === 'object' && answers._auswahl !== undefined) {
    const aw = (Array.isArray(answers._auswahl) ? answers._auswahl : []).slice(0, 40).map((x) => ({
      k: String((x && x.k) || '').slice(0, 60), typ: ['termin', 'wahl', 'datum', 'text', 'leistung', 'haar', 'dauer', 'wimpern'].includes(x && x.typ) ? x.typ : 'wahl',
      f: String((x && x.f) || '').slice(0, 80), a: String((x && x.a) || '').slice(0, 300), w: x && x.w ? String(x.w).slice(0, 80) : undefined,
      p: x && x.typ !== 'wimpern' && Number.isFinite(+x.p) && +x.p > 0 ? Math.round(+x.p * 100) / 100 : null,
      // Wimpern: voraussichtliches neues Set (Name, Preis, Dauer). Zählt nicht zum Gesamtpreis, das Cockpit zeigt daraus „Auf neues Set ändern“.
      ns: x && x.typ === 'wimpern' && x.ns && typeof x.ns === 'object' ? { n: String(x.ns.n || '').slice(0, 80), p: Math.max(0, +x.ns.p || 0), d: Math.max(0, parseInt(x.ns.d, 10) || 0), von: String(x.ns.von || '').slice(0, 80) } : undefined
    })).filter((x) => x.a);
    if (aw.length) answers._auswahl = aw; else delete answers._auswahl;
    // Uhrzeit-Termine: Gesamt = Summe der einzelnen Preise (schützt vor alten Formularen, die Preise als Text aneinandergehängt haben: 28 + 60 = 2860).
    if (reserviert && aw.some((x) => x.typ === 'termin')) {
      const su = aw.reduce((s, x) => s + (x.p || 0), 0);
      if (su > 0) wert = Math.round(su * 100) / 100;
    }
    // Inhaltsverzeichnis: Der Server hat Dauer und Preis selbst gerechnet (lib/_termine.js salonRechnen). Das gilt.
    if (reserviert && reserviert.termine.some((x) => x.preis != null)) {
      const su2 = reserviert.termine.reduce((s, x) => s + (+x.preis || 0), 0);
      if (su2 > 0) wert = su2;
    }
  }
  const { data, error } = await db.from('leads').insert({
    tenant_id: tenantId,
    widget_id: widget, session_id: session ?? null,
    name: name ?? null, email: email ?? null, phone: phone ?? null,
    answers: kalBelegt ? { ...(answers || {}), _kal_belegt: true } : (answers ?? null), score: score ?? null, value_est: wert,
    posten: Array.isArray(p.posten) && p.posten.length && JSON.stringify(p.posten).length < 30000 ? p.posten.slice(0, 50) : null,
    termin: termin,
    status: 'neu',
    consent: !!consent
  }).select('id').single();
  if (error) {
    if (reserviert) await db.from('termine').delete().eq('gruppe', reserviert.gruppe);
    return res.status(500).json({ ok: false, error: error.message });
  }
  if (reserviert) await db.from('termine').update({ lead_id: data.id }).eq('gruppe', reserviert.gruppe);
  for (const k of limKeys) await db.from('bremse').insert({ schluessel: k }).then(() => {}, () => {});
  // Fingerabdruck von Handy und Anschluss merken, damit „Blockieren“ im Cockpit beides sperren kann (sql/72; ohne die Spalten geht es ohne).
  if (bh.geraet || bh.ip) await db.from('leads').update({ geraet_h: bh.geraet, ip_h: bh.ip }).eq('id', data.id).then(() => {}, () => {});
  // Beratung zuerst (Friseur schaut sich das Haar an): Leistung, Wunschtag, Fotos. Getrennt
  // gespeichert, damit die Anfrage auch ohne sql/47 ankommt.
  const beratung = (Array.isArray(p.beratung) ? p.beratung : []).slice(0, 4).map((b) => ({
    leistung: String((b && b.leistung) || '').trim().slice(0, 300),
    name: String((b && b.name) || '').trim().slice(0, 60) || null,
    wunschtag: /^\d{4}-\d{2}-\d{2}$/.test(String(b && b.wunschtag || '')) ? b.wunschtag : null,
    tageszeit: ['vormittags', 'nachmittags', 'abends'].includes(b && b.tageszeit) ? b.tageszeit : null
  })).filter((b) => b.leistung);
  // Seit 15.10.2026 auch Fotos der Augen bei Wimpern-Terminen (Einstellung „Fotos im Formular“), gleicher Speicher wie bei der Beratung.
  const wimFotos = !!(reserviert && reserviert.termine.some((x) => x.wimpern) && Array.isArray(p.fotos) && p.fotos.length);
  if (beratung.length || wimFotos) {
    if (beratung.length) await db.from('leads').update({ beratung }).eq('id', data.id).then(() => {}, () => {});
    const fotos = [];
    for (const [i, f] of (Array.isArray(p.fotos) ? p.fotos : []).slice(0, 3).entries()) {
      const m = String(f || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!m) continue;
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 1.5 * 1024 * 1024) continue;
      const pfad = (tenantId || 'ohne') + '/' + data.id + '/' + (i + 1) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
      try { const { error: fe } = await db.storage.from('beratung').upload(pfad, buf, { contentType: 'image/' + m[1], upsert: true }); if (!fe) fotos.push(pfad); } catch (e) {}
    }
    if (fotos.length) await db.from('leads').update({ fotos }).eq('id', data.id).then(() => {}, () => {});
  }
  // Zustimmung zur Weitergabe an Partner (Vernetzen). Getrennt, damit Anfragen auch ohne sql/35 ankommen.
  if (p.weiter_ok === true) await db.from('leads').update({ weiter_ok: true }).eq('id', data.id).then(() => {}, () => {});
  // Gast kam über „Unsere Partner“ im Formular eines anderen Betriebs (?von=slug): für den Empfehlungs-Zähler merken.
  if (p.von && tenantId) {
    try {
      const { data: vw } = await db.from('widgets').select('tenant_id').eq('slug', String(p.von).slice(0, 80)).maybeSingle();
      if (vw && vw.tenant_id && vw.tenant_id !== tenantId) {
        const { data: pz } = await db.from('netz_partner').select('zugestimmt').eq('tenant_id', vw.tenant_id).eq('partner_id', tenantId).maybeSingle();
        if (pz && pz.zugestimmt) {
          await db.from('leads').update({ herkunft_tenant: vw.tenant_id }).eq('id', data.id);
          // Der Betrieb, der empfohlen hat, erfährt davon — ohne Namen oder Angaben des Gastes.
          const { data: np } = await db.from('netz_profil').select('name').eq('tenant_id', tenantId).maybeSingle();
          const nm = (np && np.name) || betrieb.name || 'Ihr Partner';
          pushSenden(vw.tenant_id, { titel: 'Ihre Empfehlung ist angekommen', text: 'Ein Gast hat über Ihr Formular bei ' + nm + ' angefragt.', url: 'clickzauber-cockpit-live.html#vernetzen', tag: 'cz-netz' }).catch(() => {});
        }
      }
    } catch (e) { /* Zähler ist Zusatz */ }
  }
  // Gemeinsames Paket: die Anfrage geht zusätzlich an alle Partner im Paket.
  if (p.paket && tenantId) {
    try {
      const { data: pk } = await db.from('netz_paket').select('*').eq('id', String(p.paket)).eq('tenant_id', tenantId).eq('aktiv', true).maybeSingle();
      if (pk) {
        await db.from('leads').update({ paket_id: pk.id, weiter_ok: true }).eq('id', data.id);
        const { data: voll } = await db.from('leads').select('*').eq('id', data.id).single();
        if (voll) for (const an of (pk.partner || [])) await weitergeben(tenantId, voll, an, '', pk.titel);
      }
    } catch (e) { /* Paket ist Zusatz, die Anfrage selbst ist angekommen */ }
  }
  // Sprache des Gastes merken (für Mails an ihn). Getrennt, damit Anfragen auch ohne sql/34 ankommen.
  if (['de', 'sq', 'en', 'fr', 'it', 'es', 'tr'].includes(p.sprache)) await db.from('leads').update({ sprache: p.sprache }).eq('id', data.id).then(() => {}, () => {});
  // Gast: Sprache, in der er das Formular ausgefüllt hat. Betrieb: seine Cockpit-Sprache.
  const gl = sprache(p.sprache), bl = await betriebSprache(db, tenantId);
  const TB = T(bl);
  const zeitText = reserviert ? reserviert.termine.map((t) => spUhr(bl, t.zeit) + (t.personal ? ' · ' + t.personal : '')).join(', ') : '';
  const basis = sprache(p.basis);
  const gastZeilen = gl !== basis && Array.isArray(p.gast_zeilen) ? p.gast_zeilen.filter((z) => Array.isArray(z) && z[1]).slice(0, 60) : null;

  await db.from('events').insert({ tenant_id: tenantId, widget_id: widget, session_id: session ?? null, type: 'complete' });

  // Push-Nachricht auf angemeldete Geräte. Läuft ohne await-Kette über alles
  // Weitere: ob eine Nachricht rausgeht, darf nie entscheiden, ob die Anfrage
  // ankommt. Fehler werden in _push.js geschluckt.
  if (tenantId) {
    try {
      // Zahl auf dem App-Symbol (seit 15.10.2026): offene Anfragen des Betriebs, sw.js setzt sie beim Eintreffen der Nachricht.
      const { count: offen } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'neu').then((r) => r, () => ({ count: null }));
      await pushSenden(tenantId, {
        anzahl: offen || 0,
        titel: (reserviert ? TB.push_termin : TB.push_neu) + (betrieb.name ? ' · ' + betrieb.name : ''),
        text: (name || TB.ohne_name)
          + (beratung.length && !reserviert ? ' · Beratung: ' + beratung.map((b) => b.leistung).join(', ') : '')
          + (termin ? ' · ' + spDatum(bl, termin) : '')
          + (zeitText ? ' · ' + zeitText : '')
          + (wert ? ' · ' + spEur(bl, wert) : '')
          + (kalBelegt ? ' · Achtung: In Ihrem Kalender steht an diesem Tag schon etwas.' : ''),
        url: 'clickzauber-cockpit-live.html#anfrage-' + data.id,
        tag: 'cz-anfrage-' + data.id
      });
    } catch (e) { /* Push darf den Lead nicht verhindern */ }
  }
  // Echtzeit-Kalender: der neue Terminwunsch steht sofort im Kalender des Betriebs.
  if (reserviert && tenantId) await kalenderNachziehen(tenantId).catch(() => null);

  if (MAIL_KEY) {
    const resend = new Resend(MAIL_KEY);

    // 1) An den Betrieb (und immer auch an dich, solange kein Betrieb hinterlegt ist).
    // Die interne Adresse eines vorgebauten Kontos (vorgebaut-…@clickzauber.de) ist kein Postfach. Beim Online-Test vor dem Verschicken
    // (seit 10.10.2026) geht die Mail deshalb nur an MAIL_TO.
    // „E-Mails an / aus“ (sql/69): aus = keine Mail an die Adressen des Betriebs, Push bleibt.
    const mailAn = ein.mail_betrieb !== false;
    const empfaenger = [mailAn && (ein.mail_haupt || betrieb.email), mailAn && ein.mail_zweit, MAIL_TO].filter((a) => a && !/^vorgebaut-.+@clickzauber\.de$/i.test(a));
    if (empfaenger.length) {
      try {
        await resend.emails.send({
          from: MAIL_FROM,
          to: [...new Set(empfaenger)],
          reply_to: email || undefined,
          subject: reserviert ? TB.b_betreff_termin(spDatum(bl, termin), zeitText) : TB.b_betreff(termin ? spDatum(bl, termin) : '', wert ? spEur(bl, wert) : ''),
          html: mailBetrieb({ id: data && data.id, widget, name, email, phone, answers, wert, termin, betrieb, l: bl, gl })
        });
      } catch (e) { /* Mail-Fehler darf den Lead nicht verhindern */ }
    }

    // 2) An den Gast — seine Angaben schwarz auf weiß, zum Weiterleiten und Vergleichen.
    if (email && ein.mail_gast !== false) {
      try {
        await resend.emails.send({
          from: await absender(tenantId, betrieb.name),
          to: [email],
          reply_to: [ein.antwort_an, ein.mail_haupt, betrieb.email].find((a) => a && !/^vorgebaut-.+@clickzauber\.de$/i.test(a)) || undefined,
          subject: T(gl).g_betreff(betrieb.name || '', termin ? spDatum(gl, termin) : ''),
          html: mailGast({ name, answers, wert, termin, betrieb, ein, reserviert: !!reserviert, l: gl, gastZeilen, basis, preisGast: !(ein.funktionen && ein.funktionen.preis_gast === false) })
        });
      } catch (e) { /* still */ }
    }
  }

  // Kundenakte (seit 10.10.2026): erste Anfrage nach dem Einlösen eines Einladungs-Links → Push und Mail an Manuel.
  try { const { einladungAnfrage } = await import('./einladung.js'); await einladungAnfrage(tenantId); } catch (e) { /* darf die Anfrage nicht aufhalten */ }
  const ts = Date.now();
  res.status(200).json({ ok: true, id: data.id, ts, sig: sig(data.id, ts) });
}

/* ---------- Textbausteine ---------- */

function rahmen(inner, l = 'de') {
  return `<!DOCTYPE html><html lang="${l}"><body style="margin:0;background:#faf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:580px;background:#fff;border:1px solid #e6ddca;border-radius:16px;overflow:hidden">
${inner}
</table>
<p style="max-width:580px;margin:16px auto 0;font-size:11.5px;color:#a49b86;text-align:center;line-height:1.5">${T(l).fuss}</p>
</td></tr></table></body></html>`;
}

function zeilen(answers, wert, l = 'de', fertig = null) {
  const liste = fertig || Object.entries(answers || {}).filter(([k, v]) => v && k.charAt(0) !== '_' && typeof v !== 'object').map(([k, v]) => [label(k), v]);
  const rows = liste
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px dashed #e6ddca;color:#5f584a;font-size:13.5px;vertical-align:top">${esc(k)}</td><td style="padding:8px 0 8px 14px;border-bottom:1px dashed #e6ddca;color:#211d16;font-size:13.5px;font-weight:600;text-align:right;vertical-align:top">${esc(v)}</td></tr>`)
    .join('');
  const summe = wert
    ? `<tr><td style="padding:12px 0 0;color:#211d16;font-size:15px;font-weight:600">${T(l).richtwert}</td><td style="padding:12px 0 0 14px;color:#1f6d4a;font-size:15px;font-weight:700;text-align:right">${spEur(l, wert)}</td></tr>`
    : '';
  return `<table role="presentation" width="100%" style="border-collapse:collapse">${rows}${summe}</table>`;
}

function mailBetrieb({ id, widget, name, email, phone, answers, wert, termin, betrieb, l = 'de', gl = 'de' }) {
  const t = T(l);
  return rahmen(`<tr><td style="padding:24px 26px;border-bottom:1px solid #e6ddca">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">${esc(t.b_kopf(betrieb.name || ''))}</div>
  <div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px;letter-spacing:-.01em">${esc(name || t.ohne_name)}${termin ? ' · ' + spDatum(l, termin) : ''}</div>
  <div style="margin-top:10px;font-size:14px;color:#5f584a;line-height:1.6">
    ${email ? `<a href="mailto:${esc(email)}" style="color:#1f6d4a">${esc(email)}</a>` : ''}
    ${phone ? ` · <a href="tel:${esc(String(phone).replace(/\s/g, ''))}" style="color:#1f6d4a">${esc(phone)}</a>` : ''}
  </div>
</td></tr>
<tr><td style="padding:22px 26px">
  ${zeilen(answers, wert, l, auswahlZeilen(answers, l, true))}
  ${gl !== l ? `<p style="color:#5f584a;font-size:13.5px;line-height:1.6;margin:18px 0 0;padding:10px 13px;background:#faf7f0;border-radius:10px">${esc(t.gast_sprache(t.spr[gl]))}</p>` : ''}
  <p style="color:#5f584a;font-size:13.5px;line-height:1.6;margin:20px 0 0">${t.b_text}</p>
  
  <p style="color:#a49b86;font-size:11.5px;margin:16px 0 0">Formular: ${esc(widget)}</p>
</td></tr>`, l);
}

function mailGast({ name, answers, wert, termin, betrieb, ein, reserviert, l = 'de', gastZeilen = null, basis = 'de', preisGast = true }) {
  const e = ein || {}, t = T(l);
  const wer = betrieb.name || t.die_location;
  // Frist nur nennen, wenn die Location eine gesetzt hat — ein leeres Versprechen ist schlimmer als keins.
  const frist = t.frist[Number(e.antwortzeit_stunden)] || null;
  const kontakt = [
    e.ansprechpartner ? `<div style="font-size:14.5px;color:#211d16;font-weight:600">${esc(e.ansprechpartner)}</div>` : '',
    betrieb.name ? `<div style="font-size:13.5px;color:#5f584a;margin-top:2px">${esc(betrieb.name)}</div>` : '',
    e.telefon ? `<div style="font-size:13.5px;color:#5f584a;margin-top:5px">${t.telefon}: <a href="tel:${esc(String(e.telefon).replace(/[^+\d]/g, ''))}" style="color:#1f6d4a;text-decoration:none">${esc(e.telefon)}</a></div>` : ''
  ].filter(Boolean).join('');
  // Eigener Bestätigungstext des Betriebs gilt nur in seiner Sprache; sonst der Standardtext.
  const eigen = e.gast_text && l === basis;
  return rahmen(`<tr><td style="padding:24px 26px;border-bottom:1px solid #e6ddca">
  <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#1f6d4a">${t.g_kopf}</div>
  <div style="font-size:20px;font-weight:600;color:#211d16;margin-top:7px;letter-spacing:-.01em">${esc(t.g_titel(termin ? spDatum(l, termin) : '', betrieb.name || ''))}</div>
</td></tr>
<tr><td style="padding:22px 26px">
  <p style="color:#5f584a;font-size:14.5px;line-height:1.65;margin:0 0 18px">
    ${eigen ? eigenerText(e.gast_text, { name, betrieb: betrieb.name || '', termin: termin ? deDatum(termin) : '' }) : `${esc(t.guten(name ? String(name).split(' ')[0] : ''))}, ${t.g_text}
    ${esc(reserviert ? t.g_reserviert(wer) : t.g_meldet(wer, frist))}`}
  </p>
  ${zeilen(answers, preisGast ? wert : null, l, gastZeilen || auswahlZeilen(answers, l, preisGast))}
  ${wert && preisGast ? `<p style="color:#8a8270;font-size:12.5px;line-height:1.55;margin:14px 0 0">${esc(t.richtwert_hinweis(wer))}</p>` : ''}
  ${kontakt ? `<div style="margin:22px 0 0;padding:15px 17px;background:#faf7f0;border:1px solid #e6ddca;border-radius:12px">
    <div style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a8270;margin-bottom:7px">${t.ansprech}</div>
    ${kontakt}
  </div>` : ''}
  <p style="color:#5f584a;font-size:14px;line-height:1.65;margin:20px 0 0">${t.aenderung}</p>
</td></tr>`, l);
}

/* ---------- Helfer ---------- */

/* Eigener Text des Betriebs. Platzhalter: {vorname} {name} {betrieb} {termin} */
function eigenerText(t, w) {
  const vorname = String(w.name || '').split(' ')[0];
  return esc(t)
    .replace(/\{vorname\}/g, esc(vorname)).replace(/\{name\}/g, esc(w.name || ''))
    .replace(/\{betrieb\}/g, esc(w.betrieb)).replace(/\{termin\}/g, esc(w.termin))
    .replace(/\r?\n/g, '<br>');
}

const LABEL = {
  termin: 'Wunschtermin', ausweich: 'Ausweichtermin', gaeste: 'Gäste', stil: 'Stil',
  trauung: 'Trauung', menue: 'Menü', getraenke: 'Getränke', deko: 'Blumen & Deko',
  musik: 'Musik & Unterhaltung', foto: 'Foto & Video', extras: 'Zusatzleistungen',
  budget: 'Budgetrahmen', text: 'Ihre Nachricht', anlass: 'Anlass'
};
function label(k) {
  return LABEL[k] || String(k).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
/* Auswahl des Gastes so, wie er sie im Formular gesehen hat: Frage, Antwort und auf Wunsch der Preis. */
function auswahlZeilen(answers, l, mitPreis) {
  const aw = answers && Array.isArray(answers._auswahl) ? answers._auswahl : null;
  if (!aw || !aw.length) return null;
  return aw.map((x) => [x.f || '', String(x.a || '') + (mitPreis && x.p ? ' · ' + spEur(l, x.p) : '')]);
}
function eur(n) {
  return Number(n).toLocaleString('de-DE') + ' €';
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
