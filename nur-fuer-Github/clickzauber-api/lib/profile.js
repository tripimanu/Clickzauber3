// /api/profile
//   GET  ?token=…            → aktuellen User zurückgeben (ohne Token-Feld)
//   POST { token, ...felder } → Profil speichern
import { db, cors, body, userByToken } from './_lib.js';
import { istPilot, stufeVon, kostenlos } from './_plans.js';

const FIELDS = ['vorname', 'nachname', 'firma', 'strasse', 'plz_ort', 'telefon', 'ustid', 'website'];

// Gleiche Einteilung wie js/cz-branchen.js (vier Kategorien, drei Cockpit-Typen)
const TERMIN_ZG = ['friseur', 'nagel', 'wimpern', 'kosmetik', 'barbier', 'massage', 'tattoo'];
const AUFTRAG_ZG = ['foodtruck', 'fotovideo', 'catering', 'musik', 'floristik', 'deko', 'konditorei'];
const PIPELINE_ZG = ['solar', 'waermepumpe', 'dach', 'fenster', 'elektro', 'makler', 'finanzierung', 'versicherung', 'agentur', 'steuer'];
function artVon(zg, gefuehrt) {
  if (TERMIN_ZG.includes(zg)) return 'termin';
  if (PIPELINE_ZG.includes(zg)) return 'pipeline';
  if (AUFTRAG_ZG.includes(zg)) return 'auftrag';
  if (!zg && gefuehrt) return 'termin';
  return 'location';
}

function clean(u) {
  if (!u) return null;
  const { token, ...rest } = u;
  return rest;
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const token = req.query.token || '';
    // Betreiber-Zugriff: derselbe Zweig wie in dashboard.js, damit die
    // Betreiber-Ansicht des Kunden-Cockpits nicht am Login-Gate hängen bleibt.
    if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) {
      // Seit 13.10.2026 mit ?widget= dieses Formular samt Art. Sonst nahm das Cockpit die Formulare des Betreiber-Geräts
      // und zeigte das Location-Cockpit statt z. B. der Termin-Ansicht.
      const slug = String((req.query && req.query.widget) || '').trim().slice(0, 80);
      let widgets;
      if (slug) {
        widgets = [];
        const { data: w } = await db.from('widgets').select('slug, name, status').eq('slug', slug).maybeSingle().then((r) => r, () => ({}));
        if (w) {
          const { data: vs } = await db.from('widget_versions')
            .select('version, zg:config_json->>zielgruppe, tm:config_json->termin->>gefuehrt, au:config_json->auftrag')
            .eq('widget_id', slug).order('version', { ascending: false }).limit(1).then((r) => r, () => ({}));
          const v = (vs && vs[0]) || {};
          w.zielgruppe = v.zg || null; w.art = (v.zg || v.tm) ? artVon(v.zg, v.tm === 'true') : null; w.auftrag = v.au || null;
          widgets = [w];
        }
      }
      return res.status(200).json({ ok: true, admin: true, user: { vorname: 'Betreiber', firma: 'clickzauber', admin: true }, widgets });
    }
    const user = await userByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

    // Entwickler-Konto: ein einziges Konto ist Betreiber — tripi.manu@gmail.com.
    // Es bekommt admin:true und damit Code, Link und QR-Code ohne Tarif; das ist
    // derselbe Zweig, den der Konfigurator schon auswertet. Alle anderen Konten
    // sind Kundenkonten und brauchen einen bezahlten Tarif.
    //
    // Das Passwort steht bewusst NICHT hier. Es liegt — wie bei jedem Kunden —
    // nur als Hashwert in der Datenbank und wird beim Anmelden geprüft. Ein
    // Passwort im Quelltext wäre über GitHub öffentlich lesbar und hätte den
    // Betreiber-Zugang für jeden geöffnet.
    const ADMINS = (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const istEntwickler = ADMINS.includes(String(user.email || '').toLowerCase());

    // Widgets des Betriebs mitliefern. Das Cockpit baute seine Auswahl bisher
    // nur aus dem Browser-Speicher — auf einem anderen Gerät fehlten Widgets,
    // und deren Anfragen blieben unsichtbar. Sortiert: wo zuletzt etwas ankam.
    let widgets = [], papierkorb = [];
    if (user.tenant_id) {
      const { data: ws } = await db.from('widgets')
        .select('slug, name, status, updated_at').eq('tenant_id', user.tenant_id);
      // Papierkorb (sql/74): nicht als Formular liefern, sondern getrennt, damit das Cockpit „Zurückholen“ anbietet.
      // geloescht_am wird extra gelesen: Fehlt die Spalte noch (sql/74 nicht eingespielt), gilt updated_at und das Profil geht trotzdem.
      const pkRoh = (ws || []).filter((w) => w.status === 'papierkorb');
      if (pkRoh.length) {
        const { data: gz } = await db.from('widgets').select('slug, geloescht_am').in('slug', pkRoh.map((w) => w.slug)).then((r) => r, () => ({}));
        const am = {}; (gz || []).forEach((x) => { am[x.slug] = x.geloescht_am; });
        papierkorb = pkRoh.map((w) => { const t = am[w.slug] || w.updated_at; return { slug: w.slug, name: w.name || w.slug, am: t, bis: new Date((Date.parse(t) || Date.now()) + 30 * 864e5).toISOString() }; });
      }
      widgets = (ws || []).filter((w) => w.status !== 'papierkorb').map((w) => ({ slug: w.slug, name: w.name, status: w.status }));
      // Art des Formulars für das Cockpit: termin (Friseur & Co.), auftrag (Catering, Food Truck, Foto) oder location.
      if (widgets.length) {
        const { data: vs } = await db.from('widget_versions')
          .select('widget_id, version, zg:config_json->>zielgruppe, tm:config_json->termin->>gefuehrt, au:config_json->auftrag')
          .in('widget_id', widgets.map(w => w.slug)).order('version', { ascending: false }).limit(500)
          .then((r) => r, () => ({}));
        const zu = {};
        (vs || []).forEach(v => { if (!zu[v.widget_id]) zu[v.widget_id] = v; });
        widgets.forEach(w => { const v = zu[w.slug] || {}; w.zielgruppe = v.zg || null; w.art = (v.zg || v.tm) ? artVon(v.zg, v.tm === 'true') : null; w.auftrag = v.au || null; });
      }
      if (widgets.length) {
        const { data: ld } = await db.from('leads')
          .select('widget_id, ts').in('widget_id', widgets.map(w => w.slug))
          .order('ts', { ascending: false }).limit(200);
        const letzte = {};
        (ld || []).forEach(l => { if (!letzte[l.widget_id]) letzte[l.widget_id] = l.ts; });
        widgets.forEach(w => { w.letzte_anfrage = letzte[w.slug] || null; });
        widgets.sort((a, b) => String(b.letzte_anfrage || '').localeCompare(String(a.letzte_anfrage || '')));
      }
    }
    const u = clean(user);
    // Pilotbetrieb: kostenlos, solange die Zahlung aus ist. Der Tarif in der Datenbank bleibt unberührt.
    // Seit 09.10.2026: Solange die Zahlung aus ist, gilt jedes Konto wie ein Pilot (kein Tarif, kein Bezahlen). pilotplatz = echter Pilotplatz.
    u.pilotplatz = istPilot(user);
    u.kostenlos = kostenlos(user);
    u.pilot = u.pilotplatz || u.kostenlos;
    // Preisstufe nach der Vorlage des Formulars (lib/_plans.js). null = noch kein Formular.
    const mitZg = widgets.find((w) => w.zielgruppe);
    u.stufe = mitZg ? stufeVon(mitZg.zielgruppe) : null;
    // Testzugang aus dem Einladungs-Link (sql/67): Countdown in den Einstellungen (js/cz-test.js).
    u.test_bis = user.test_bis || null;
    u.bestaetigt = !!user.verified;
    u.eingeloest_am = user.eingeloest_am || null;
    return res.status(200).json({ ok: true, admin: istEntwickler || undefined, user: u, widgets, papierkorb });
  }

  if (req.method === 'POST') {
    const p = body(req);
    if (process.env.ADMIN_TOKEN && p.token === process.env.ADMIN_TOKEN) {
      return res.status(403).json({ ok: false, error: 'In der Betreiber-Ansicht lassen sich keine Kundendaten ändern.' });
    }
    const user = await userByToken(p.token);
    if (!user) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });

    const patch = {};
    FIELDS.forEach(f => { if (p[f] != null) patch[f] = String(p[f]).trim(); });
    // Sprache des Cockpits — danach richten sich die Mails an den Betrieb
    if (p.sprache != null && ['de', 'sq', 'en', 'fr', 'it', 'es', 'tr'].includes(p.sprache)) patch.sprache = p.sprache;
    // Einführungs-Touren und erledigte Missionen („m:ID“, js/cz-missionen.js): jede nur einmal —
    // gemerkt pro Person, nicht pro Gerät (sql/42). So kommt keine Feier auf einem zweiten Gerät noch einmal.
    const dazu = [];
    const tk = String(p.tour_gesehen || '');
    if (/^[a-z]{2,20}$/.test(tk)) dazu.push(tk);
    if (Array.isArray(p.msn_gesehen)) p.msn_gesehen.slice(0, 60).forEach((m) => { m = String(m); if (/^[a-z0-9_]{2,24}$/.test(m)) dazu.push('m:' + m); });
    if (dazu.length && Array.isArray(user.touren)) {
      const neu = [...new Set(dazu)].filter((x) => !user.touren.includes(x));
      if (neu.length) patch.touren = [...user.touren, ...neu].slice(0, 150);
    }
    if (!Object.keys(patch).length) return res.status(200).json({ ok: true });

    const { data, error } = await db.from('users').update(patch)
      .eq('id', user.id).select('*').single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, user: clean(data) });
  }

  res.status(405).json({ ok: false });
}
