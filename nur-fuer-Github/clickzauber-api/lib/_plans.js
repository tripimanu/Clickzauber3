// Preise (zentral), seit 02.10.2026: zwei Preise nach Branche, ein Formular pro Konto.
// Welcher Preis gilt, entscheidet die Vorlage des Formulars (stufeVon), nie die Auswahl im Browser.
// Jahrespreis = 10 Monate (2 gratis). Beträge in Euro; planPrice rechnet in Cent für Stripe um.
export const PLANS = {
  service: { id: 'service', name: 'Service', widgets: 1, monthly: 79, yearly: 790, features: ['1 Formular live, mit Teilen-Link und QR-Code', 'Cockpit mit Terminen und Anfragen', 'E-Mail und Push bei jeder Anfrage', 'Vernetzen mit anderen Betrieben, ohne Provision'] },
  projekt: { id: 'projekt', name: 'Projekt', widgets: 1, monthly: 199, yearly: 1990, features: ['1 Formular live, mit Teilen-Link und QR-Code', 'Richtpreis und Vorprüfung schon im Formular', 'Anfragen mit geschätztem Auftragswert', 'Vernetzen mit anderen Betrieben, ohne Provision', 'Antwort am selben Werktag'] },
  // Alte Tarife: nicht mehr buchbar. Bleiben, damit laufende Abos, Sonderpreise und Berichte lesbar bleiben.
  pilot: { id: 'pilot', name: 'Pilot', widgets: 1, monthly: 0.10, yearly: 1.20, alt: true, versteckt: true, features: [] },
  start: { id: 'start', name: 'Start', widgets: 1, monthly: 199, yearly: 1990, alt: true, versteckt: true, features: [] },
  duo:   { id: 'duo', name: 'Duo', widgets: 2, monthly: 349, yearly: 3490, alt: true, versteckt: true, features: [] },
  unlim: { id: 'unlim', name: 'Unbegrenzt', widgets: 0, monthly: 599, yearly: 5990, alt: true, versteckt: true, features: [] }
};
export const STUFEN = ['service', 'projekt'];
// Einrichtung durch clickzauber: einmalig, auf Wunsch beim ersten Bezahlen dazu.
export const EINRICHTUNG_EURO = 129;

// Vorlagen (zielgruppe im Formular) mit kleinem Auftragswert. Alles andere zahlt „Projekt“.
// Dieselbe Liste steht in clickzauber-anmelden.html (STUFE_SERVICE) — bei Änderungen beide anpassen.
const SERVICE = new Set(['friseur', 'barbier', 'kosmetik', 'nagel', 'wimpern', 'massage', 'tattoo', 'musik', 'fotovideo', 'floristik', 'deko', 'konditorei', 'makler', 'finanzierung', 'versicherung', 'agentur', 'steuer']);
export function stufeVon(zg) { return SERVICE.has(String(zg || '').trim().toLowerCase()) ? 'service' : 'projekt'; }

// Stufe aus dem ältesten Formular des Betriebs. null = noch kein Formular gespeichert.
export async function stufeVomKonto(db, tenantId) {
  if (!tenantId) return null;
  const { data: w } = await db.from('widgets').select('slug, branche').eq('tenant_id', tenantId).neq('status', 'papierkorb')
    .order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (!w) return null;
  const { data: v } = await db.from('widget_versions').select('zg:config_json->>zielgruppe').eq('widget_id', w.slug)
    .order('version', { ascending: false }).limit(1).maybeSingle();
  return stufeVon((v && v.zg) || w.branche);
}

// Wie viele Formulare ein Konto anlegen darf. 0 = unbegrenzt.
// Ein Formular für alle; mehr nur für Betreiber und laufende Abos der alten Tarife Duo und Unbegrenzt.
export function formularGrenze(user) {
  if (istBetreiber(user)) return 0;
  const p = user && PLANS[user.plan];
  return p && p.alt && ['aktiv', 'gekündigt'].includes(user.plan_status) ? Math.max(p.widgets, 0) : 1;
}

// ── Zahlungs-Schalter ──────────────────────────────────────────────
// Pilotphase: Solange in Vercel ZAHLUNG_AKTIV nicht auf 1 steht, sind die Pilotbetriebe (siehe unten)
// kostenlos und ohne Formular-Grenze. Alle anderen zahlen den normalen Tarif über Stripe.
// Einschalten: in Vercel ZAHLUNG_AKTIV = 1 setzen und neu veröffentlichen. Ab dann zahlen auch die
// Pilotbetriebe — vorher für sie Tarife oder „kostenlos bis“ vergeben.
export const ZAHLUNG_AKTIV = process.env.ZAHLUNG_AKTIV === '1';

/* ── Pilotplätze ──────────────────────────────────────────────────────
   Solange ZAHLUNG_AKTIV aus ist, nutzen die nächsten PILOT_PLAETZE neuen Konten clickzauber kostenlos.
   Den Platz bekommt ein Konto bei der Anmeldung mit einer neuen E-Mail-Adresse (users.pilot_seit, sql/43).
   Ab dem fünften Konto gilt der normale Tarif. Betreiber-Konten belegen keinen Platz.
   Auf der Plattform-Seite lässt sich ein Platz von Hand vergeben oder entziehen. */
export const PILOT_PLAETZE = Math.max(0, parseInt(process.env.PILOT_PLAETZE || '4', 10) || 0);
const BETREIBER = () => (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

export function istBetreiber(user) { return !!(user && BETREIBER().includes(String(user.email || '').toLowerCase())); }

// Seit 09.10.2026: Solange ZAHLUNG_AKTIV aus ist, schaltet jedes Konto kostenlos live, ohne Tarif.
// Die Pilotplätze (pilot_seit) bleiben für den 40-%-Rabatt nach dem Verkaufsstart.
export function kostenlos(user) { return !ZAHLUNG_AKTIV && !(user && user.gesperrt_am); }

export function istPilot(user) { return !ZAHLUNG_AKTIV && !!(user && user.pilot_seit) && !(user && user.gesperrt_am); }

// Vergebene Plätze, älteste zuerst. null = sql/43 fehlt.
// Plätze aus einem Demo-Zugang (pilot_extra, sql/55) zählen nicht mit: sie kommen zu den automatischen hinzu.
export async function pilotListe(db) {
  const q = () => db.from('users').select('id, pilot_seit').not('pilot_seit', 'is', null)
    .order('pilot_seit', { ascending: true }).order('id', { ascending: true }).limit(200);
  let { data, error } = await q().or('pilot_extra.is.null,pilot_extra.eq.false');
  if (error) ({ data, error } = await q());   /* sql/55 noch nicht ausgeführt */
  return error ? null : (data || []);
}
export async function pilotFrei(db) {
  if (ZAHLUNG_AKTIV) return 0;
  const l = await pilotListe(db);
  return l ? Math.max(0, PILOT_PLAETZE - l.length) : 0;
}
// Neues Konto: Platz nehmen, falls noch einer frei ist. true = ist jetzt Pilot.
export async function pilotPlatzNehmen(db, user) {
  if (ZAHLUNG_AKTIV || !user || user.pilot_seit || BETREIBER().includes(String(user.email || '').toLowerCase())) return false;
  const vorher = await pilotListe(db);
  if (!vorher || vorher.length >= PILOT_PLAETZE) return false;
  const jetzt = new Date().toISOString();
  const { error } = await db.from('users').update({ pilot_seit: jetzt }).eq('id', user.id).is('pilot_seit', null);
  if (error) return false;
  // Zwei Anmeldungen gleichzeitig um den letzten Platz: die spätere gibt ihn zurück.
  const nachher = (await pilotListe(db)) || [];
  const platz = nachher.findIndex((x) => x.id === user.id);
  if (platz < 0 || platz >= PILOT_PLAETZE) { await db.from('users').update({ pilot_seit: null }).eq('id', user.id); return false; }
  user.pilot_seit = jetzt;
  return true;
}

export function planPrice(planId, cycle) {
  const p = PLANS[planId];
  if (!p) return null;
  const euro = cycle === 'yearly' ? p.yearly : p.monthly;
  return {
    amount: Math.round(euro * 100),
    interval: cycle === 'yearly' ? 'year' : 'month'
  };
}

// Ausgehandelter Preis für eine E-Mail-Adresse, sonst null.
// Der Listenpreis ist der Wunsch — was tatsächlich gilt, steht hier.
export async function sonderpreis(db, email, planId) {
  if (!email) return null;
  const { data } = await db
    .from('sonderpreise')
    .select('plan, monat, jahr, notiz')
    .eq('email', String(email).trim().toLowerCase())
    .maybeSingle();
  if (!data || data.monat == null) return null;
  // Ein Sonderpreis gilt für genau eine Preisstufe. Steht dort noch ein alter Tarif
  // (Start, Duo, Unbegrenzt), gilt er für die Stufe, die das Konto heute hat —
  // ein Konto hat ja nur noch ein Formular.
  if (planId && data.plan !== planId && !(PLANS[data.plan] && PLANS[data.plan].alt)) return null;
  const monat = Number(data.monat);
  // Ohne eigenen Jahrespreis gilt dieselbe Regel wie in der Liste: zehn Monate.
  const jahr = data.jahr != null ? Number(data.jahr) : Math.round(monat * 10 * 100) / 100;
  return { plan: data.plan, monthly: monat, yearly: jahr, notiz: data.notiz || null };
}

// Der Preis, der wirklich gilt — Sonderpreis vor Listenpreis.
export async function effektiverPreis(db, email, planId, cycle) {
  const p = PLANS[planId];
  if (!p) return null;
  const s = await sonderpreis(db, email, planId);
  const euro = cycle === 'yearly'
    ? (s ? s.yearly : p.yearly)
    : (s ? s.monthly : p.monthly);
  return {
    amount: Math.round(euro * 100),
    euro,
    interval: cycle === 'yearly' ? 'year' : 'month',
    sonder: !!s,
    listenpreis: cycle === 'yearly' ? p.yearly : p.monthly
  };
}
