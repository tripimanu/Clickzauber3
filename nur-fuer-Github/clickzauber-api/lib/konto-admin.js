// Konten verwalten — nur für den Betreiber (ADMIN_TOKEN).
//
// POST /api/konto-admin { key, email, aktion:'sperren', grund }   → Widget aus, Daten bleiben
// POST /api/konto-admin { key, email, aktion:'entsperren' }        → wieder freigeben
// POST /api/konto-admin { key, email, aktion:'tarif', plan, status } → Tarif/Status von Hand
// POST /api/konto-admin { key, email, aktion:'loeschen', bestaetigung:email } → alles weg
// POST /api/konto-admin { key, email, aktion:'kostenlos', bis:'JJJJ-MM-TT'|'', plan } → Erstkunde gratis bis …
// POST /api/konto-admin { key, email, aktion:'uebergeben', neu, sprache? } → vorgebauten Zugang an den Kunden geben
// POST /api/konto-admin { key, email, aktion:'komplett_sperren', grund }  → keine Anmeldung, kein Widget, alle Geräte abgemeldet
// POST /api/konto-admin { key, email, aktion:'netz_sperren', grund } / 'netz_frei' → nur das Netzwerk
// POST /api/konto-admin { key, email, aktion:'nachricht', betreff, text }  → E-Mail an den Kunden
// POST /api/konto-admin { key, email, aktion:'notiz', text }               → interne Notiz (sieht nur der Betreiber)
// POST /api/konto-admin { key, email, aktion:'pilot', an:true|false }      → Pilotplatz von Hand vergeben oder entziehen
// POST /api/konto-admin { key, email, aktion:'funktionen_lesen' }           → Funktionen des Betriebs und Branchen seiner Formulare (sql/65)
// POST /api/konto-admin { key, email, aktion:'funktionen', funktionen:{ k:true|false } } → schalten, sein Cockpit übernimmt es ohne Neuladen
// POST /api/konto-admin { key, aktion:'alle_neu_laden' }                   → nach dem Hochladen: alle offenen Cockpits laden neu
// POST /api/konto-admin { key, email, aktion:'neu_laden' }                  → sein Cockpit lädt sich einmal neu, sobald niemand tippt
// POST /api/konto-admin { key, aktion:'vorbauen', firma, vorname, nachname, telefon, strasse, plz_ort, website, datenschutz_url ('clickzauber' = unsere Erklärung für Betriebe ohne Website) }
//                                                                          → Konto ohne echte E-Mail für einen Kunden vorbauen, samt Betrieb und Einstellungen (sql/67)
// POST /api/konto-admin { key, email, aktion:'oeffnen' }                    → Sitzung für das vorgebaute Konto, zum Bauen im Cockpit
// POST /api/konto-admin { key, email, aktion:'einladung' }                  → Einladungs-Link (clickzauber.de/einladung.html?c=…)
// POST /api/konto-admin { key, email, aktion:'test', tage }                 → Testzugang verlängern (ab heute bzw. ab Ablauf), tage 0 = Test aufheben
// POST /api/konto-admin { key, email, aktion:'ueberfuehren' }               → Test beenden, echtes Konto mit Pilotplatz
// POST /api/konto-admin { key, email, aktion:'zuruecksetzen' }              → nach Manuels eigenem Test: wieder wie vorgebaut, neuer Link, Anfragen weg
// POST /api/konto-admin { key, aktion:'akten' }                             → Kundenübersicht: alle Konten außer den Betreiber-Konten, mit Checkliste (sql/68)
// POST /api/konto-admin { key, id, aktion:'akte' }                          → eine Kundenakte: dazu Anfragen seit dem Start, Rückmeldungen, Mitteilungs-Geräte
// POST /api/konto-admin { key, id, aktion:'schritt', schritt:'geprueft'|'versendet'|'vorschau', an?, wie? } → Manuels Haken in der Checkliste (vorschau = 24-Stunden-Vorschau verschickt, seit 13.10.2026)
// POST /api/konto-admin { key, id, aktion:'online_test', an:true|false }  → vorgebautes Konto: Formular für Manuels Test online, ohne E-Mail-Bestätigung (seit 10.10.2026)
// Statt email geht überall auch id (users.id): Die Adresse eines vorgebauten Kontos wechselt beim Einlösen (js/cz-kundenakte.js).
import { db, cors, body, MAIL_KEY, MAIL_FROM } from './_lib.js';
import { beratungsFotosWeg } from './_fotos.js';
import { PLANS, stufeVomKonto } from './_plans.js';
import { neuerToken, SITE } from './auth/_pw.js';
import { uebergabeMail } from './auth/_mail.js';
import { fxPruefen } from './einstellungen.js';
import { geraetName } from './auth/_pw.js';
import { ausKonfigurator } from './_termine.js';

/* Einladungs-Code: 10 Zeichen, ohne verwechselbare Buchstaben */
function einladungsCode() {
  const z = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = '';
  const r = neuerToken();
  for (let i = 0; i < 10; i++) s += z[parseInt(r.slice(i * 2, i * 2 + 2), 16) % z.length];
  return s;
}
const einladungsLink = (c) => SITE + '/einladung.html?c=' + c;
const internAdresse = (firma, code) => 'vorgebaut-' + (String(firma || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'betrieb') + '-' + code.slice(0, 4) + '@clickzauber.de';
const httpsAdresse = (v) => { v = String(v || '').trim(); if (!v) return ''; if (!/^https?:\/\//i.test(v)) v = 'https://' + v; return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(v) ? v.slice(0, 300) : false; };

const ADMINS = () => (process.env.ADMIN_EMAILS || 'tripi.manu@gmail.com')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const heute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const still = () => {};

const STATUS = ['aktiv', 'inaktiv', 'zahlung offen', 'gekündigt'];

/* Kundenakte (sql/68, js/cz-kundenakte.js). Zurück geht nur, was die Plattform braucht, nie Passwort oder Sitzungen. */
const istEigen = (e) => ADMINS().includes(String(e || '').toLowerCase().replace(/\+[^@]*@/, '@'));
const formulareVon = (ws, u) => (ws || []).filter((w) => w.tenant_id && (w.tenant_id === u.tenant_id || w.tenant_id === u.id));
function akteVon(u, ws) {
  const s = u.schritte && typeof u.schritte === 'object' && !Array.isArray(u.schritte) ? u.schritte : {};
  return {
    id: u.id, email: u.email, intern: /^vorgebaut-.+@clickzauber\.de$/i.test(u.email || ''), eigen: istEigen(u.email),
    firma: u.firma || '', vorname: u.vorname || '', nachname: u.nachname || '', telefon: u.telefon || '',
    website: u.website || '', strasse: u.strasse || '', plz_ort: u.plz_ort || '', notiz: u.admin_notiz || '',
    seit: u.created_at, bestaetigt: !!u.verified, passwort: !!u.password_hash,
    einladung: !!u.einladung_code, link: u.einladung_code ? einladungsLink(u.einladung_code) : null,
    eingeloest_am: u.eingeloest_am || null, test_bis: u.test_bis || null, pilot_seit: u.pilot_seit || null,
    plan: u.plan || null, status: u.plan_status || 'inaktiv', gesperrt: !!u.gesperrt_am, komplett: !!u.komplett_gesperrt,
    schritte: s,
    formulare: ws.filter((w) => w.status !== 'papierkorb').map((w) => ({ slug: w.slug, name: w.name || '', live: !w.status || w.status === 'live', seit: w.updated_at || null })),
    // Papierkorb (sql/74, lib/widget-loeschen.js): gelöscht, aber noch 30 Tage zurückholbar. am = Zeitpunkt des Löschens.
    papierkorb: ws.filter((w) => w.status === 'papierkorb').map((w) => { const t = w.geloescht_am || w.updated_at || null; return { slug: w.slug, name: w.name || w.slug, am: t, bis: t ? new Date(Date.parse(t) + 30 * 864e5).toISOString() : null }; })
  };
}
async function anfragenSeit(fs, seit) {
  const slugs = fs.map((f) => f.slug).filter(Boolean);
  if (!slugs.length) return { n: 0, erste: null };
  let q = db.from('leads').select('ts', { count: 'exact' }).in('widget_id', slugs).order('ts', { ascending: true }).limit(1);
  if (seit) q = q.gte('ts', seit);
  const { data, count, error } = await q;
  return error ? { n: 0, erste: null } : { n: count || 0, erste: (data && data[0] && data[0].ts) || null };
}
/* Papierkorb (sql/74): Zeitpunkt des Löschens nachladen. Fehlt die Spalte noch, gilt updated_at (und nichts bricht). */
async function mitPk(ws) {
  const pk = (ws || []).filter((w) => w.status === 'papierkorb');
  if (!pk.length) return ws || [];
  const { data } = await db.from('widgets').select('slug, geloescht_am').in('slug', pk.map((w) => w.slug)).then((r) => r, () => ({}));
  const am = {}; (data || []).forEach((x) => { am[x.slug] = x.geloescht_am; });
  return (ws || []).map((w) => (am[w.slug] ? { ...w, geloescht_am: am[w.slug] } : w));
}
async function formulareLesen(u) {
  const { data: ws } = await db.from('widgets').select('slug, name, status, tenant_id, updated_at').in('tenant_id', [u.tenant_id, u.id].filter(Boolean));
  return akteVon(u, ws || []).formulare;
}
/* Was beim Testen angefallen ist: Anfragen, Klicks, Beratungsfotos, Termine, Warteliste, Tages-Buchungen (auch die im Formular gesperrten Tage
   aus belegung.buchungen) und Kunden-Notizen. Für „Einladung zurücksetzen“ und, seit 10.10.2026, den Haken „Alles geprüft und getestet“:
   Vor dem Einlösen hatte nur Manuel Zugang, also sind das alles Test-Daten. Formular, Leistungen und Einstellungen bleiben. */
async function testDatenWeg(tid) {
  if (!tid) return;
  const { data: ws } = await db.from('widgets').select('id, slug, belegung').eq('tenant_id', tid);
  const slugs = (ws || []).map((w) => w.slug);
  if (slugs.length) {
    await beratungsFotosWeg((q) => q.in('widget_id', slugs));
    await db.from('leads').delete().in('widget_id', slugs);
    await db.from('events').delete().in('widget_id', slugs);
  }
  await beratungsFotosWeg((q) => q.eq('tenant_id', tid));
  await db.from('leads').delete().eq('tenant_id', tid);
  await db.from('events').delete().eq('tenant_id', tid);
  // Termine, Warteliste, Tages-Buchungen und Kunden-Notizen aus dem Test (sql/28, 29, 31, 47). termine.lead_id wird beim Löschen der Anfragen nur geleert.
  await db.from('termine').delete().eq('tenant_id', tid).then(still, still);
  await db.from('warteliste').delete().eq('tenant_id', tid).then(still, still);
  if (slugs.length) await db.from('tages_buchung').delete().in('widget_id', slugs).then(still, still);
  await db.from('kunden_notiz').delete().eq('tenant_id', tid).then(still, still);
  for (const w of ws || []) {
    const b = w.belegung && typeof w.belegung === 'object' ? w.belegung : null;
    if (b && b.buchungen && Object.keys(b.buchungen).length) await db.from('widgets').update({ belegung: { ...b, buchungen: {} } }).eq('id', w.id).then(still, still);
  }
}

/* Vorgebautes Konto an den Kunden geben: E-Mail tauschen, alte Anmeldungen löschen,
   Kunde bekommt einen Link zum Passwort-Setzen. Auch aus dem Cockpit nutzbar (lib/abo.js). */
export async function kontoUebergeben(user, email, neuRoh, sprache, log) {
  const antwort = (status, json) => ({ status, json });
  const p = { neu: neuRoh, sprache };
    const neu = String(p.neu || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(neu)) return antwort(400, { ok: false, error: 'Bitte die E-Mail-Adresse des Kunden eintragen.' });
    if (ADMINS().includes(email)) return antwort(400, { ok: false, error: 'Ihr eigenes Betreiber-Konto lässt sich nicht übergeben.' });
    if (ADMINS().includes(neu)) return antwort(400, { ok: false, error: 'Das ist Ihre eigene Adresse. Bitte die des Kunden eintragen.' });

    if (neu !== email) {
      const { data: belegt } = await db.from('users').select('id').ilike('email', neu).maybeSingle();
      if (belegt) return antwort(409, { ok: false, error: 'Unter dieser Adresse gibt es schon ein Konto.' });
      // Adresse tauschen, Passwort und alle Anmeldungen löschen: ab jetzt kommt
      // nur noch hinein, wer den Link aus der Mail an den Kunden hat.
      const { error } = await db.from('users')
        .update({ email: neu, password_hash: null, verified: false, token: null }).eq('id', user.id);
      if (error) return antwort(500, { ok: false, error: 'Übergabe fehlgeschlagen.' });
      await db.from('sessions').delete().eq('user_id', user.id).then(still, still);
      await db.from('email_tokens').delete().eq('email', email).then(still, still);
      await db.from('sonderpreise').update({ email: neu }).eq('email', email).then(still, still);
      await db.from('interesse').update({ email: neu }).eq('email', email).then(still, still);
      if (user.tenant_id) await db.from('tenants').update({ email: neu }).eq('id', user.tenant_id).ilike('email', email).then(still, still);
      if (user.stripe_customer && process.env.STRIPE_SECRET_KEY) {
        try {
          const { default: Stripe } = await import('stripe');
          await new Stripe(process.env.STRIPE_SECRET_KEY).customers.update(user.stripe_customer, { email: neu });
        } catch (e) { /* nicht kritisch */ }
      }
    }

    const t = neuerToken();
    await db.from('email_tokens').insert({
      email: neu, token: t, zweck: 'passwort',
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString()
    });
    // Sprache des Kunden: wählt der Betreiber bei der Übergabe. Sie gilt auch für sein Cockpit.
    const l = ['sq', 'en', 'fr', 'it', 'es', 'tr'].includes(p.sprache) ? p.sprache : (['sq', 'en', 'fr', 'it', 'es', 'tr'].includes(user.sprache) ? user.sprache : 'de');
    if (p.sprache) await db.from('users').update({ sprache: l }).eq('id', user.id).then(still, still);
    const link = SITE + '/clickzauber-login.html?reset=' + t + '&willkommen=1' + (l !== 'de' ? '&lang=' + l : '');
    let firma = user.firma || '';
    if (!firma && user.tenant_id) {
      const { data: tn } = await db.from('tenants').select('name').eq('id', user.tenant_id).maybeSingle();
      firma = (tn && tn.name) || '';
    }
    let mail = true;
    try { await uebergabeMail(neu, link, { firma, l, bis: user.kostenlos_bis && user.kostenlos_bis >= heute() ? user.kostenlos_bis : null }); }
    catch (e) { mail = false; }
    await log('konto_uebergeben', email === neu ? 'Link erneut an ' + neu : email + ' → ' + neu);
    return antwort(200, { ok: true, email: neu, link, mail });
}

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  if (!process.env.ADMIN_TOKEN || p.key !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'kein Zugriff' });
  }
  // Nach dem Hochladen: alle offenen Cockpits laden in spätestens 20 Sekunden neu (js/cz-funktionen.js fragt neu_laden_am ab, sql/65).
  if (p.aktion === 'alle_neu_laden') {
    const jetzt = new Date().toISOString();
    const { data: ts, error: te } = await db.from('tenants').select('id').limit(10000);
    if (te) return res.status(500).json({ ok: false, error: te.message });
    const zeilen = (ts || []).map((t) => ({ tenant_id: t.id, neu_laden_am: jetzt, updated_at: jetzt }));
    for (let i = 0; i < zeilen.length; i += 500) {
      const { error } = await db.from('einstellungen').upsert(zeilen.slice(i, i + 500), { onConflict: 'tenant_id' });
      if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/65 eingespielt?' });
    }
    await db.from('protokoll').insert({ tenant_id: null, was: 'alle_neu_laden', wer: 'Betreiber', anzahl: zeilen.length, hinweis: null }).then(() => {}, () => {});
    return res.status(200).json({ ok: true, anzahl: zeilen.length });
  }
  // Konto für einen Kunden vorbauen (sql/67). Interne Adresse, die der Kunde nie sieht; er trägt seine eigene beim Einlösen ein.
  // Angaben und Datenschutz-Link gleich mit, Betrieb und Einstellungen gleich angelegt: Ohne sie kann der Kunde nicht live schalten (lib/save.js).
  if (p.aktion === 'vorbauen') {
    const f = (x, n) => String(p[x] || '').trim().slice(0, n);
    const firma = f('firma', 80);
    if (!firma) return res.status(400).json({ ok: false, error: 'Bitte den Namen des Betriebs eintragen.' });
    // „clickzauber“ (seit 13.10.2026): Betrieb ohne eigene Website bekommt die Datenschutzerklärung, die clickzauber für ihn bereitstellt
    // (datenschutz-betrieb.html, er ist darin der Verantwortliche). Wie in lib/save.js und lib/einstellungen.js.
    const dsCz = /^clickzauber$/i.test(String(p.datenschutz_url || '').trim());
    let ds = dsCz ? null : httpsAdresse(p.datenschutz_url);
    const web = httpsAdresse(p.website);
    if (ds === false) return res.status(400).json({ ok: false, error: 'Der Datenschutz-Link muss mit https:// beginnen.' });
    if (web === false) return res.status(400).json({ ok: false, error: 'Die Website sieht nicht wie eine Adresse aus.' });
    const code = einladungsCode();
    const satz = { email: internAdresse(firma, code), firma, verified: false, einladung_code: code };
    [['vorname', 60], ['nachname', 60], ['telefon', 40], ['strasse', 100], ['plz_ort', 100]].forEach(([x, n]) => { const v = f(x, n); if (v) satz[x] = v; });
    if (web) satz.website = web;
    const { data: nu, error } = await db.from('users').insert(satz).select('id, email').single();
    if (error) return res.status(500).json({ ok: false, error: /einladung_code/.test(error.message) ? 'Bitte zuerst sql/67 in Supabase einspielen.' : error.message });
    const { data: t, error: te } = await db.from('tenants').insert({ name: firma, email: nu.email }).select('id').single();
    let dsOk = false;
    if (!te && t) {
      await db.from('users').update({ tenant_id: t.id }).eq('id', nu.id);
      if (dsCz) ds = 'https://clickzauber.de/datenschutz-betrieb.html?b=' + encodeURIComponent(t.id);
      if (ds) {
        const { error: ee } = await db.from('einstellungen').upsert({ tenant_id: t.id, datenschutz_url: ds, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
        dsOk = !ee;
      }
    }
    await db.from('protokoll').insert({ tenant_id: (t && t.id) || null, was: 'konto_vorgebaut', wer: 'Betreiber', anzahl: 1, hinweis: firma }).then(still, still);
    return res.status(200).json({ ok: true, email: nu.email, code, link: einladungsLink(code),
      angaben_fehlen: !(satz.vorname && satz.nachname && satz.telefon), datenschutz_fehlt: !dsOk });
  }
  // Kundenübersicht der Plattform (js/cz-kundenakte.js, sql/68): alle Konten außer den Betreiber-Konten, neueste zuerst.
  if (p.aktion === 'akten') {
    const [{ data: us, error }, { data: ws }, { data: rm }] = await Promise.all([
      db.from('users').select('*').order('created_at', { ascending: false }).limit(1000),
      db.from('widgets').select('slug, name, status, tenant_id, updated_at').limit(5000),
      db.from('protokoll').select('tenant_id').eq('was', 'rueckmeldung_test').limit(5000)
    ]);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    const wsP = await mitPk(ws || []);
    const rmJe = {};
    (rm || []).forEach((x) => { if (x.tenant_id) rmJe[x.tenant_id] = (rmJe[x.tenant_id] || 0) + 1; });
    // Je Betrieb eine Karte: das zuerst angelegte Konto (Team-Zugänge desselben Betriebs nicht doppelt), Betreiber-Betriebe nie.
    const istAdmin = (u) => ADMINS().includes(String(u.email || '').toLowerCase());
    const gesehen = new Set((us || []).filter((u) => istAdmin(u) && u.tenant_id).map((u) => u.tenant_id));
    const liste = (us || []).slice().reverse().filter((u) => {
      if (istAdmin(u)) return false;
      if (!u.tenant_id) return true;
      if (gesehen.has(u.tenant_id)) return false;
      gesehen.add(u.tenant_id); return true;
    }).reverse();
    const akten = await Promise.all(liste.map(async (u) => {
      const a = akteVon(u, formulareVon(wsP, u));
      a.rm_n = rmJe[u.tenant_id] || 0;
      if (u.eingeloest_am && a.formulare.length) a.anfragen_seit_start = (await anfragenSeit(a.formulare, u.eingeloest_am)).n;
      return a;
    }));
    return res.status(200).json({ ok: true, akten });
  }
  // Konto über die E-Mail oder über die feste ID (Kundenakte): Die Adresse eines vorgebauten Kontos wechselt beim Einlösen.
  const nachId = !p.email && /^[0-9a-f-]{36}$/i.test(String(p.id || ''));
  const mailRoh = String(p.email || '').trim().toLowerCase();
  if (!nachId && !mailRoh) return res.status(400).json({ ok: false, error: 'E-Mail fehlt.' });

  const { data: user } = nachId
    ? await db.from('users').select('*').eq('id', String(p.id)).maybeSingle()
    : await db.from('users').select('*').ilike('email', mailRoh).maybeSingle();
  if (!user) return res.status(404).json({ ok: false, error: 'Kein Konto mit dieser E-Mail.' });
  const email = nachId ? String(user.email || '').toLowerCase() : mailRoh;

  const aktion = String(p.aktion || '');
  const log = (was, hinweis) => db.from('protokoll')
    .insert({ tenant_id: user.tenant_id || null, was, wer: 'Betreiber · ' + email, anzahl: 1, hinweis }).then(() => {}, () => {});

  // Eine Kundenakte (js/cz-kundenakte.js): Konto, Formulare, Anfragen seit dem Start, Rückmeldungen, Mitteilungs-Geräte, Datenschutz-Link.
  if (aktion === 'akte') {
    const tid = user.tenant_id;
    const { data: ws } = await db.from('widgets').select('slug, name, status, tenant_id, updated_at').in('tenant_id', [tid, user.id].filter(Boolean));
    const a = akteVon(user, await mitPk(ws || []));
    const [alle, start, rm, pg, ein] = await Promise.all([
      anfragenSeit(a.formulare, null),
      user.eingeloest_am ? anfragenSeit(a.formulare, user.eingeloest_am) : Promise.resolve({ n: 0, erste: null }),
      tid ? db.from('protokoll').select('hinweis, created_at', { count: 'exact' }).eq('tenant_id', tid).eq('was', 'rueckmeldung_test').order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [], count: 0 }),
      tid ? db.from('push_geraete').select('id', { count: 'exact', head: true }).eq('tenant_id', tid) : Promise.resolve({ count: 0 }),
      tid ? db.from('einstellungen').select('datenschutz_url').eq('tenant_id', tid).maybeSingle() : Promise.resolve({ data: null })
    ]);
    Object.assign(a, {
      anfragen: alle.n, anfragen_seit_start: start.n, erste_anfrage: start.erste,
      rueckmeldungen: (rm.data || []).map((x) => ({ text: x.hinweis || '', am: x.created_at })), rm_n: rm.count || (rm.data || []).length,
      mitteilungen: pg.count || 0, datenschutz_url: (ein.data && ein.data.datenschutz_url) || ''
    });
    return res.status(200).json({ ok: true, akte: a });
  }
  // Checkliste (sql/68): Manuels eigene Haken. geprueft = „Alles geprüft und getestet“, versendet = Einladungs-Link an den Kunden geschickt.
  if (aktion === 'schritt') {
    const was = String(p.schritt || ''), an = p.an !== false;
    if (!['geprueft', 'versendet', 'vorschau'].includes(was)) return res.status(400).json({ ok: false, error: 'Unbekannter Schritt.' });
    const { data: fr, error: fe } = await db.from('users').select('schritte').eq('id', user.id).maybeSingle();
    if (fe) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/68 in Supabase einspielen.' });
    const s = { ...(fr && fr.schritte && typeof fr.schritte === 'object' && !Array.isArray(fr.schritte) ? fr.schritte : {}) };
    const fertig = was === 'geprueft' && an && !user.eingeloest_am, warTest = !!s.online_test;
    if (an) { s[was] = s[was] || new Date().toISOString(); if (was === 'versendet' && p.wie) s.versendet_wie = String(p.wie).slice(0, 20); }
    else { delete s[was]; if (was === 'versendet') delete s.versendet_wie; }
    if (fertig) delete s.online_test;
    const { error } = await db.from('users').update({ schritte: s }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/68 in Supabase einspielen.' });
    // Vor dem Verschicken: Rundgänge und Missionen, die Manuel beim Bauen gesehen hat, sieht der Kunde danach zum ersten Mal.
    // Mitteilungen dieses Kontos auf Manuels Geräten enden, sonst kämen die Anfragen des Kunden bei Manuel an.
    // Seit 10.10.2026 auch: Der Online-Test endet, das Formular ist wieder ein Entwurf. Einschalten kann es dann nur der Kunde,
    // nachdem er seine E-Mail-Adresse bestätigt hat (lib/save.js). Test-Anfragen und Termine gehen (testDatenWeg).
    let formulare;
    if (fertig) {
      await db.from('users').update({ touren: [] }).eq('id', user.id).then(still, still);
      if (user.tenant_id) {
        await db.from('push_geraete').delete().eq('tenant_id', user.tenant_id).then(still, still);
        await db.from('widgets').update({ status: 'entwurf', updated_at: new Date().toISOString() }).in('tenant_id', [user.tenant_id, user.id]).neq('status', 'papierkorb').then(still, still);
        await testDatenWeg(user.tenant_id);
      }
      formulare = await formulareLesen(user);
    }
    await log(was === 'geprueft' ? 'akte_geprueft' : was === 'vorschau' ? 'akte_vorschau' : 'akte_versendet', an ? (p.wie ? String(p.wie).slice(0, 20) : null) : 'zurückgenommen');
    if (fertig && warTest) await log('online_test_aus', 'Haken „Alles geprüft und getestet“, Test-Anfragen gelöscht');
    return res.status(200).json({ ok: true, schritte: s, formulare });
  }

  // Online-Test vor dem Verschicken (seit 10.10.2026, js/cz-kundenakte.js Schritt „Bearbeiten und testen“): Das Formular eines vorgebauten Kontos
  // ist über den echten Link erreichbar, ohne E-Mail-Bestätigung und ohne Tarif (lib/save.js, lib/config.js lesen users.schritte.online_test, sql/68).
  // Nur bis der Kunde die Einladung einlöst. Aus: Formular wieder Entwurf. Der Haken „Alles geprüft und getestet“ schaltet ihn ebenfalls aus.
  if (aktion === 'online_test') {
    if (!user.einladung_code) return res.status(400).json({ ok: false, error: 'Das geht nur bei vorgebauten Konten.' });
    if (user.eingeloest_am) return res.status(400).json({ ok: false, error: 'Der Kunde hat die Einladung schon angenommen. Einschalten kann er das Formular jetzt selbst.' });
    if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'Kein Betrieb zu diesem Konto.' });
    const an = p.an !== false;
    if (an && !(await formulareLesen(user)).length) return res.status(400).json({ ok: false, error: 'Erst ein Formular speichern.' });
    const { data: fr, error: fe } = await db.from('users').select('schritte').eq('id', user.id).maybeSingle();
    if (fe) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/68 in Supabase einspielen.' });
    const s = { ...(fr && fr.schritte && typeof fr.schritte === 'object' && !Array.isArray(fr.schritte) ? fr.schritte : {}) };
    if (an) s.online_test = s.online_test || new Date().toISOString(); else delete s.online_test;
    const { error } = await db.from('users').update({ schritte: s }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/68 in Supabase einspielen.' });
    await db.from('widgets').update({ status: an ? 'live' : 'entwurf', updated_at: new Date().toISOString() }).in('tenant_id', [user.tenant_id, user.id]).neq('status', 'papierkorb');
    await log(an ? 'online_test_an' : 'online_test_aus', null);
    return res.status(200).json({ ok: true, schritte: s, formulare: await formulareLesen(user) });
  }

  // Formular mit kunden/akten.js abgleichen (seit 17.10.2026): geht auch nach dem Einlösen, ohne sich ins Konto einzuloggen.
  // js/cz-kundenakte.js schickt theme (accent, skin, font, fontAnswer, logo, eigen), termin.leistungen und termin.salon aus der Akte.
  // Neue Version in widget_versions mit der bisherigen Konfiguration als Grundlage: Fragen, Link, Mitarbeiter und Stand bleiben, live bleibt live.
  // Danach übernimmt das Cockpit die Leistungen (ausKonfigurator), wie beim Speichern im Konfigurator.
  if (aktion === 'abgleichen') {
    const f = p.formular || {};
    const ws = await formulareLesen(user);
    const w = ws[0]; if (!w) return res.status(400).json({ ok: false, error: 'Dieses Konto hat noch kein Formular.' });
    const slug = w.slug || w.id;
    const { data: letzte } = await db.from('widget_versions').select('version, config_json').eq('widget_id', slug).order('version', { ascending: false }).limit(1).maybeSingle();
    if (!letzte || !letzte.config_json) return res.status(400).json({ ok: false, error: 'Keine gespeicherte Version gefunden.' });
    const cfg = JSON.parse(JSON.stringify(letzte.config_json));
    const txt = (v, n) => (typeof v === 'string' ? v.slice(0, n || 200) : undefined);
    const farbe = (v) => (/^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? v : undefined);
    const th = f.theme || {};
    cfg.theme = { ...(cfg.theme || {}) };
    if (farbe(th.accent)) cfg.theme.accent = th.accent;
    if (txt(th.skin, 40)) cfg.theme.skin = th.skin;
    if (txt(th.font, 60)) cfg.theme.font = th.font;
    if (txt(th.fontAnswer, 60)) cfg.theme.fontAnswer = th.fontAnswer;
    if (/^https:\/\/clickzauber\.de\//.test(String(th.logo || ''))) cfg.theme.logo = th.logo;
    if (th.eigen && typeof th.eigen === 'object') {
      const e = {}; ['flaeche', 'knopf', 'rand'].forEach((k) => { if (farbe(th.eigen[k])) e[k] = th.eigen[k]; });
      if (th.eigen.eineReihe) e.eineReihe = true;
      cfg.theme.eigen = e;
    }
    const tm = f.termin || {};
    if (cfg.termin && Array.isArray(tm.leistungen) && tm.leistungen.length) {
      cfg.termin.leistungen = tm.leistungen.slice(0, 60).map((l) => ({
        name: txt(l.name, 80) || 'Leistung', kat: txt(l.kat, 60), info: txt(l.info, 300),
        dauer: Math.max(5, Math.min(480, Math.round(+l.dauer || 30))), preis: Math.max(0, Math.min(100000, +l.preis || 0)),
        ...(l.ab ? { ab: true } : {}), ...(l.fuer ? { fuer: txt(l.fuer, 20) } : {})
      }));
    }
    if (cfg.termin && tm.salon && typeof tm.salon === 'object') {
      cfg.termin.salon = { ...(cfg.termin.salon || {}) };
      Object.keys(tm.salon).slice(0, 20).forEach((k) => { const v = tm.salon[k]; cfg.termin.salon[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...(cfg.termin.salon[k] || {}), ...v } : v; });
    }
    const naechste = (letzte.version || 0) + 1; cfg.version = naechste;
    const jetzt = new Date().toISOString();
    const { error: ve } = await db.from('widget_versions').insert({ widget_id: slug, version: naechste, config_json: cfg, published_at: jetzt });
    if (ve) return res.status(500).json({ ok: false, error: ve.message });
    await db.from('widgets').update({ updated_at: jetzt }).eq('slug', slug);
    if (user.tenant_id && cfg.termin) { try { await ausKonfigurator(user.tenant_id, cfg.termin, false); } catch (e) { console.error('abgleichen ausKonfigurator', e && e.message); } }
    await log('formular_abgeglichen', (cfg.termin && cfg.termin.leistungen ? cfg.termin.leistungen.length : 0) + ' Leistungen, Version ' + naechste);
    return res.status(200).json({ ok: true, version: naechste, leistungen: cfg.termin && cfg.termin.leistungen ? cfg.termin.leistungen.length : 0, formulare: await formulareLesen(user) });
  }

  // Vorgebautes Konto zum Bauen öffnen: eine Sitzung nur für dieses Konto. Endet, sobald der Kunde die Einladung einlöst.
  if (aktion === 'oeffnen') {
    if (user.eingeloest_am) return res.status(400).json({ ok: false, error: 'Der Kunde hat die Einladung schon angenommen. Das Konto gehört jetzt ihm.' });
    if (ADMINS().includes(email)) return res.status(400).json({ ok: false, error: 'Das ist Ihr eigenes Konto.' });
    const t = neuerToken();
    const { error } = await db.from('sessions').insert({ token: t, user_id: user.id, geraet: 'Betreiber · ' + geraetName(req.headers['user-agent']) });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    await log('konto_geoeffnet', 'zum Bauen');
    return res.status(200).json({ ok: true, token: t, email: user.email });
  }
  if (aktion === 'einladung') {
    let code = user.einladung_code;
    if (!code) {
      code = einladungsCode();
      const { error } = await db.from('users').update({ einladung_code: code }).eq('id', user.id);
      if (error) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/67 in Supabase einspielen.' });
    }
    return res.status(200).json({ ok: true, code, link: einladungsLink(code), eingeloest: !!user.eingeloest_am, firma: user.firma || '' });
  }
  // Test beenden, echtes Konto: kein Ablauf mehr, Pilotplatz (kostenlos bis zum Verkaufsstart, danach 40 % Rabatt).
  // Das Cockpit zeigt einmal „Ihr Konto ist freigeschaltet“ (js/cz-test.js, m:konto_frei).
  if (aktion === 'ueberfuehren') {
    const satz = { test_bis: null, test_erinnert_am: null, pilot_seit: user.pilot_seit || new Date().toISOString() };
    let { error } = await db.from('users').update(user.pilot_seit ? satz : { ...satz, pilot_extra: true }).eq('id', user.id);
    if (error && !user.pilot_seit) ({ error } = await db.from('users').update(satz).eq('id', user.id));
    if (error) return res.status(500).json({ ok: false, error: error.message });
    await log('test_ueberfuehrt', 'echtes Konto, Pilotplatz');
    return res.status(200).json({ ok: true });
  }
  // Nach Manuels eigenem Test: wieder wie vorgebaut. Formular, Angaben und Einstellungen bleiben.
  // Zugang, Anmeldungen, Test, Touren, Push-Geräte und alle Anfragen gehen; neuer Code, der alte Link gilt nicht mehr; Formular wieder Entwurf.
  if (aktion === 'zuruecksetzen') {
    if (!user.einladung_code) return res.status(400).json({ ok: false, error: 'Das geht nur bei vorgebauten Konten.' });
    if (ADMINS().includes(email)) return res.status(400).json({ ok: false, error: 'Das ist Ihr eigenes Konto.' });
    const code = einladungsCode(), intern = internAdresse(user.firma, code), tid = user.tenant_id;
    const { error } = await db.from('users').update({ email: intern, password_hash: null, token: null, verified: false, einladung_code: code,
      eingeloest_am: null, test_bis: null, test_erinnert_am: null, touren: [], pilot_seit: null, pilot_extra: false }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    // Checkliste (sql/68): „geprüft“ bleibt, alles andere beginnt von vorn.
    const sAlt = user.schritte && typeof user.schritte === 'object' && !Array.isArray(user.schritte) ? user.schritte : {};
    await db.from('users').update({ schritte: sAlt.geprueft ? { geprueft: sAlt.geprueft } : {} }).eq('id', user.id).then(still, still);
    await db.from('sessions').delete().eq('user_id', user.id).then(still, still);
    await db.from('email_tokens').delete().eq('email', email).then(still, still);
    if (tid) {
      await db.from('tenants').update({ email: intern }).eq('id', tid).then(still, still);
      await db.from('widgets').update({ status: 'entwurf' }).eq('tenant_id', tid).neq('status', 'papierkorb').then(still, still);
      await db.from('push_geraete').delete().eq('tenant_id', tid).then(still, still);
      await testDatenWeg(tid);
      // AV-Vertrag und Bestätigungen gibt der Kunde selbst ab. Mail-Adressen aus dem Test gehen mit.
      const { data: ein } = await db.from('einstellungen').select('*').eq('tenant_id', tid).maybeSingle();
      if (ein) {
        const satz = {};
        if ('av_vertrag_am' in ein) satz.av_vertrag_am = null;
        if ('bestaetigt' in ein) satz.bestaetigt = {};
        ['mail_haupt', 'mail_zweit', 'antwort_an', 'monatsbericht_an'].forEach((f) => { if (f in ein && String(ein[f] || '').toLowerCase() === email) satz[f] = null; });
        for (const [f, v] of Object.entries(satz)) await db.from('einstellungen').update({ [f]: v }).eq('tenant_id', tid).then(still, still);
      }
    }
    await db.from('users').update({ pilot_seit: null, pilot_extra: false }).eq('id', user.id).then(still, still);
    await log('einladung_zurueckgesetzt', 'Test-Zugang ' + email + ' und Test-Anfragen entfernt');
    return res.status(200).json({ ok: true, email: intern, code, link: einladungsLink(code) });
  }
  if (aktion === 'test') {
    const tage = Math.max(0, Math.min(365, parseInt(p.tage, 10) || 0));
    let bis = null;
    if (tage) {
      const ab = user.test_bis && new Date(user.test_bis) > new Date() ? new Date(user.test_bis) : new Date();
      bis = new Date(ab.getTime() + tage * 864e5).toISOString();
    }
    const { error } = await db.from('users').update({ test_bis: bis, test_erinnert_am: null }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Bitte zuerst sql/67 in Supabase einspielen.' });
    await log('test_geaendert', bis ? 'bis ' + bis.slice(0, 10) : 'aufgehoben');
    return res.status(200).json({ ok: true, test_bis: bis });
  }

  if (aktion === 'sperren') {
    const grund = String(p.grund || 'Zahlung offen').slice(0, 200);
    const { error } = await db.from('users')
      .update({ gesperrt_am: new Date().toISOString(), gesperrt_grund: grund }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Sperren fehlgeschlagen. Ist sql/27 eingespielt?' });
    await log('konto_gesperrt', grund);
    return res.status(200).json({ ok: true, gesperrt: true });
  }

  if (aktion === 'komplett_sperren') {
    const grund = String(p.grund || 'Verstoß gegen die AGB').slice(0, 200);
    const { error } = await db.from('users').update({ gesperrt_am: new Date().toISOString(), gesperrt_grund: grund, komplett_gesperrt: true }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Sperren fehlgeschlagen. Ist sql/39 eingespielt?' });
    await db.from('sessions').delete().eq('user_id', user.id).then(() => {}, () => {});
    await db.from('users').update({ token: null }).eq('id', user.id).then(() => {}, () => {});
    if (user.tenant_id) await db.from('netz_profil').update({ gesperrt: true, sichtbar: false, gesperrt_grund: grund }).eq('tenant_id', user.tenant_id).then(() => {}, () => {});
    await log('konto_komplett_gesperrt', grund);
    return res.status(200).json({ ok: true, gesperrt: true, komplett: true });
  }

  if (aktion === 'netz_sperren' || aktion === 'netz_frei') {
    if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'Kein Betrieb zu diesem Konto.' });
    const zu = aktion === 'netz_sperren';
    await db.from('netz_profil').update(zu ? { gesperrt: true, sichtbar: false, gesperrt_grund: String(p.grund || 'Verstoß gegen die Regeln im Netzwerk').slice(0, 200) } : { gesperrt: false, gesperrt_grund: null }).eq('tenant_id', user.tenant_id);
    await log(zu ? 'netz_gesperrt' : 'netz_frei', p.grund || null);
    return res.status(200).json({ ok: true });
  }

  if (aktion === 'nachricht') {
    const betreff = String(p.betreff || '').trim().slice(0, 150), text = String(p.text || '').trim().slice(0, 5000);
    if (!betreff || !text) return res.status(400).json({ ok: false, error: 'Betreff und Text fehlen.' });
    if (!MAIL_KEY) return res.status(500).json({ ok: false, error: 'Kein Mail-Schlüssel in Vercel.' });
    const html = text.split(/\n{2,}/).map((a) => '<p style="font:15px/1.55 system-ui,sans-serif;color:#27241d;margin:0 0 14px">' + a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>').join('');
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [user.email], reply_to: 'projekt@clickzauber.de', subject: betreff, html }) }).catch(() => null);
    if (!r || !r.ok) return res.status(502).json({ ok: false, error: 'E-Mail ließ sich nicht senden.' });
    await log('mail_vom_betreiber', betreff);
    return res.status(200).json({ ok: true });
  }

  if (aktion === 'notiz') {
    await db.from('users').update({ admin_notiz: String(p.text || '').slice(0, 2000) || null }).eq('id', user.id);
    return res.status(200).json({ ok: true });
  }

  if (aktion === 'entsperren') {
    await db.from('users').update({ gesperrt_am: null, gesperrt_grund: null, komplett_gesperrt: false }).eq('id', user.id);
    await log('konto_entsperrt', null);
    return res.status(200).json({ ok: true, gesperrt: false });
  }

  if (aktion === 'tarif') {
    const upd = {};
    if (p.plan !== undefined) {
      if (p.plan && !PLANS[p.plan]) return res.status(400).json({ ok: false, error: 'Unbekannter Tarif.' });
      upd.plan = p.plan || null;
    }
    if (p.status !== undefined) {
      if (!STATUS.includes(p.status)) return res.status(400).json({ ok: false, error: 'Unbekannter Status.' });
      upd.plan_status = p.status;
    }
    if (!Object.keys(upd).length) return res.status(400).json({ ok: false, error: 'Nichts zu ändern.' });
    await db.from('users').update(upd).eq('id', user.id);
    await log('tarif_von_hand', JSON.stringify(upd));
    return res.status(200).json({ ok: true, ...upd });
  }

  if (aktion === 'kostenlos') {
    const bis = String(p.bis || '').trim();
    if (!bis) {
      const upd = { kostenlos_bis: null, kostenlos_erinnert: null };
      if (!user.stripe_sub) { upd.plan_status = 'inaktiv'; upd.plan = null; }
      const { error } = await db.from('users').update(upd).eq('id', user.id);
      if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/33 eingespielt?' });
      await log('kostenlos_aufgehoben', null);
      return res.status(200).json({ ok: true, kostenlos_bis: null });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bis) || isNaN(Date.parse(bis))) return res.status(400).json({ ok: false, error: 'Datum fehlt oder ist ungültig.' });
    if (bis < heute()) return res.status(400).json({ ok: false, error: 'Das Datum liegt in der Vergangenheit.' });
    // Preisstufe: von Hand gewählt, sonst die bisherige, sonst aus der Branche des Formulars.
    const neuOk = (x) => !!(PLANS[x] && !PLANS[x].alt);
    const plan = neuOk(p.plan) ? p.plan : (neuOk(user.plan) ? user.plan : ((await stufeVomKonto(db, user.tenant_id)) || 'projekt'));
    const upd = { kostenlos_bis: bis, kostenlos_erinnert: null };
    // Hat der Kunde schon ein Abo, bleibt Stripe zuständig — dann nur das Datum merken.
    if (!user.stripe_sub) { upd.plan = plan; upd.plan_status = 'aktiv'; }
    const { error } = await db.from('users').update(upd).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/33 eingespielt?' });
    await log('kostenlos_bis', bis + ' · ' + plan);
    return res.status(200).json({ ok: true, kostenlos_bis: bis, plan: upd.plan || user.plan });
  }

  if (aktion === 'pilot') {
    const an = !!p.an;
    const { error } = await db.from('users').update({ pilot_seit: an ? (user.pilot_seit || new Date().toISOString()) : null }).eq('id', user.id);
    if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen. Ist sql/43 eingespielt?' });
    await log(an ? 'pilot_vergeben' : 'pilot_entzogen', null);
    return res.status(200).json({ ok: true, pilot: an });
  }

  // Funktionen je Betrieb (sql/65, js/cz-funktionen.js)
  if (aktion === 'funktionen_lesen' || aktion === 'funktionen' || aktion === 'neu_laden') {
    if (!user.tenant_id) return res.status(400).json({ ok: false, error: 'Kein Betrieb zu diesem Konto.' });
    const t = user.tenant_id, jetzt = new Date().toISOString();
    const { data: alt, error: ae } = await db.from('einstellungen').select('funktionen, funktionen_am, neu_laden_am').eq('tenant_id', t).maybeSingle();
    if (ae) return res.status(500).json({ ok: false, error: 'Ist sql/65 eingespielt?' });
    let f = (alt && alt.funktionen) || {}, stand = (alt && alt.funktionen_am) || null, nl = (alt && alt.neu_laden_am) || null;
    if (aktion === 'funktionen') {
      const neu = fxPruefen(p.funktionen);
      if (!neu) return res.status(400).json({ ok: false, error: 'Unbekannte Funktion.' });
      f = { ...f, ...neu }; stand = jetzt;
      const { error } = await db.from('einstellungen').upsert({ tenant_id: t, funktionen: f, funktionen_am: jetzt, updated_at: jetzt }, { onConflict: 'tenant_id' });
      if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
      await log('funktionen_geaendert', Object.keys(neu).map((k) => k + (neu[k] ? ' an' : ' aus')).join(', '));
    }
    if (aktion === 'neu_laden') {
      nl = jetzt;
      const { error } = await db.from('einstellungen').upsert({ tenant_id: t, neu_laden_am: jetzt, updated_at: jetzt }, { onConflict: 'tenant_id' });
      if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
      await log('cockpit_neu_laden', null);
    }
    const { data: ws } = await db.from('widgets').select('slug, branche').eq('tenant_id', t);
    return res.status(200).json({ ok: true, funktionen: f, stand, neu_laden_am: nl, branchen: (ws || []).map((w) => w.branche).filter(Boolean) });
  }

  if (aktion === 'uebergeben') {
    const r = await kontoUebergeben(user, email, p.neu, p.sprache, log);
    return res.status(r.status).json(r.json);
  }

  if (aktion === 'loeschen') {
    if (ADMINS().includes(email)) return res.status(400).json({ ok: false, error: 'Ihr eigenes Betreiber-Konto lässt sich hier nicht löschen.' });
    // Bestätigung = die E-Mail noch einmal eintippen. Schützt vor dem falschen Klick.
    if (String(p.bestaetigung || '').trim().toLowerCase() !== email) {
      return res.status(400).json({ ok: false, error: 'Zur Bestätigung die E-Mail-Adresse genau eintippen.' });
    }
    let aboHinweis = null;
    if (user.stripe_sub && process.env.STRIPE_SECRET_KEY) {
      try {
        const { default: Stripe } = await import('stripe');
        await new Stripe(process.env.STRIPE_SECRET_KEY).subscriptions.cancel(user.stripe_sub);
      } catch (e) { aboHinweis = 'Stripe-Abo bitte im Stripe-Dashboard von Hand beenden.'; }
    }
    const tenant = user.tenant_id;
    // Komplett löschen: alle Personen dieses Betriebs (Inhaber und Team-Zugänge) mit ihren Anmeldungen.
    // Termine, Netzwerk, Push-Geräte, Vorlagen, Team, Punkte und Kalender hängen am Betrieb und gehen mit ihm (on delete cascade).
    const { data: alleU } = tenant ? await db.from('users').select('id, email').eq('tenant_id', tenant) : { data: [] };
    const personen = [...new Map([...(alleU || []), { id: user.id, email: user.email }].map((x) => [x.id, x])).values()];
    if (tenant) {
      const { data: ws } = await db.from('widgets').select('slug').eq('tenant_id', tenant);
      const slugs = (ws || []).map((w) => w.slug);
      if (slugs.length) {
        await beratungsFotosWeg((q) => q.in('widget_id', slugs));
        await db.from('widget_versions').delete().in('widget_id', slugs);
        await db.from('leads').delete().in('widget_id', slugs);
        await db.from('events').delete().in('widget_id', slugs);
      }
      await beratungsFotosWeg((q) => q.eq('tenant_id', tenant));
      await db.from('leads').delete().eq('tenant_id', tenant);
      await db.from('events').delete().eq('tenant_id', tenant);
      await db.from('widgets').delete().eq('tenant_id', tenant);
      await db.from('einstellungen').delete().eq('tenant_id', tenant);
    }
    for (const x of personen) {
      const m = String(x.email || '').toLowerCase();
      await db.from('sessions').delete().eq('user_id', x.id).then(still, still);
      if (m) {
        await db.from('interesse').delete().eq('email', x.email).then(still, still);
        await db.from('sonderpreise').delete().eq('email', m).then(still, still);
        await db.from('email_tokens').delete().eq('email', m).then(still, still);
      }
    }
    await db.from('protokoll').insert({
      tenant_id: null, was: 'konto_geloescht', anzahl: personen.length,
      hinweis: 'Vom Betreiber gelöscht: ' + email + (personen.length > 1 ? ' und ' + (personen.length - 1) + ' Team-Zugänge' : '') + (aboHinweis ? ' · ' + aboHinweis : '')
    });
    const { error: ue } = await db.from('users').delete().in('id', personen.map((x) => x.id));
    if (ue) return res.status(500).json({ ok: false, error: 'Konto ließ sich nicht löschen: ' + ue.message });
    let rest = null;
    if (tenant) {
      const { error: te } = await db.from('tenants').delete().eq('id', tenant);
      if (te) rest = 'Der Betrieb selbst ließ sich nicht ganz löschen (' + te.message + '). Bitte in Supabase nachsehen.';
    }
    const hinweis = [aboHinweis, rest].filter(Boolean).join(' ') || null;
    return res.status(200).json({ ok: true, geloescht: true, hinweis });
  }

  return res.status(400).json({ ok: false, error: 'Unbekannte Aktion.' });
}
