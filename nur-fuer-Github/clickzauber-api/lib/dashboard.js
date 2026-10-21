// GET /api/dashboard?widget=clickzauberhochzeit&days=30  — Kennzahlen fürs Cockpit.
// widget=* liefert alle Formulare des Betriebs zusammen. Vorher zeigte das Cockpit
// immer nur ein Formular; Anfragen aus einem zweiten blieben unsichtbar.
import { db, cors, userByToken } from './_lib.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const widget = String(req.query.widget || '');
  const days = Math.min(parseInt(req.query.days || '30', 10), 365);
  if (!widget) return res.status(400).json({ error: 'widget fehlt' });
  const alle = widget === '*';

  // ── Zugang prüfen ─────────────────────────────────────────────────────
  // Anfragen enthalten Namen, E-Mail und Telefonnummern. Ohne diese Prüfung
  // könnte jeder mit der Widget-Kennung fremde Anfragen auslesen.
  const token = req.query.token || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'nicht angemeldet' });

  const istAdmin = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
  let slugs = [widget];
  let namen = {};

  if (istAdmin) {
    if (alle) return res.status(400).json({ error: 'Als Betreiber bitte ein Formular angeben.' });
  } else {
    const user = await userByToken(token);
    if (!user) return res.status(401).json({ error: 'nicht angemeldet' });

    if (alle) {
      if (!user.tenant_id) return res.status(400).json({ error: 'kein Betrieb hinterlegt' });
      const { data: ws } = await db.from('widgets')
        .select('slug, name').eq('tenant_id', user.tenant_id);
      slugs = (ws || []).map((w) => w.slug);
      (ws || []).forEach((w) => { namen[w.slug] = w.name || w.slug; });
    } else {
      const { data: w } = await db
        .from('widgets')
        .select('tenant_id, name')
        .eq('slug', widget)
        .maybeSingle();
      if (!w) return res.status(404).json({ error: 'widget unbekannt' });
      if (!w.tenant_id || w.tenant_id !== user.tenant_id) {
        return res.status(403).json({ error: 'kein Zugriff' });
      }
      namen[widget] = w.name || widget;
    }
  }

  // Kennzahlen sind personenbezogen — niemals zwischenspeichern.
  res.setHeader('Cache-Control', 'private, no-store');
  const now = Date.now();
  const since = new Date(now - days * 864e5).toISOString();
  const since60 = new Date(now - 60 * 864e5).toISOString();

  if (!slugs.length) {
    return res.status(200).json({
      widget, days, widgets: [],
      kpis: { anfragen: 0, starts: 0, quote: 0, avgWert: 0 },
      top: [], funnel: [], sources: [],
      series: new Array(30).fill(0), prev: new Array(30).fill(0),
      leads: []
    });
  }

  // Ohne sql/57 fehlen wv_am und wv_notiz: dann ohne diese beiden Spalten, damit das Cockpit nicht leer bleibt.
  const SP = 'id, widget_id, name, email, phone, value_est, status, ts, termin, answers, posten, verlauf, angebot_nr, angebot_am, angenommen_am, angenommen_von';
  const holeLeads = () => db.from('leads').select(SP + ', wv_am, wv_notiz').in('widget_id', slugs).gte('ts', since).order('ts', { ascending: false })
    .then((r) => r.error ? db.from('leads').select(SP).in('widget_id', slugs).gte('ts', since).order('ts', { ascending: false }) : r);
  const [{ data: evs }, { data: lds }, { data: lds60 }] = await Promise.all([
    db.from('events').select('type, session_id, answer_key, answer_value, step, ts').in('widget_id', slugs).gte('ts', since),
    holeLeads(),
    db.from('leads').select('value_est, ts').in('widget_id', slugs).gte('ts', since60)
  ]);
  const events = evs || [], leads = lds || [], leads60 = lds60 || [];

  const startSessions = new Set(events.filter(e => e.type === 'start').map(e => e.session_id));
  const starts = startSessions.size;
  const anfragen = leads.length;
  const quote = starts ? Math.round((anfragen / starts) * 1000) / 10 : 0;
  const werte = leads.map(l => Number(l.value_est)).filter(n => n > 0);
  const avgWert = werte.length ? Math.round(werte.reduce((a, b) => a + b, 0) / werte.length) : 0;

  // Meistgeklickte Antworten
  const counts = {};
  events.filter(e => e.type === 'answer' && e.answer_value)
    .forEach(e => { counts[e.answer_value] = (counts[e.answer_value] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, n]) => ({ label, n }));

  // Trichter: gestartet -> Frage beantwortet -> (letzte Frage) -> Anfrage
  const answeredSessions = new Set(events.filter(e => e.type === 'answer').map(e => e.session_id));
  const maxStep = events.filter(e => e.type === 'answer' && e.step != null).reduce((m, e) => Math.max(m, e.step), -1);
  const deepSessions = new Set(events.filter(e => e.type === 'answer' && e.step === maxStep).map(e => e.session_id));
  const pct = (a) => starts ? Math.round((a / starts) * 100) : 0;
  const funnel = [
    ['Helfer gestartet', starts, 100],
    ['Frage beantwortet', answeredSessions.size, pct(answeredSessions.size)]
  ];
  if (maxStep >= 1) funnel.push(['Bis zur letzten Frage', deepSessions.size, pct(deepSessions.size)]);
  funnel.push(['Anfrage abgeschickt', anfragen, pct(anfragen)]);

  // Herkunft: aus 'channel'-Events (?q= vom Teilen-Link)
  const src = {};
  events.filter(e => e.type === 'channel' && e.answer_value)
    .forEach(e => { src[e.answer_value] = (src[e.answer_value] || 0) + 1; });
  const srcTotal = Object.values(src).reduce((a, b) => a + b, 0);
  const sources = Object.entries(src).sort((a, b) => b[1] - a[1])
    .map(([label, n]) => [label, srcTotal ? Math.round((n / srcTotal) * 100) : 0]);

  // Verlauf: Anfragen pro Tag, letzte 30 Tage + Vorperiode
  function bucket(list, startMs, nDays) {
    const arr = new Array(nDays).fill(0);
    list.forEach(l => { const idx = Math.floor((new Date(l.ts).getTime() - startMs) / 864e5); if (idx >= 0 && idx < nDays) arr[idx]++; });
    return arr;
  }
  const series = bucket(leads60, now - 30 * 864e5, 30);
  const prev = bucket(leads60, now - 60 * 864e5, 30);

  // Je Formular eine Zeile — damit das Cockpit in der Gesamtansicht zeigen kann,
  // woher eine Anfrage kommt, und wie sich die Formulare zueinander verhalten.
  const jeFormular = slugs.map((s) => ({
    slug: s,
    name: namen[s] || s,
    anfragen: leads.filter((l) => l.widget_id === s).length
  })).sort((a, b) => b.anfragen - a.anfragen);

  res.status(200).json({
    widget, days, widgets: jeFormular, namen,
    kpis: { anfragen, starts, quote, avgWert },
    top, funnel, sources, series, prev,
    leads: leads.slice(0, 50)
  });
}
