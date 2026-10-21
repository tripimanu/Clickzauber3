// GET  /api/kalender?widget=…            → Stand der Anbindung (für das Cockpit)
// POST /api/kalender { token, widget, url }   → Feed hinterlegen und sofort einlesen
// POST /api/kalender { token, widget, url:'' } → Anbindung entfernen
// POST /api/kalender { token, widget, abo:1 } → Abo-Adresse für den eigenen Kalender holen
// GET  /api/kalender?widget=…&sync=1      → neu einlesen (auch per Cron)
import { db, cors, body, userByToken } from './_lib.js';
import { randomBytes } from 'crypto';
import { icalLesen } from './_ical.js';
import { feedLesen } from './_kalender-lesen.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── Kalender-Abo je Konto: gilt für alle Formulare, auch künftige ─────
  //   POST { token, abo:1 }            → Adresse holen (Schlüssel wird einmal erzeugt)
  //   POST { token, abo_stand:1 }      → abgerufen? bestätigt?
  //   POST { token, abo_bestaetigen:1 } → Probe-Termin gesehen, Kalender gilt als verbunden
  if (req.method === 'POST') {
    const pb = body(req);
    if (pb.abo || pb.abo_stand || pb.abo_bestaetigen) return kontoAbo(req, res, pb);
  }

  const widget = String(req.query.widget || (req.method === 'POST' ? body(req).widget : '') || '');
  if (!widget) return res.status(400).json({ error: 'widget fehlt' });

  const { data: w } = await db.from('widgets').select('id, slug, name, tenant_id, belegung').eq('slug', widget).single();
  if (!w) return res.status(404).json({ error: 'widget unbekannt' });
  const bel = w.belegung || {};

  if (req.method === 'GET') {
    // Seit 15.10.2026: Adresse des eigenen Kalenders und Fehlertext nur für den Betrieb selbst (oder den Betreiber).
    // Vorher bekam sie jeder, der den Namen des Formulars kannte (steht im Einbau-Code auf der Website).
    // Eine Google-Kalender-Adresse („privat“) zeigt den ganzen Kalender des Inhabers.
    const tk = String(req.query.token || '');
    let darf = !!(process.env.ADMIN_TOKEN && tk === process.env.ADMIN_TOKEN);
    if (!darf && tk && tk !== 'demo') { const u = await userByToken(tk); darf = !!(u && u.tenant_id && w.tenant_id === u.tenant_id); }
    // Neu einlesen, wenn der Betrieb es verlangt oder der Stand älter als 15 Minuten ist.
    const alt = !bel.kal_stand || (Date.now() - Date.parse(bel.kal_stand)) > 15 * 60e3;
    if (bel.kal_url && ((req.query.sync === '1' && darf) || alt)) {
      await feedLesen({ ...w, belegung: bel }, { timeout: 8000 });
      const { data: neu } = await db.from('widgets').select('belegung').eq('id', w.id).maybeSingle();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(stand((neu && neu.belegung) || bel, false, darf));
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(stand(bel, false, darf));
  }

  if (req.method === 'POST') {
    const { token, url, abo } = body(req);
    const istAdmin = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
    const user = istAdmin ? null : await userByToken(token);
    if (!istAdmin && !user) return res.status(401).json({ error: 'nicht angemeldet' });
    if (!istAdmin && w.tenant_id && w.tenant_id !== user.tenant_id) return res.status(403).json({ error: 'kein Zugriff' });

    // ── Abo-Adresse: clickzauber → eigener Kalender ──────────────────
    // Der Betreiber trägt diese Adresse einmal in seinen Kalender ein, dann
    // erscheinen alle fest eingeplanten Termine dort von selbst. Der Schlüssel
    // wird beim ersten Mal erzeugt und bleibt danach gleich.
    if (abo) {
      let key = bel.abo_key;
      if (!key || String(key).length < 20) {
        key = schluessel();
        await speichern(w.id, { ...bel, abo_key: key });
      }
      return res.status(200).json({ ok: true, abo_key: key });
    }

    // Leere Adresse = Anbindung lösen. Manuell gesperrte Tage bleiben erhalten.
    if (!String(url || '').trim()) {
      const neu = { ...bel };
      ['kal_url', 'kal_tage', 'kal_ganz', 'kal_zeiten', 'kal_termine', 'kal_stand', 'kal_fehler', 'kal_fehler_seit', 'kal_fehler_gemeldet'].forEach((k) => delete neu[k]);
      await speichern(w.id, neu);
      return res.status(200).json({ ok: true, verbunden: false });
    }

    const r = await icalLesen(url);
    if (r.fehler) return res.status(400).json({ error: r.fehler });

    const neu = { ...bel, kal_url: String(url).trim(), kal_tage: r.tage, kal_ganz: r.ganz, kal_termine: r.termine, kal_stand: new Date().toISOString(), kal_fehler: null };
    delete neu.kal_fehler_seit; delete neu.kal_fehler_gemeldet;
    await speichern(w.id, neu);
    await feedLesen({ ...w, belegung: neu }, { timeout: 8000 }).catch(() => {});   // genaue Zeiten und Mitarbeiter
    return res.status(200).json({ ok: true, verbunden: true, ...stand(neu, true) });
  }

  return res.status(405).json({ error: 'Methode nicht erlaubt' });
}

async function kontoAbo(req, res, p) {
  const user = await userByToken(p.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const tid = user.tenant_id;
  const { data: e, error } = await db.from('einstellungen').select('kal_abo_key, kal_abo_abruf_am, kal_abo_bestaetigt_am').eq('tenant_id', tid).maybeSingle();
  if (error) {
    // sql/46 fehlt noch: alter Weg über das erste Formular
    console.error('kalender abo (sql/46?):', error.message);
    return res.status(500).json({ ok: false, error: 'Der Kalender lässt sich gerade nicht einrichten. Bitte später erneut versuchen.' });
  }
  let key = e && e.kal_abo_key;
  if (p.abo && (!key || key.length < 20)) {
    // Hatte ein Formular schon einen Schlüssel, übernehmen wir ihn: bestehende Abos laufen weiter.
    const { data: ws } = await db.from('widgets').select('belegung').eq('tenant_id', tid);
    const alt = (ws || []).map((w) => w.belegung && w.belegung.abo_key).find((k) => k && String(k).length >= 20);
    key = alt || schluessel();
    await db.from('einstellungen').upsert({ tenant_id: tid, kal_abo_key: key }, { onConflict: 'tenant_id' });
  }
  let best = e && e.kal_abo_bestaetigt_am;
  if (p.abo_bestaetigen && key) {
    best = best || new Date().toISOString();
    await db.from('einstellungen').update({ kal_abo_bestaetigt_am: best }).eq('tenant_id', tid);
    try { const { aktualisieren } = await import('./_vertrauen.js'); await aktualisieren(tid, 0); } catch (x) { /* Punkte kommen spätestens nachts */ }
  }
  return res.status(200).json({ ok: true, tenant: tid, abo_key: key || null, abgerufen: (e && e.kal_abo_abruf_am) || null, bestaetigt: best || null });
}

function speichern(id, belegung) {
  return db.from('widgets').update({ belegung, updated_at: new Date().toISOString() }).eq('id', id);
}

// Seit 15.10.2026 aus echtem Zufall (crypto). Math.random ist vorhersagbar, und mit dem Schlüssel liest man alle Termine samt Namen.
// Bestehende Schlüssel bleiben gültig.
function schluessel() {
  const z = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (const b of randomBytes(28)) s += z[b % z.length];
  return s;
}

// mitAbo nur für angemeldete Aufrufe: mit dem Abo-Schlüssel kann man den
// Termin-Feed samt Kundennamen lesen. Der offene GET liefert ihn deshalb nie.
function stand(bel, mitAbo, mitUrl = mitAbo) {
  return {
    abo_key: mitAbo ? (bel.abo_key || null) : undefined,
    verbunden: !!bel.kal_url,
    url: mitUrl ? (bel.kal_url || null) : null,
    tage: bel.kal_tage || [],
    termine: bel.kal_termine || 0,
    stand: bel.kal_stand || null,
    fehler_seit: bel.kal_fehler_seit || null,
    fehler: mitUrl ? (bel.kal_fehler || null) : (bel.kal_fehler ? 'Kalender nicht erreichbar.' : null),
    abo: !!bel.abo_key
  };
}
