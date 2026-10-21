// GET /api/admin?key=…  — Vertriebsübersicht: wer hat gebaut, wer hat gekauft, welche Empfehlungen.
// Nur für den Betreiber. Schlüssel = ADMIN_TOKEN.
import { db, cors } from './_lib.js';
import { PLANS } from './_plans.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if ((req.query.key || '') !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'kein Zugriff' });
  }

  const tage = Math.min(Math.max(parseInt(req.query.tage || '90', 10) || 90, 1), 730);
  const seit = new Date(Date.now() - tage * 864e5).toISOString();

  const [nutzer, interessen, widgets, leads, alle] = await Promise.all([
    db.from('users')
      // select('*'): fehlt eine neuere Spalte, lädt die Liste trotzdem. Zurück geht nur, was unten in personen steht.
      .select('*')
      .gte('created_at', seit)
      .order('created_at', { ascending: false })
      .limit(1000),
    db.from('interesse')
      .select('email, anfragen_monat, auftragswert, auftragswert_zahl, erfolgskriterium, nutzungsdauer, empfehlungscode, geworben_von, updated_at')
      .limit(1000),
    db.from('widgets')
      .select('slug, name, status, tenant_id, created_at')
      .gte('created_at', seit)
      .limit(2000),
    db.from('leads')
      .select('widget_id, ts')
      .gte('ts', seit)
      .limit(5000),
    // Alle Konten unabhängig vom Zeitraum — für die Gesamtzahl.
    db.from('users').select('plan_status, gesperrt_am').limit(10000)
  ]);

  // Netzwerk-Sperre je Betrieb für die Plattform-Seite (fehlt die Tabelle, bleibt es leer)
  const { data: np } = await db.from('netz_profil').select('tenant_id, gesperrt').limit(5000).then((r) => r, () => ({}));
  const netzVon = Object.fromEntries((np || []).map((x) => [x.tenant_id, x]));
  const int = Object.fromEntries((interessen.data || []).map((i) => [i.email, i]));
  const leadsJeWidget = {};
  (leads.data || []).forEach((l) => { leadsJeWidget[l.widget_id] = (leadsJeWidget[l.widget_id] || 0) + 1; });

  // Empfehlungen: wer wurde von wem geworben, und hat der Geworbene bezahlt?
  const zahlt = new Set((nutzer.data || []).filter((u) => u.plan_status === 'aktiv').map((u) => u.email));
  // Rabatt gilt erst, wenn der Werber selbst 30 Tage zahlender Kunde ist.
  // Wer nie genutzt hat, kann nichts glaubhaft empfehlen — und wir kaufen keine wertlosen Leads.
  const SPERRE = 30;
  const codeZuMail = Object.fromEntries((interessen.data || []).filter((i) => i.empfehlungscode).map((i) => [i.empfehlungscode, i.email]));
  const seitTagen = Object.fromEntries((nutzer.data || []).map((u) => [u.email, Math.floor((Date.now() - Date.parse(u.created_at)) / 864e5)]));

  const empfehlungen = {};
  (interessen.data || []).forEach((i) => {
    if (!i.geworben_von) return;
    const e = (empfehlungen[i.geworben_von] = empfehlungen[i.geworben_von] || {
      code: i.geworben_von, geworben: 0, abgeschlossen: 0, wer: []
    });
    e.geworben++;
    if (zahlt.has(i.email)) e.abgeschlossen++;
    e.wer.push({ email: i.email, zahlt: zahlt.has(i.email) });
  });

  Object.values(empfehlungen).forEach((e) => {
    const werber = codeZuMail[e.code] || null;
    const tage = werber ? (seitTagen[werber] ?? 0) : 0;
    e.werber = werber;
    e.werber_zahlt = werber ? zahlt.has(werber) : false;
    e.werber_tage = tage;
    e.freigeschaltet = e.werber_zahlt && tage >= SPERRE;
    e.verdient = Math.min(40, e.abgeschlossen * 10);
    e.rabatt = e.freigeschaltet ? e.verdient : 0;
    e.grund = e.freigeschaltet ? null
      : (!e.werber_zahlt ? 'Werber zahlt selbst nicht' : 'erst ab Tag ' + SPERRE + ' (heute Tag ' + tage + ')');
  });

  const preise = Object.fromEntries(Object.values(PLANS).map((x) => [x.id, x.monthly]));
  const heute = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  const personen = (nutzer.data || []).map((u) => {
    const i = int[u.email] || {};
    const meine = (widgets.data || []).filter((w) => w.tenant_id === u.tenant_id || w.tenant_id === u.id);
    const anfragen = meine.reduce((s, w) => s + (leadsJeWidget[w.slug] || 0), 0);
    // Erstkunde ohne Abo, noch in der kostenlosen Zeit: zählt als Kunde, bringt aber noch nichts ein.
    const gratis = !!(u.kostenlos_bis && u.kostenlos_bis >= heute && !u.stripe_sub);
    const mrr = u.plan_status === 'aktiv' && !gratis
      ? (u.cycle === 'yearly' ? (preise[u.plan] || 0) * 10 / 12 : (preise[u.plan] || 0))
      : 0;
    return {
      email: u.email,
      name: [u.vorname, u.nachname].filter(Boolean).join(' ') || null,
      firma: u.firma || null,
      telefon: u.telefon || null,
      plan: u.plan || null,
      cycle: u.cycle || null,
      status: u.plan_status || 'inaktiv',
      seit: u.created_at,
      bestaetigt: !!u.verified,
      mrr: Math.round(mrr * 100) / 100,
      widgets: meine.length,
      slugs: meine.map((w) => ({ slug: w.slug, name: w.name, status: w.status, anfragen: leadsJeWidget[w.slug] || 0 })),
      konto: true,
      gesperrt: !!u.gesperrt_am,
      gesperrt_am: u.gesperrt_am || null,
      gesperrt_grund: u.gesperrt_grund || null,
      komplett: !!u.komplett_gesperrt,
      pilot_seit: u.pilot_seit || null,
      einladung_code: u.einladung_code || null,
      eingeloest_am: u.eingeloest_am || null,
      test_bis: u.test_bis || null,
      notiz: u.admin_notiz || null,
      netz: u.tenant_id && netzVon[u.tenant_id] ? { gesperrt: !!netzVon[u.tenant_id].gesperrt } : null,
      kostenlos_bis: u.kostenlos_bis || null,
      gratis,
      abo: !!u.stripe_sub,
      live: meine.filter((w) => w.status === 'live').length,
      anfragen,
      // Funnel-Antworten
      anfragen_monat: i.anfragen_monat || null,
      auftragswert: i.auftragswert || null,
      auftragswert_zahl: i.auftragswert_zahl || null,
      erfolgskriterium: i.erfolgskriterium || null,
      nutzungsdauer: i.nutzungsdauer || null,
      empfehlungscode: i.empfehlungscode || null,
      geworben_von: i.geworben_von || null,
      // Vertriebs-Stufe
      stufe: u.plan_status === 'aktiv' ? 'kunde'
        : (meine.length ? 'gebaut'
          : (i.email ? 'qualifiziert' : (u.verified ? 'konto' : 'unbestaetigt')))
    };
  });

  // Interessenten ohne Konto (haben den Funnel ausgefüllt, aber nie bestätigt)
  const mitKonto = new Set(personen.map((p) => p.email));
  (interessen.data || []).forEach((i) => {
    if (mitKonto.has(i.email)) return;
    personen.push({
      email: i.email, name: null, firma: null, telefon: null,
      plan: null, cycle: null, status: 'kein Konto', seit: i.updated_at,
      bestaetigt: false, mrr: 0, widgets: 0, live: 0, anfragen: 0,
      anfragen_monat: i.anfragen_monat, auftragswert: i.auftragswert,
      auftragswert_zahl: i.auftragswert_zahl, erfolgskriterium: i.erfolgskriterium,
      nutzungsdauer: i.nutzungsdauer, empfehlungscode: i.empfehlungscode,
      geworben_von: i.geworben_von, stufe: 'nur Funnel'
    });
  });

  const kunden = personen.filter((p) => p.status === 'aktiv');
  const summe = {
    personen: personen.length,
    kunden: kunden.length,
    mrr: Math.round(kunden.reduce((s, p) => s + p.mrr, 0) * 100) / 100,
    arr: Math.round(kunden.reduce((s, p) => s + p.mrr, 0) * 12 * 100) / 100,
    gebaut: personen.filter((p) => p.widgets > 0).length,
    funnel: personen.filter((p) => p.erfolgskriterium).length,
    zahlung_offen: personen.filter((p) => p.status === 'zahlung offen').length,
    widgets_live: personen.reduce((s, p) => s + p.live, 0),
    anfragen: personen.reduce((s, p) => s + p.anfragen, 0),
    konten_gesamt: (alle.data || []).length,
    zahlend_gesamt: (alle.data || []).filter((u) => u.plan_status === 'aktiv').length,
    gesperrt: (alle.data || []).filter((u) => u.gesperrt_am).length
  };

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true, tage, summe, personen,
    empfehlungen: Object.values(empfehlungen).sort((a, b) => b.abgeschlossen - a.abgeschlossen)
  });
}
