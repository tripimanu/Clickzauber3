// GET /api/config?widget=…  — Widget holt Konfiguration und Belegung in einem Zug.
// Öffentlich und stark gecacht: dieser Endpunkt trägt die Last aller Besucher.
import { db, cors } from './_lib.js';
import { kalTage, proTag } from './_kaltage.js';
import { PLANS, ZAHLUNG_AKTIV } from './_plans.js';
import { setupLaden, zeitenVon, ausKonfigurator } from './_termine.js';
import { antwortZeit } from './_antwortzeit.js';
import { stufeVon } from './_vertrauen.js';

// Auffüll-Leistung wie lib/_termine.js istWimpern: von selbst an, aus mit wimpern: false.
const istW = (l) => !!l && (l.wimpern === true || (l.wimpern !== false && /auff[üu]ll|infill|refill/i.test(String(l.name || '')) && /wimper|lash/i.test(String(l.name || '') + ' ' + String(l.kat || ''))));
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  // Immer "*": die Antwort wird öffentlich zwischengespeichert. Mit der Adresse des ersten
  // Besuchers darin lud das Formular auf einer zweiten Adresse (z. B. mit und ohne www) nicht.
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const slug = req.query.widget;
  if (!slug) return res.status(400).json({ error: 'widget fehlt' });

  const { data: w } = await db
    .from('widgets')
    .select('slug, domain, status, belegung, tenant_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!w) return res.status(404).json({ error: 'unbekannt' });
  if (w.status !== 'live') return res.status(403).json({ error: 'nicht live' });
  if (w.domain && origin && !origin.endsWith(w.domain)) {
    return res.status(403).json({ error: 'domain' });
  }

  // Einstellungen des Betriebs: Datenschutz-Link (Pflicht) und Pause.
  // Dazu der Tarif: ohne aktiven Tarif wird nichts ausgeliefert. Die Sperre
  // im Konfigurator ist nur die Oberfläche — hier ist sie verbindlich, auch
  // wenn jemand den Einbau-Code schon kopiert hat.
  let ein = {};
  let bezahlt = false;
  let tarif = null;
  if (w.tenant_id) {
    const [{ data: e }, { data: u }] = await Promise.all([
      // funktionen (sql/65): Fehlt die Spalte noch, ohne sie noch einmal fragen. Das Formular lädt in jedem Fall.
      db.from('einstellungen')
        .select('datenschutz_url, pausiert, pausiert_text, funktionen')
        .eq('tenant_id', w.tenant_id)
        .maybeSingle()
        .then((r) => (r.error ? db.from('einstellungen').select('datenschutz_url, pausiert, pausiert_text').eq('tenant_id', w.tenant_id).maybeSingle() : r)),
      db.from('users')
        .select('*')
        .eq('tenant_id', w.tenant_id)
    ]);
    ein = e || {};
    const nutzer = u || [];
    // Betreiber-Konto: die eigenen Widgets laufen ohne Tarif. Ohne diesen Zweig
    // gab /api/config auch für das Betreiber-Konto 402 zurück — das Widget lud
    // nicht, und die Teilen-Seite meldete nach zwölf Sekunden „nicht erreichbar".
    const ADMINS = (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const istBetreiber = nutzer.some(n => ADMINS.includes(String(n.email || '').toLowerCase()));
    const zahlend = nutzer.find(n => ['aktiv', 'gekündigt'].includes(n.plan_status));
    // Vom Betreiber gesperrt (z. B. Zahlung offen): kein Widget, Daten bleiben.
    const gesperrt = !istBetreiber && nutzer.some(n => n.gesperrt_am);
    bezahlt = !gesperrt && (istBetreiber || !!zahlend);
    tarif = istBetreiber ? null : (zahlend ? (PLANS[zahlend.plan] || null) : null);
    // Pilotbetrieb (sql/43): kostenlos und ohne Formular-Grenze, solange die Zahlung aus ist.
    // Seit 09.10.2026: Solange die Zahlung aus ist, läuft jedes Formular kostenlos (lib/_plans.js kostenlos).
    // Testzugang aus einem Einladungs-Link (sql/67): nach Ablauf geht das Formular aus, das Cockpit bleibt offen.
    const testAus = !istBetreiber && !zahlend && nutzer.some(n => n.test_bis && new Date(n.test_bis) < new Date());
    if (testAus) bezahlt = false;
    if (!bezahlt && !gesperrt && !testAus && !ZAHLUNG_AKTIV) { bezahlt = true; tarif = null; }
    // Online-Test eines vorgebauten Kontos (seit 10.10.2026, lib/konto-admin.js online_test): läuft auch ohne Tarif, bis der Kunde die Einladung einlöst.
    if (!bezahlt && !gesperrt && nutzer.some(n => n.einladung_code && !n.eingeloest_am && n.schritte && n.schritte.online_test)) { bezahlt = true; tarif = null; }
  }
  if (!bezahlt) {
    // Eigene Schau-Widgets bleiben frei (Live-Demo auf clickzauber.de).
    const frei = (process.env.DEMO_SLUGS || 'clickzauberhochzeit')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!frei.includes(slug)) {
      // Kurz cachen: nach der Zahlung soll das Widget schnell erscheinen.
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.status(402).json({ error: 'kein tarif' });
    }
  }
  // Tarif-Grenze auch hier, nicht nur beim Anlegen: vor der Zahlung darf man
  // beliebig viele Entwürfe bauen. Nach der Zahlung gehen nur so viele live,
  // wie der Tarif erlaubt — die ältesten zuerst. Sonst wäre die Grenze aus
  // save.js durch Bauen-vor-dem-Bezahlen umgehbar.
  if (bezahlt && tarif && tarif.widgets > 0 && w.tenant_id) {
    const { data: erlaubt } = await db
      .from('widgets')
      .select('slug')
      .eq('tenant_id', w.tenant_id)
      .neq('status', 'papierkorb')
      .order('created_at', { ascending: true })
      .limit(tarif.widgets);
    if (!(erlaubt || []).some((x) => x.slug === slug)) {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res.status(402).json({ error: 'tarif-grenze', grenze: tarif.widgets });
    }
  }

  if (ein.pausiert) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.status(200).json({
      pausiert: true,
      pausiert_text: ein.pausiert_text || 'Zurzeit nehmen wir keine neuen Anfragen an. Schreiben Sie uns gern direkt.'
    });
  }

  const { data: v } = await db
    .from('widget_versions')
    .select('config_json, version')
    .eq('widget_id', slug)
    .not('published_at', 'is', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!v) return res.status(404).json({ error: 'keine config' });

  // Belegung mitliefern — erspart dem Widget einen zweiten Netzaufruf.
  const b = w.belegung || {};
  // Fest eingeplante Kundentermine sperren den Tag ebenfalls. Genau diese
  // Zeile fehlte: ein im Cockpit eingebuchter Termin blieb im Widget wählbar,
  // weil nur handgesperrte Tage und Kalendertermine übertragen wurden. Ein Tag
  // gilt als dicht, sobald alle Räume vergeben sind — bei einem Raum also mit
  // dem ersten Termin. Abgesagte Termine zählen weiter mit; der Betreiber gibt
  // den Tag von Hand wieder frei.
  // Mehrere Aufträge pro Tag (Food Truck & Co., b.pro_tag): erst voll, wenn alle vergeben sind.
  const buchungen = (b.buchungen && typeof b.buchungen === 'object') ? b.buchungen : {};
  const vollBelegt = Object.keys(buchungen)
    .filter((t) => (buchungen[t] || []).length >= proTag(b));
  // Formulare mit Uhrzeit (Friseur & Co.): private Termine sperren nur ihre Zeit (lib/_termine.js),
  // den ganzen Tag nur, wenn sie ganztägig sind. Alle anderen: jeder Tag mit einem Termin im Kalender.
  const mitUhrzeit = ((v.config_json && v.config_json.steps) || []).some((s) => s && s.typ === 'termin');
  const antwort = {
    ...v.config_json,
    // Handgesperrte Tage, Termine aus dem angebundenen Kalender und fest
    // eingeplante Kundentermine zusammenführen.
    belegt: [...new Set([...(b.gesperrt || []), ...kalTage(b, mitUhrzeit), ...vollBelegt])].sort(),
    frei: b.frei || [],
    belegungsregel: (b.wochentage && b.wochentage.length) ? { wochentage: b.wochentage } : null,
    datenschutz_url: ein.datenschutz_url || null
  };

  // Uhrzeit-Termine: Mitarbeiter und Leistungen mitliefern. Arbeitszeiten nur
  // als Wochentage — die genauen freien Zeiten holt das Widget pro Tag.
  const steps = (v.config_json && v.config_json.steps) || [];
  if (w.tenant_id && steps.some((s) => s && s.typ === 'termin')) {
    const kt = (v.config_json && v.config_json.termin) || null;
    try {
      let ctx = await setupLaden(w.tenant_id);
      // Cockpit noch nie eingerichtet (z. B. vor dem neuen save.js veröffentlicht oder sql/28 kam später):
      // Mitarbeiter und Leistungen einmalig aus dem Konfigurator übernehmen. Danach gilt das Cockpit.
      if (kt && !ctx.personal.length && !ctx.setup.vorhanden && await ausKonfigurator(w.tenant_id, kt, true)) ctx = await setupLaden(w.tenant_id);
      // Inhaltsverzeichnis mit runden Kacheln (Cockpit → Leistungen & Regeln, sql/66)
      const sal = ctx.setup.salon && ctx.setup.salon.an ? ctx.setup.salon : null;
      const ohnePreis = !!(ein.funktionen && ein.funktionen.preis_gast === false);
      antwort.termin = {
        gefuehrt: kt ? kt.gefuehrt : undefined,
        salon: sal ? { an: true, hinweis: sal.hinweis || '', reihe: sal.reihe || 'tag', bild: sal.bild || '', bildText: sal.bildText || '', z: sal.z, waschen: { ...sal.waschen, preis: ohnePreis ? null : sal.waschen.preis }, wimpern: sal.wimpern || undefined, limit: sal.limit == null ? 3 : (+sal.limit || 0) } : undefined,
        personal: ctx.personal.filter((p) => p.aktiv !== false).map((p) => {
          const z = zeitenVon(p);
          return { id: p.id, name: p.name, tage: [0, 1, 2, 3, 4, 5, 6].filter((d) => Array.isArray(z[d]) && z[d].length) };
        }),
        leistungen: ctx.setup.leistungen.map((l) => ({ name: l.name, dauer: l.dauer, preis: l.preis == null ? null : l.preis, tr: l.tr || undefined, zuschlag: l.zuschlag || undefined, beratung: l.beratung || undefined,
          // Damen, Herren, Kinder: nur wenn die Funktion beim Betrieb an ist (js/cz-funktionen.js). Dann fragt das Formular „Für wen?“.
          fuer: ((ein.funktionen && ein.funktionen.damen_herren) || sal) && ['damen', 'herren', 'kinder'].includes(l.fuer) ? l.fuer : undefined,
          kat: sal && l.kat ? l.kat : undefined, haar: sal && l.haar ? true : undefined, farbe: sal && l.farbe ? true : undefined,
          waschen: sal && l.waschen ? true : undefined, ab: sal && l.ab ? true : undefined, info: sal && l.info ? l.info : undefined,
          wimpern: sal && !(sal.wimpern && sal.wimpern.an === false) && istW(l) ? true : undefined, neuset: sal && l.neuset ? l.neuset : undefined })),
        tage: ctx.setup.tage
      };
    } catch (e) { antwort.termin = { personal: [], leistungen: [], tage: 42 }; }
  }

  // Vernetzen: Partner, die der Betrieb unter dem Formular zeigt (nur mit Zustimmung
  // des Partners), und ob der Gast der Weitergabe an Partner zustimmen kann.
  if (w.tenant_id) {
    try {
      const [{ data: pa }, { count: kontakte }] = await Promise.all([
        db.from('netz_partner').select('partner_id, reihenfolge').eq('tenant_id', w.tenant_id).eq('zugestimmt', true).order('reihenfolge').limit(6),
        db.from('netz_verbindung').select('id', { count: 'exact', head: true }).eq('status', 'ok').or(`von.eq.${w.tenant_id},an.eq.${w.tenant_id}`)
      ]);
      const ids = (pa || []).map((x) => x.partner_id);
      if (ids.length) {
        const [{ data: ps }, { data: pws }] = await Promise.all([
          db.from('netz_profil').select('*').in('tenant_id', ids),
          db.from('widgets').select('slug, tenant_id, status, created_at, belegung').in('tenant_id', ids).eq('status', 'live').order('created_at', { ascending: true })
        ]);
        // Ausgebucht? Dann zeigt das Formular Partner, die an dem Tag frei sind (sql/41, frei_zeigen).
        // Dafür gehen nur die belegten Tage der Partner mit, keine Namen oder Anfragen.
        const heute = new Date().toISOString().slice(0, 10);
        const zeigIds = (ps || []).filter((x) => x.frei_zeigen !== false).map((x) => x.tenant_id);
        const { data: gb } = zeigIds.length ? await db.from('leads').select('tenant_id, termin').in('tenant_id', zeigIds).eq('status', 'gebucht').gte('termin', heute).limit(2000) : { data: [] };
        const zuVon = (id) => {
          const s = new Set(), wt = new Set();
          (pws || []).filter((x) => x.tenant_id === id).forEach((x) => {
            const bb = x.belegung || {};
            const rr = proTag(bb);
            (bb.gesperrt || []).concat(kalTage(bb)).forEach((t) => { if (t >= heute) s.add(t); });
            Object.keys(bb.buchungen || {}).forEach((t) => { if (t >= heute && (bb.buchungen[t] || []).length >= rr) s.add(t); });
            (bb.wochentage || []).forEach((d) => wt.add(d));
          });
          (gb || []).forEach((l) => { if (l.tenant_id === id && l.termin) s.add(l.termin); });
          return { zu: [...s].sort().slice(0, 600), zu_wt: [...wt] };
        };
        const host = (process.env.API_URL || 'https://clickzauber-api.vercel.app').replace(/\/$/, '');
        antwort.partner = ids.map((id) => {
          const pr = (ps || []).find((x) => x.tenant_id === id);
          if (!pr || !pr.name) return null;
          const pw = (pws || []).find((x) => x.tenant_id === id);
          return { name: pr.name, branche: pr.branche || 'sonstige', ort: pr.ort || '', text: String(pr.text || '').slice(0, 110),
            ws: pw ? pw.slug : null, bild: pr.personbild || pr.titelbild || null, link: pw ? host + '/share.html?w=' + encodeURIComponent(pw.slug) + '&von=' + encodeURIComponent(slug) : null,
            ...(pw && zeigIds.includes(id) ? zuVon(id) : {}) };
        }).filter(Boolean);
      }
      antwort.weitergabe = (kontakte || 0) > 0;
      // Gemeinsame Pakete (sql/36). Nur Partner, die zugestimmt haben.
      try {
        const { data: pks } = await db.from('netz_paket').select('id, titel, text, partner').eq('tenant_id', w.tenant_id).eq('aktiv', true).order('reihenfolge').limit(3);
        const alle = [...new Set((pks || []).flatMap((x) => x.partner || []))];
        if (alle.length) {
          const [{ data: np }, { data: nm }] = await Promise.all([
            db.from('netz_partner').select('partner_id').eq('tenant_id', w.tenant_id).eq('zugestimmt', true).in('partner_id', alle),
            db.from('netz_profil').select('tenant_id, name, branche').in('tenant_id', alle)
          ]);
          const okIds = new Set((np || []).map((x) => x.partner_id));
          antwort.pakete = (pks || []).map((pk) => ({ id: pk.id, titel: pk.titel, text: pk.text || '',
            partner: (pk.partner || []).filter((id) => okIds.has(id)).map((id) => { const x = (nm || []).find((y) => y.tenant_id === id); return x && x.name ? { name: x.name, branche: x.branche || '' } : null; }).filter(Boolean)
          })).filter((pk) => pk.partner.length);
        }
      } catch (e) { /* sql/36 fehlt noch */ }
    } catch (e) { /* Tabellen aus SQL 35 fehlen noch: Widget läuft ohne Partner */ }
  }

  // Preise in der Zusammenfassung (Funktion „preis_gast“, js/cz-funktionen.js): ausgeschaltet sieht der Gast nur seine Auswahl.
  if (ein.funktionen && ein.funktionen.preis_gast === false) antwort.summary = { ...(antwort.summary || {}), zeigePreis: false };

  // Antwortzeit-Abzeichen (sql/41). Nur wenn der Betrieb schnell ist, sonst steht nichts da.
  if (w.tenant_id) { try { const az = await antwortZeit(w.tenant_id); if (az && az.stufe) antwort.antwortzeit = az.stufe; } catch (e) {} }

  // Vertrauensabzeichen für das Website-Siegel (js/cz-siegel.js). Nur, wenn der Betrieb es zeigen möchte.
  if (w.tenant_id) {
    try {
      const [{ data: vt }, { data: np }] = await Promise.all([
        db.from('vertrauen').select('punkte').eq('tenant_id', w.tenant_id).maybeSingle(),
        db.from('netz_profil').select('rang_zeigen').eq('tenant_id', w.tenant_id).maybeSingle()
      ]);
      const s = vt ? stufeVon(vt.punkte) : -1;
      if (s > -1 && !(np && np.rang_zeigen === false)) antwort.vertrauen = s;
    } catch (e) {}
  }

  // Kurz gecacht: plant der Betreiber einen Termin fest ein, soll der Tag
  // draußen zügig rot werden. 30 Sekunden sind der Kompromiss zwischen
  // Serverlast und „das Widget zeigt noch den alten Stand".
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=30');
  res.status(200).json(antwort);
}
