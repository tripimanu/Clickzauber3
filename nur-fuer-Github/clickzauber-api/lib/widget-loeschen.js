// POST /api/widget-loeschen { token, widget, name }             → in den Papierkorb (seit 21.10.2026, sql/74)
// POST /api/widget-loeschen { token, widget, aktion:'zurueck' }  → aus dem Papierkorb zurückholen (Betrieb oder Betreiber)
// POST /api/widget-loeschen { token:ADMIN_TOKEN, widget, aktion:'endgueltig' } → sofort endgültig (nur Betreiber)
// Löschen löscht nicht mehr sofort: Das Formular geht vom Netz (status 'papierkorb'), Kennung, Anfragen und Termine bleiben.
// Der Nachtlauf (api/nacht.js 'papierkorb') löscht es nach 30 Tagen endgültig. Zurückholen setzt den alten Stand
// (status_vorher), der Einbau-Code auf der Website geht dann sofort wieder. Betriebe müssen den Namen des Formulars
// eintippen (name), sonst lehnt der Server ab. Löscht oder holt der Betrieb selbst, bekommt Manuel Push und Mail.
// Zurückholen geht nicht, wenn das Konto inzwischen ein anderes Formular hat und nur eins haben darf (lib/_plans.js).
import { db, cors, body, userByToken, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { beratungsFotosWeg } from './_fotos.js';
import { betreiberPush } from './demo-zugang.js';
import { formularGrenze } from './_plans.js';

export const PAPIERKORB_TAGE = 30;
const norm = (s) => String(s || '').toLowerCase().replace(/[„“”"'’‘`´]/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tagText = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
const bisVon = (am) => new Date((Date.parse(am) || Date.now()) + PAPIERKORB_TAGE * 864e5).toISOString();

async function manuelMelden(titel, zeilen, akte) {
  await betreiberPush(titel, zeilen[0], akte ? 'clickzauber-plattform.html#akte-' + akte : 'clickzauber-plattform.html').catch(() => null);
  if (!MAIL_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject: 'clickzauber: ' + titel, html: zeilen.map((z) => '<p>' + esc(z) + '</p>').join('') })
  }).catch(() => null);
}

/* Das erste Konto des Betriebs (Inhaber): für die Formular-Grenze und den Link in die Kundenakte. */
async function inhaber(tid) {
  if (!tid) return null;
  const { data } = await db.from('users').select('*').eq('tenant_id', tid).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data || null;
}

/* Namen, die zum Löschen gelten: Name des Formulars, Kennung, Name und Betrieb aus der neuesten Fassung. */
async function namen(w, slug) {
  const n = [w.name, slug];
  const { data: v } = await db.from('widget_versions').select('n:config_json->>name, b:config_json->>betrieb').eq('widget_id', slug)
    .order('version', { ascending: false }).limit(1).maybeSingle().then((r) => r, () => ({}));
  if (v) n.push(v.n, v.b);
  return n.filter(Boolean).map(norm);
}

/* Endgültig löschen: das Formular samt allem, was daran hängt. Nachtlauf und Betreiber. */
export async function endgueltigLoeschen(slug) {
  const { data: w } = await db.from('widgets').select('id, tenant_id, name').eq('slug', slug).maybeSingle();
  if (!w) return { ok: true, schon_weg: true, anfragen: 0 };
  const { count: anfragen } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('widget_id', slug);
  await db.from('widget_vergleich').delete().or(`slug_a.eq.${slug},slug_b.eq.${slug}`);
  await db.from('events').delete().eq('widget_id', slug);
  await beratungsFotosWeg((q) => q.eq('widget_id', slug));
  await db.from('leads').delete().eq('widget_id', slug);
  await db.from('widget_versions').delete().eq('widget_id', slug);
  await db.from('termine').delete().eq('widget_id', slug);
  const { error } = await db.from('widgets').delete().eq('slug', slug);
  if (error) return { ok: false, error: error.message };
  // Mitarbeiter und Termin-Einstellungen gelten für den ganzen Betrieb. Hat er danach kein Formular mit
  // Uhrzeit-Terminen mehr (auch keines im Papierkorb), räumen wir sie mit auf.
  const { data: rest } = await db.from('widgets').select('slug').eq('tenant_id', w.tenant_id);
  let mitTerminen = false;
  for (const r of rest || []) {
    const { data: v } = await db.from('widget_versions').select('config_json').eq('widget_id', r.slug)
      .order('version', { ascending: false }).limit(1).maybeSingle();
    const s = (v && v.config_json && v.config_json.steps) || [];
    if (Array.isArray(s) && s.some((x) => x && x.typ === 'termin')) { mitTerminen = true; break; }
  }
  if (!mitTerminen) {
    await db.from('termine').delete().eq('tenant_id', w.tenant_id);
    await db.from('personal').delete().eq('tenant_id', w.tenant_id);
    await db.from('termin_setup').delete().eq('tenant_id', w.tenant_id);
  }
  return { ok: true, name: w.name || slug, anfragen: anfragen || 0 };
}

/* Nachtlauf: alles, was länger als 30 Tage im Papierkorb liegt. Fehler melden, nicht verschlucken. */
export async function papierkorbPflege() {
  const grenze = new Date(Date.now() - PAPIERKORB_TAGE * 864e5).toISOString();
  const { data: ws, error } = await db.from('widgets').select('slug, name').eq('status', 'papierkorb').lt('geloescht_am', grenze).limit(200);
  if (error) return { ok: false, error: 'Ist sql/74 eingespielt? ' + error.message };
  const fehler = [], weg = [];
  for (const w of ws || []) {
    const e = await endgueltigLoeschen(w.slug).catch((x) => ({ ok: false, error: String((x && x.message) || x) }));
    if (e.ok) weg.push(w.name || w.slug); else fehler.push(w.slug + ': ' + e.error);
  }
  return { ok: !fehler.length, geloescht: weg.length, fehler };
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  if (!p.token) return res.status(403).json({ ok: false, error: 'kein zugriff' });
  const slug = String(p.widget || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (!slug) return res.status(400).json({ ok: false, error: 'widget fehlt' });

  const istAdmin = process.env.ADMIN_TOKEN && p.token === process.env.ADMIN_TOKEN;
  const user = istAdmin ? null : await userByToken(p.token);
  if (!istAdmin && !user) return res.status(403).json({ ok: false, error: 'kein zugriff' });

  const { data: w, error: le } = await db.from('widgets').select('id, tenant_id, name, status, status_vorher, geloescht_am').eq('slug', slug).maybeSingle();
  if (le) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/74 in Supabase einspielen.' });
  const aktion = String(p.aktion || 'papierkorb');
  if (!w) return res.status(200).json({ ok: true, widget: slug, anfragen: 0, schon_weg: true });
  if (!istAdmin && w.tenant_id !== user.tenant_id) return res.status(403).json({ ok: false, error: 'kein zugriff' });

  if (aktion === 'endgueltig') {
    if (!istAdmin) return res.status(403).json({ ok: false, error: 'kein zugriff' });
    const e = await endgueltigLoeschen(slug);
    return res.status(e.ok ? 200 : 500).json({ ...e, widget: slug });
  }

  const nm = w.name || slug;
  const besitzer = user || await inhaber(w.tenant_id);
  const { data: t } = await db.from('tenants').select('name').eq('id', w.tenant_id).maybeSingle().then((r) => r, () => ({}));
  const betrieb = (t && t.name) || (besitzer && (besitzer.firma || besitzer.email)) || 'Ein Betrieb';
  const akte = besitzer && besitzer.id;

  if (aktion === 'zurueck') {
    if (w.status !== 'papierkorb') return res.status(200).json({ ok: true, widget: slug, schon_da: true, status: w.status });
    // Ein Konto, ein Formular: Hat der Betrieb inzwischen ein anderes gebaut, erst das andere löschen.
    const grenze = besitzer ? formularGrenze(besitzer) : 1;
    if (grenze > 0) {
      const { data: andere } = await db.from('widgets').select('slug, name').eq('tenant_id', w.tenant_id).neq('status', 'papierkorb');
      if ((andere || []).length >= grenze) {
        const a0 = andere[0];
        return res.status(409).json({ ok: false, error: 'grenze', hinweis: 'Zu diesem Konto gehört inzwischen ein anderes Formular („' + (a0.name || a0.slug) + '“), und es gibt nur eins je Konto. Bitte zuerst das andere löschen, dann dieses zurückholen.' });
      }
    }
    const neu = w.status_vorher && w.status_vorher !== 'papierkorb' ? w.status_vorher : 'entwurf';
    const { error } = await db.from('widgets').update({ status: neu, status_vorher: null, geloescht_am: null, updated_at: new Date().toISOString() }).eq('id', w.id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!istAdmin) await manuelMelden(betrieb + ': Formular zurückgeholt', [
      '„' + nm + '“ ist wieder da (vom Betrieb selbst zurückgeholt).',
      neu === 'live' ? 'Es ist wieder live, der Einbau-Code auf der Website geht wieder.' : 'Es ist ein Entwurf und muss im Cockpit live geschaltet werden.'
    ], akte);
    return res.status(200).json({ ok: true, widget: slug, status: neu });
  }

  // In den Papierkorb. Betriebe müssen den Namen eintippen (Schutz vor einem falschen Tipp).
  if (w.status === 'papierkorb') return res.status(200).json({ ok: true, widget: slug, papierkorb: true, bis: bisVon(w.geloescht_am) });
  if (!istAdmin) {
    const ein = norm(p.name);
    if (!ein || (await namen(w, slug)).indexOf(ein) < 0) return res.status(400).json({ ok: false, error: 'name', hinweis: 'Der Name stimmt nicht. Bitte tippen Sie „' + nm + '“ genau so ein.' });
  }
  const jetzt = new Date().toISOString(), bis = bisVon(jetzt);
  const { error } = await db.from('widgets').update({ status: 'papierkorb', status_vorher: w.status || 'entwurf', geloescht_am: jetzt, updated_at: jetzt }).eq('id', w.id);
  if (error) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/74 in Supabase einspielen.' });
  const { count: anfragen } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('widget_id', slug);
  if (!istAdmin) await manuelMelden(betrieb + ': Formular gelöscht', [
    '„' + nm + '“ liegt im Papierkorb (vom Betrieb selbst gelöscht). Es ist von der Website verschwunden.',
    'Anfragen und Termine sind noch da (' + (anfragen || 0) + ' Anfragen). Endgültig gelöscht wird am ' + tagText(bis) + '.',
    'Zurückholen: Plattform → Kundenübersicht → ' + betrieb + ' → „Zurückholen“, oder der Betrieb selbst im Cockpit unter „Mein Formular“.'
  ], akte);
  return res.status(200).json({ ok: true, widget: slug, name: nm, papierkorb: true, bis, anfragen: anfragen || 0 });
}
