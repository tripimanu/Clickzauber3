// /api/netz — Vernetzen: Profile, Kontakte, Nachrichten, Gefällt mir, Partner im Formular, Anfrage weiterleiten.
// Nur für angemeldete Betriebe. Im Monatspreis enthalten, keine Provision.
//
// GET  ?token&was=start                     → eigenes Profil, Kontakte, offene Anfragen, Partner, ungelesene Nachrichten
// GET  ?token&was=feed                      → Beiträge (Bilder mit Text) von Kontakten und aus der Nähe
// GET  ?token&was=suche&branche&region&q    → andere Betriebe finden
// GET  ?token&was=profil&id                 → Profil eines Betriebs mit Bildern und Gefällt mir
// GET  ?token&was=gespraeche                → Liste der Gespräche
// GET  ?token&was=verlauf&mit               → Nachrichten mit einem Betrieb (markiert als gelesen)
// GET  ?token&was=lead&id                   → darf diese Anfrage weitergeleitet werden, an wen schon, an wen möglich
// POST { token, aktion, … }                 → profil | bild | bild_weg | vernetzen | antwort | trennen |
//                                             nachricht | like | partner | partner_zustimmen | blockieren | melden | weiterleiten | pakete | frei
// GET  ?token&was=puls                      → ungelesene Nachrichten, offene Anfragen, letzte Nachricht (für schnelles Nachladen)
// GET  ?token&was=vertrauen                 → eigene Vertrauenspunkte, Abzeichen, Plätze (sql/44)
// GET  ?token&was=rangliste&gebiet&branche  → Top 100 nach Vertrauenspunkten (gebiet = region | DE | AT | CH | dach)
import { db, cors, body, userByToken, rolleVon, darf, MAIL_KEY, MAIL_FROM, MAIL_TO } from './_lib.js';
import { kalTage, proTag } from './_kaltage.js';
import { meineAnfrage } from './anfrage.js';
import { pushSenden } from './_push.js';
import { pruefen, vermerken } from './_moderation.js';
import { antwortZeit } from './_antwortzeit.js';
import { aktualisieren, stufeVon, platzVon, rangFilter, kroneAktiv, rabattVon, werbeCode, PRO_ANFRAGE, PRO_ABSCHLUSS, MAX_PRO_TAG } from './_vertrauen.js';

export const BRANCHEN = {
  hochzeit: 'Hochzeitslocation', foodtruck: 'Food Truck', catering: 'Catering', foto: 'Foto & Video',
  floristik: 'Floristik', deko: 'Dekoration & Verleih', musik: 'Musik & DJ', konditorei: 'Konditorei & Torten',
  planung: 'Hochzeitsplanung', friseur: 'Friseur & Styling', tagung: 'Tagungshaus', sonstige: 'Sonstiges'
};
const MAX_BILDER = 6, MAX_PARTNER = 6, MAX_NEU_PRO_TAG = 20;
const COCKPIT = (process.env.COCKPIT_URL || 'https://clickzauber.de/clickzauber-cockpit-live.html').replace(/\/$/, '');

const kurz = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const bildVon = (p) => (p && (p.personbild || p.titelbild)) || null;

function karte(p, t) {
  return {
    id: p.tenant_id, name: p.name || (t && t.name) || 'Betrieb', branche: p.branche || 'sonstige',
    branche_text: BRANCHEN[p.branche] || BRANCHEN.sonstige, ort: p.ort || '', plz: p.plz || '',
    text: kurz(p.text, 160), bild: bildVon(p), titelbild: p.titelbild || null
  };
}

async function profileVon(ids) {
  if (!ids.length) return {};
  const [{ data: ps }, { data: ts }] = await Promise.all([
    db.from('netz_profil').select('*').in('tenant_id', ids),
    db.from('tenants').select('id, name').in('id', ids)
  ]);
  const tn = {}; (ts || []).forEach((t) => { tn[t.id] = t; });
  const aus = {};
  ids.forEach((id) => {
    const p = (ps || []).find((x) => x.tenant_id === id) || { tenant_id: id };
    aus[id] = karte(p, tn[id]);
  });
  return aus;
}

/* Betriebs-IDs sind UUIDs (sql/01). Seit 15.10.2026 geht keine ID mehr ungeprüft in einen .or()-Filter:
   Dort steht sie als Text im Filter, und Zeichen wie „,“ oder „)“ hätten eigene Bedingungen angehängt
   (fremde Nachrichten lesen, Sperren umgehen, fremde Verbindungen löschen). .eq() ist davon nicht betroffen. */
const istId = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

async function verbindungen(ich) {
  if (!istId(ich)) return [];
  const { data } = await db.from('netz_verbindung').select('*').or(`von.eq.${ich},an.eq.${ich}`);
  return data || [];
}
function statusMit(vs, ich, id) {
  const v = vs.find((x) => (x.von === ich && x.an === id) || (x.an === ich && x.von === id));
  if (!v) return 'keins';
  if (v.status === 'ok') return 'ok';
  if (v.status === 'offen') return v.von === ich ? 'offen_raus' : 'offen_rein';
  return v.von === ich ? 'abgelehnt' : 'keins';
}
async function geblockt(a, b) {
  if (!istId(a) || !istId(b)) return true;   // Unbekannt gilt als gesperrt
  const { data } = await db.from('netz_block').select('von').or(`and(von.eq.${a},an.eq.${b}),and(von.eq.${b},an.eq.${a})`).limit(1);
  return !!(data && data.length);
}
async function istKontakt(a, b) {
  if (!istId(a) || !istId(b)) return false;
  const { data } = await db.from('netz_verbindung').select('id').eq('status', 'ok')
    .or(`and(von.eq.${a},an.eq.${b}),and(von.eq.${b},an.eq.${a})`).limit(1);
  return !!(data && data.length);
}

async function mail(tenantId, betreff, zeilen, knopf) {
  if (!MAIL_KEY || !tenantId) return;
  try {
    const { data: t } = await db.from('tenants').select('email').eq('id', tenantId).maybeSingle();
    if (!t || !t.email) return;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#27241d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;border:1px solid #e9e1d4"><tr><td style="padding:28px">
<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#2f7d59;margin-bottom:10px">clickzauber · Vernetzen</div>
${zeilen.map((z) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${esc(z)}</p>`).join('')}
<p style="margin:20px 0 0"><a href="${knopf}" style="display:inline-block;background:#2f7d59;color:#fff;text-decoration:none;padding:11px 20px;border-radius:999px;font-size:14px">Im Cockpit öffnen</a></p>
</td></tr></table></td></tr></table></body></html>`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [t.email], subject: betreff, html })
    });
  } catch (e) { /* Mail ist Zusatz, die Aktion zählt */ }
}

function melden(tenantId, titel, text, url) {
  try { return pushSenden(tenantId, { titel, text, url: 'clickzauber-cockpit-live.html' + (url || ''), tag: 'cz-netz' }).catch(() => {}); } catch (e) { return Promise.resolve(); }
}

async function eigenerName(ich) {
  const { data: p } = await db.from('netz_profil').select('name').eq('tenant_id', ich).maybeSingle();
  if (p && p.name) return p.name;
  const { data: t } = await db.from('tenants').select('name').eq('id', ich).maybeSingle();
  return (t && t.name) || 'Ein Betrieb';
}

async function bildHochladen(ich, daten) {
  const m = String(daten || '').match(/^data:(image\/(jpeg|webp|png));base64,(.+)$/);
  if (!m) return { fehler: 'Bitte ein Foto als JPG, PNG oder WebP wählen.' };
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > 2 * 1024 * 1024) return { fehler: 'Das Bild ist zu groß (höchstens 2 MB).' };
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const pfad = `${ich}/${id}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`;
  const { error } = await db.storage.from('netz').upload(pfad, buf, { contentType: m[1], upsert: false, cacheControl: '31536000' });
  if (error) return { fehler: 'Hochladen fehlgeschlagen.' };
  const { data } = db.storage.from('netz').getPublicUrl(pfad);
  return { id, url: data.publicUrl, pfad };
}
async function bildEntfernen(url) {
  const m = String(url || '').match(/\/object\/public\/netz\/(.+)$/);
  if (m) { try { await db.storage.from('netz').remove([m[1]]); } catch (e) {} }
}

const MAX_PAKETE = 3;

/* ═══ Gründe, täglich hineinzuschauen (sql/41) ═══
   Alles ohne Geld und ohne Gästedaten: Antwortzeit aus den eigenen Anfragen, Profilbesuche nur als
   Anzahl und Branche, freie Termine nur, wenn der Betrieb sie selbst meldet, Top-Empfehler aus
   Weiterleitungen, Paketen und „Unsere Partner“. */
const heuteISO = () => new Date().toISOString().slice(0, 10);
const vorTagen = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

// Wer in diesem Monat die meisten Gäste an Partner gegeben hat, je PLZ-Gebiet (erste zwei Ziffern).
async function topEmpfehler(region) {
  const d = new Date(), ab = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  const { data } = await db.from('leads').select('herkunft_tenant').not('herkunft_tenant', 'is', null).gte('created_at', ab).limit(5000);
  const z = {}; (data || []).forEach((l) => { z[l.herkunft_tenant] = (z[l.herkunft_tenant] || 0) + 1; });
  const ids = Object.keys(z);
  if (!ids.length) return { monat: ab.slice(0, 7), region, liste: [], zahl: z };
  const { data: ps } = await db.from('netz_profil').select('tenant_id, plz, sichtbar, gesperrt').in('tenant_id', ids.slice(0, 500));
  const imGebiet = (ps || []).filter((x) => x.sichtbar !== false && !x.gesperrt && (!region || String(x.plz || '').indexOf(region) === 0)).map((x) => x.tenant_id);
  imGebiet.sort((a, b) => z[b] - z[a]);
  const k = await profileVon(imGebiet.slice(0, 3));
  return { monat: ab.slice(0, 7), region, liste: imGebiet.slice(0, 3).map((id, i) => Object.assign({ anzahl: z[id], platz: i + 1 }, k[id])), rang: imGebiet, zahl: z };
}

function tageSauber(liste) {
  const h = heuteISO(), bis = new Date(Date.now() + 730 * 864e5).toISOString().slice(0, 10);
  return [...new Set((Array.isArray(liste) ? liste : []).map(String))].filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && t >= h && t <= bis).sort().slice(0, 20);
}
const deTag = (t) => t.split('-').reverse().slice(0, 2).join('.') + '.';

// Frei oder belegt am Wunschtermin, aus Kalender und festen Buchungen der Partner.
async function freiAm(ids, tag) {
  const aus = {};
  if (!ids.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(tag || ''))) return aus;
  const [{ data: ws }, { data: ls }] = await Promise.all([
    db.from('widgets').select('tenant_id, belegung').in('tenant_id', ids),
    db.from('leads').select('tenant_id').in('tenant_id', ids).eq('termin', tag).eq('status', 'gebucht')
  ]);
  (ws || []).forEach((w) => {
    const b = (w.belegung && typeof w.belegung === 'object') ? w.belegung : {};
    const buch = (b.buchungen && b.buchungen[tag]) || [];
    const zu = (b.gesperrt || []).includes(tag) || kalTage(b).includes(tag) || buch.length >= proTag(b);
    if (zu) aus[w.tenant_id] = 'belegt'; else if (!aus[w.tenant_id]) aus[w.tenant_id] = 'frei';
  });
  (ls || []).forEach((l) => { aus[l.tenant_id] = 'belegt'; });
  return aus;
}

// Anfrage an einen vernetzten Betrieb geben. Auch für gemeinsame Pakete (lib/lead.js).
/* Absage mit Empfehlung: Der Gast erfährt, an wen seine Anfrage ging. Eigener Text geht vor. */
async function gastInformieren(ich, lead, ids, eigen) {
  if (!MAIL_KEY) return false;
  try {
    const [name, k, { data: t }] = await Promise.all([eigenerName(ich), profileVon(ids), db.from('tenants').select('email').eq('id', ich).maybeSingle()]);
    const namen = ids.map((i) => (k[i] || {}).name).filter(Boolean);
    const tag = lead.termin ? ' am ' + String(lead.termin).split('-').reverse().join('.') : '';
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const text = eigen || ('Vielen Dank für Ihre Anfrage. Leider sind wir' + tag + ' schon ausgebucht. Damit Sie nicht weitersuchen müssen, haben wir Ihre Anfrage mit Ihrer Zustimmung an ' + namen.join(' und ') + ' gegeben. Sie melden sich direkt bei Ihnen.');
    const html = '<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#27241d"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;border:1px solid #e9e1d4"><tr><td style="padding:28px">'
      + '<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Guten Tag' + (lead.name ? ' ' + esc(lead.name) : '') + ',</p>'
      + esc(text).split(/\n+/).map((z) => '<p style="font-size:15px;line-height:1.6;margin:0 0 12px">' + z + '</p>').join('')
      + '<p style="font-size:15px;line-height:1.6;margin:16px 0 0">Herzliche Grüße<br>' + esc(name) + '</p></td></tr></table></td></tr></table></body></html>';
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: name + ' <' + String(MAIL_FROM).replace(/^.*<|>.*$/g, '') + '>', to: [lead.email], reply_to: t && t.email ? t.email : undefined, subject: 'Ihre Anfrage' + tag + ' — wir haben Ihnen Partner empfohlen', html })
    });
    return r.ok;
  } catch (e) { return false; }
}

export async function weitergeben(ich, lead, an, hinweis, paket) {
  if (!lead.weiter_ok) return { ok: false, code: 403, error: 'Der Gast hat der Weitergabe nicht zugestimmt.' };
  if (!an || !await istKontakt(ich, an)) return { ok: false, code: 403, error: 'Weiterleiten geht nur an vernetzte Betriebe.' };
  if ((lead.weitergeleitet || []).some((w) => w.an === an)) return { ok: false, code: 400, error: 'Diese Anfrage ist dort schon angekommen.' };
  // Papierkorb (sql/74): nicht an ein gelöschtes Formular hängen, sonst ginge die Anfrage beim endgültigen Löschen mit.
  const { data: ws } = await db.from('widgets').select('slug').eq('tenant_id', an).neq('status', 'papierkorb').order('created_at', { ascending: true }).limit(1);
  if (!ws || !ws.length) return { ok: false, code: 400, error: 'Der Partner hat noch kein Formular. Dort kann die Anfrage nicht ankommen.' };
  const name = await eigenerName(ich);
  const jetzt = new Date().toISOString();
  const zusatz = { 'Weitergeleitet von': name };
  if (paket) zusatz['Gemeinsames Paket'] = paket;
  if (hinweis) zusatz['Hinweis von ' + name] = hinweis;
  const { error } = await db.from('leads').insert({
    tenant_id: an, widget_id: ws[0].slug, name: lead.name, email: lead.email, phone: lead.phone,
    answers: Object.assign({}, lead.answers || {}, zusatz), termin: lead.termin, status: 'neu', consent: true, weiter_ok: false,
    herkunft_tenant: ich, sprache: lead.sprache || null
  });
  if (error) return { ok: false, code: 500, error: 'Weiterleiten fehlgeschlagen.' };
  const k = await profileVon([an]);
  lead.weitergeleitet = [...(lead.weitergeleitet || []), { an, name: (k[an] || {}).name || '', am: jetzt }];
  await db.from('leads').update({ weitergeleitet: lead.weitergeleitet }).eq('id', lead.id);
  const tag = lead.termin ? ' für den ' + String(lead.termin).split('-').reverse().join('.') : '';
  mail(an, 'Neue Anfrage von ' + name, [paket ? 'Über Ihr gemeinsames Paket „' + paket + '“ mit ' + name + ' kam eine Gästeanfrage' + tag + '.' : name + ' hat Ihnen eine Gästeanfrage weitergeleitet' + tag + '.', 'Sie finden sie im Cockpit unter „Anfragen“. Der Gast hat der Weitergabe zugestimmt.'], COCKPIT + '#leads');
  melden(an, 'Neue Anfrage von ' + name, (lead.name || 'Gast') + tag, '#leads');
  return { ok: true };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? body(req) : (req.query || {});
  const user = await userByToken(p.token);
  if (!user || !user.tenant_id) return res.status(401).json({ ok: false, error: 'nicht angemeldet' });
  const ich = user.tenant_id;
  const rolle = await rolleVon(user);
  res.setHeader('Cache-Control', 'no-store');

  /* ═══ Lesen ═══ */
  if (req.method === 'GET') {
    const was = p.was || 'start';

    if (was === 'start') {
      const [{ data: prof }, { data: t }, vs, { data: pa }, { data: pz }, { count: ungelesen }] = await Promise.all([
        db.from('netz_profil').select('*').eq('tenant_id', ich).maybeSingle(),
        db.from('tenants').select('name').eq('id', ich).maybeSingle(),
        verbindungen(ich),
        db.from('netz_partner').select('*').eq('tenant_id', ich).order('reihenfolge'),
        db.from('netz_partner').select('*').eq('partner_id', ich),
        db.from('netz_nachricht').select('id', { count: 'exact', head: true }).eq('an', ich).is('gelesen_at', null)
      ]);
      const ids = new Set();
      vs.forEach((v) => ids.add(v.von === ich ? v.an : v.von));
      (pa || []).forEach((x) => ids.add(x.partner_id));
      (pz || []).forEach((x) => ids.add(x.tenant_id));
      const k = await profileVon([...ids]);
      const { count: likes } = await db.from('netz_like').select('von', { count: 'exact', head: true }).eq('ziel', ich).eq('bild', '');
      const jahr = new Date().getFullYear() + '-01-01';
      const [{ count: bekommen }, { count: geschickt }, { count: angenommen }, pk] = await Promise.all([
        db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', ich).not('herkunft_tenant', 'is', null).gte('created_at', jahr),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('herkunft_tenant', ich).gte('created_at', jahr),
        // Annahmequote: weitergegebene Anfragen, auf die der Partner reagiert hat.
        db.from('leads').select('id', { count: 'exact', head: true }).eq('herkunft_tenant', ich).gte('created_at', jahr).neq('status', 'neu'),
        db.from('netz_paket').select('id, titel, text, partner, aktiv').eq('tenant_id', ich).order('reihenfolge')
      ]);
      return res.status(200).json({
        ok: true, ich, rolle, darf: darf(rolle, 'bearbeiten'), branchen: BRANCHEN, hat_profil: !!prof,
        profil: Object.assign({ name: (t && t.name) || '', bilder: [], sichtbar: true }, prof || {}, { likes: likes || 0 }),
        kontakte: vs.filter((v) => v.status === 'ok').map((v) => k[v.von === ich ? v.an : v.von]).filter(Boolean),
        rein: vs.filter((v) => v.status === 'offen' && v.an === ich).map((v) => Object.assign({ verbindung: v.id, am: v.created_at }, k[v.von])),
        raus: vs.filter((v) => v.status === 'offen' && v.von === ich).map((v) => Object.assign({ verbindung: v.id, am: v.created_at }, k[v.an])),
        partner: (pa || []).map((x) => Object.assign({ zugestimmt: x.zugestimmt }, k[x.partner_id])),
        partner_bitten: (pz || []).map((x) => Object.assign({ zugestimmt: x.zugestimmt }, k[x.tenant_id])),
        pakete: (pk && pk.data) || [],
        empfehlungen: { bekommen: bekommen || 0, geschickt: geschickt || 0, angenommen: angenommen || 0 },
        ungelesen: ungelesen || 0,
        ...(await (async () => {
          // Ohne sql/41 fehlen die Tabellen: dann gibt es die Zusätze einfach nicht.
          try {
            const kontaktIds = vs.filter((v) => v.status === 'ok').map((v) => v.von === ich ? v.an : v.von);
            const region = String((prof && prof.plz) || '').slice(0, 2);
            const [{ data: bs }, az, top, { data: fr }] = await Promise.all([
              db.from('netz_besuch').select('besucher, tag').eq('ziel', ich).gte('tag', vorTagen(13)),
              antwortZeit(ich),
              topEmpfehler(region),
              kontaktIds.length ? db.from('netz_profil').select('tenant_id, freie_tage').in('tenant_id', kontaktIds.slice(0, 200)) : Promise.resolve({ data: [] })
            ]);
            const grenze = vorTagen(6);
            const woche = [...new Set((bs || []).filter((b) => b.tag >= grenze).map((b) => b.besucher))];
            const vorher = [...new Set((bs || []).filter((b) => b.tag < grenze).map((b) => b.besucher))];
            const { data: bb } = woche.length ? await db.from('netz_profil').select('branche').in('tenant_id', woche) : { data: [] };
            const branchen = {}; (bb || []).forEach((x) => { const b = x.branche || 'sonstige'; branchen[b] = (branchen[b] || 0) + 1; });
            const h = heuteISO();
            const pf = (fr || []).map((x) => ({ id: x.tenant_id, tage: (x.freie_tage || []).filter((t) => t >= h).sort().slice(0, 8) })).filter((x) => x.tage.length);
            const pk2 = await profileVon(pf.map((x) => x.id));
            const rang = top.rang || [];
            return {
              besuche: { woche: woche.length, vorwoche: vorher.length, branchen },
              antwort: az,
              top: { monat: top.monat, region, liste: top.liste, ich: { anzahl: (top.zahl || {})[ich] || 0, platz: rang.indexOf(ich) + 1 || null } },
              partner_frei: pf.map((x) => Object.assign({ tage: x.tage }, pk2[x.id])).sort((a, b) => (a.tage[0] < b.tage[0] ? -1 : 1))
            };
          } catch (e) { return {}; }
        })())
      });
    }

    /* Vertrauenspunkte (sql/44). Ohne die Tabelle gibt es einfach keine Zahlen. */
    if (was === 'vertrauen') {
      try {
        const [v, { data: me }] = await Promise.all([aktualisieren(ich), db.from('netz_profil').select('plz, land, sichtbar, gesperrt, rang_zeigen').eq('tenant_id', ich).maybeSingle()]);
        if (!v) return res.status(200).json({ ok: false, error: 'Punkte gerade nicht verfügbar.' });
        const drin = !!(me && me.sichtbar !== false && !me.gesperrt && me.rang_zeigen !== false);
        const [region, land, dach] = await Promise.all(['region', (me && me.land) || 'DE', 'dach'].map((g) => platzVon(v.punkte, g, me, '')));
        return res.status(200).json({
          ok: true, punkte: v.punkte, stufe: stufeVon(v.punkte), anfragen: v.anfragen, abschluesse: v.abschluesse, missionen: v.missionen || [],
          bonus_anzahl: v.bonus_anzahl || 0, geworben: v.geworben || 0, werbe_rabatt_monate: v.werbe_rabatt_monate || 0, kronen: v.kronen || 0,
          krone: kroneAktiv(v) ? { bis: v.krone_bis, region: String(v.krone_region || '').slice(3) } : null,
          rabatt: rabattVon(stufeVon(v.punkte)), zahlung_aktiv: process.env.ZAHLUNG_AKTIV === '1',
          werbe_code: await werbeCode(ich).catch(() => null),
          siegel: await db.from('widgets').select('slug').eq('tenant_id', ich).eq('status', 'live').order('created_at').limit(1).then((r) => (r.data && r.data[0] && r.data[0].slug) || null, () => null),
          regeln: { anfrage: PRO_ANFRAGE, abschluss: PRO_ABSCHLUSS, pro_tag: MAX_PRO_TAG },
          rangliste: { drin, profil: !!me, region: String((me && me.plz) || '').slice(0, 2), land: (me && me.land) || 'DE', plaetze: { region, land, dach } }
        });
      } catch (e) { return res.status(200).json({ ok: false, error: 'Punkte gerade nicht verfügbar.' }); }
    }

    if (was === 'rangliste') {
      try {
        const gebiet = ['region', 'DE', 'AT', 'CH', 'dach'].includes(p.gebiet) ? p.gebiet : 'region';
        const branche = p.branche && BRANCHEN[p.branche] ? p.branche : '';
        const [v, { data: me }] = await Promise.all([aktualisieren(ich), db.from('netz_profil').select('plz, land, sichtbar, gesperrt, rang_zeigen').eq('tenant_id', ich).maybeSingle()]);
        const { data: ls } = await rangFilter(db.from('vertrauen_rang').select('*').order('punkte', { ascending: false }).order('name').limit(100), gebiet, me, branche);
        const liste = ls || [];
        const punkte = (v && v.punkte) || 0;
        const pl = await platzVon(punkte, gebiet, me, branche);
        const grenze = (n) => (liste.length >= n ? liste[n - 1].punkte : 0);
        return res.status(200).json({
          ok: true, gebiet, branche, branchen: BRANCHEN, region: String((me && me.plz) || '').slice(0, 2), land: (me && me.land) || 'DE',
          liste: liste.map((x) => ({
            id: x.tenant_id, platz: 1 + liste.filter((y) => y.punkte > x.punkte).length, punkte: x.punkte, stufe: stufeVon(x.punkte),
            name: x.name || 'Betrieb', branche: x.branche || 'sonstige', branche_text: BRANCHEN[x.branche] || BRANCHEN.sonstige, ort: x.ort || '', land: x.land,
            bild: x.personbild || x.titelbild || null, ich: x.tenant_id === ich, krone: kroneAktiv(x)
          })),
          ich: {
            punkte, stufe: stufeVon(punkte), platz: pl.platz, gesamt: pl.gesamt, profil: !!me,
            drin: !!(me && me.sichtbar !== false && !me.gesperrt && me.rang_zeigen !== false),
            fehlt: [3, 10, 50, 100].reduce((o, n) => { const g = grenze(n); if (g && punkte <= g && pl.platz > n) o[n] = g - punkte + 1; return o; }, {})
          }
        });
      } catch (e) { return res.status(200).json({ ok: false, error: 'Die Rangliste ist gerade nicht verfügbar.' }); }
    }

    if (was === 'puls') {
      const [{ count: ungelesen }, { count: rein }, { data: letzte }] = await Promise.all([
        db.from('netz_nachricht').select('id', { count: 'exact', head: true }).eq('an', ich).is('gelesen_at', null),
        db.from('netz_verbindung').select('id', { count: 'exact', head: true }).eq('an', ich).eq('status', 'offen'),
        db.from('netz_nachricht').select('created_at').or('von.eq.' + ich + ',an.eq.' + ich).order('created_at', { ascending: false }).limit(1)
      ]);
      return res.status(200).json({ ok: true, ungelesen: ungelesen || 0, rein: rein || 0, letzte: (letzte && letzte[0] && letzte[0].created_at) || null });
    }

    if (was === 'feed') {
      const [{ data: me }, vs, { data: bl }] = await Promise.all([
        db.from('netz_profil').select('*').eq('tenant_id', ich).maybeSingle(),
        verbindungen(ich),
        db.from('netz_block').select('von, an').or(`von.eq.${ich},an.eq.${ich}`)
      ]);
      const raus = new Set(); (bl || []).forEach((b) => raus.add(b.von === ich ? b.an : b.von));
      const kontakte = vs.filter((v) => v.status === 'ok').map((v) => v.von === ich ? v.an : v.von);
      const region = String((me && me.plz) || '').slice(0, 2);
      const abfragen = [];
      if (kontakte.length) abfragen.push(db.from('netz_profil').select('*').in('tenant_id', kontakte.slice(0, 200)));
      let nah = db.from('netz_profil').select('*').eq('sichtbar', true).eq('gesperrt', false).order('updated_at', { ascending: false }).limit(60);
      if (region) nah = nah.like('plz', region + '%');
      abfragen.push(nah);
      const rs = await Promise.all(abfragen);
      const ps = {};
      if (me) ps[ich] = me;
      rs.forEach((r) => (r.data || []).forEach((x) => { if (!raus.has(x.tenant_id)) ps[x.tenant_id] = x; }));
      const liste = [];
      Object.values(ps).forEach((pr) => (pr.bilder || []).forEach((b) => { if (b.am) liste.push({ pr, b }); }));
      liste.sort((x, y) => (x.b.am < y.b.am ? 1 : -1));
      const top = liste.slice(0, 30);
      const ziele = [...new Set(top.map((x) => x.pr.tenant_id))];
      const { data: lk } = ziele.length ? await db.from('netz_like').select('von, ziel, bild').in('ziel', ziele).neq('bild', '') : { data: [] };
      const lks = lk || [];
      return res.status(200).json({
        ok: true, beitraege: top.map(({ pr, b }) => {
          const id = pr.tenant_id;
          return {
            bild: b.id, url: b.url, text: b.text || '', am: b.am, eigen: id === ich, kontakt: kontakte.includes(id),
            likes: lks.filter((l) => l.ziel === id && l.bild === b.id).length, ich_like: lks.some((l) => l.ziel === id && l.bild === b.id && l.von === ich),
            betrieb: Object.assign(karte(pr), { status: id === ich ? 'selbst' : statusMit(vs, ich, id) })
          };
        })
      });
    }

    if (was === 'suche') {
      const { data: bl } = await db.from('netz_block').select('von, an').or(`von.eq.${ich},an.eq.${ich}`);
      const raus = new Set([ich]); (bl || []).forEach((b) => { raus.add(b.von); raus.add(b.an); });
      let q = db.from('netz_profil').select('*').eq('sichtbar', true).eq('gesperrt', false).order('updated_at', { ascending: false }).limit(60);
      if (p.branche && BRANCHEN[p.branche]) q = q.eq('branche', p.branche);
      const region = String(p.region || '').replace(/\D/g, '').slice(0, 2);
      if (region) q = q.like('plz', region + '%');
      const such = kurz(p.q, 60).replace(/[%,()"\\*]/g, '');   // keine Zeichen, die im .or()-Filter etwas bedeuten
      if (such) q = q.or(`name.ilike.%${such}%,ort.ilike.%${such}%,text.ilike.%${such}%`);
      const [{ data: ps }, vs] = await Promise.all([q, verbindungen(ich)]);
      const liste = (ps || []).filter((x) => !raus.has(x.tenant_id));
      const ids = liste.map((x) => x.tenant_id);
      const { data: lk } = ids.length ? await db.from('netz_like').select('ziel, von').in('ziel', ids).eq('bild', '') : { data: [] };
      const zahl = {}, mag = {}; (lk || []).forEach((l) => { zahl[l.ziel] = (zahl[l.ziel] || 0) + 1; if (l.von === ich) mag[l.ziel] = true; });
      return res.status(200).json({
        ok: true, branchen: BRANCHEN,
        treffer: liste.map((x) => Object.assign(karte(x), { likes: zahl[x.tenant_id] || 0, ich_like: !!mag[x.tenant_id], status: statusMit(vs, ich, x.tenant_id) }))
      });
    }

    if (was === 'profil') {
      const id = String(p.id || '');
      if (!id) return res.status(400).json({ ok: false });
      if (id !== ich && await geblockt(ich, id)) return res.status(404).json({ ok: false, error: 'Profil nicht verfügbar.' });
      const [{ data: pr }, { data: t }, { data: lk }, vs, { data: pa }] = await Promise.all([
        db.from('netz_profil').select('*').eq('tenant_id', id).maybeSingle(),
        db.from('tenants').select('name').eq('id', id).maybeSingle(),
        db.from('netz_like').select('von, bild').eq('ziel', id),
        verbindungen(id),
        db.from('netz_partner').select('partner_id').eq('tenant_id', id).eq('zugestimmt', true)
      ]);
      if (!pr && id !== ich) return res.status(404).json({ ok: false, error: 'Dieser Betrieb hat noch kein Profil.' });
      if (id !== ich) db.from('netz_besuch').upsert({ besucher: ich, ziel: id, tag: heuteISO() }, { onConflict: 'besucher,ziel,tag', ignoreDuplicates: true }).then(() => {}, () => {});
      let abzeichen = {};
      try {
        const [az, top] = await Promise.all([antwortZeit(id), topEmpfehler(String((pr && pr.plz) || '').slice(0, 2))]);
        const pl = (top.liste || []).find((x) => x.id === id);
        abzeichen = { antwort: az && az.stufe ? az.stufe : null, top: pl ? { platz: pl.platz, monat: top.monat } : null };
      } catch (e) {}
      // Vertrauensabzeichen: nur, wenn der Betrieb in der Rangliste erscheinen möchte (sql/44)
      try {
        if (!pr || pr.rang_zeigen !== false) {
          const { data: vt } = await db.from('vertrauen').select('punkte, krone_bis, krone_region').eq('tenant_id', id).maybeSingle();
          const s = vt ? stufeVon(vt.punkte) : -1;
          if (s > -1) abzeichen.vertrauen = s;
          if (kroneAktiv(vt)) abzeichen.krone = String(vt.krone_region || '').slice(3);
        }
      } catch (e) {}
      const pp = pr || { tenant_id: id };
      const lks = lk || [];
      const kontaktIds = vs.filter((v) => v.status === 'ok').map((v) => v.von === id ? v.an : v.von);
      const kk = await profileVon(kontaktIds.slice(0, 24));
      const partnerIds = new Set((pa || []).map((x) => x.partner_id));
      return res.status(200).json({
        ok: true, eigen: id === ich,
        profil: Object.assign(karte(pp, t), {
          text: pp.text || '', person_name: pp.person_name || '', person_rolle: pp.person_rolle || '', umkreis_km: pp.umkreis_km || null,
          personbild: pp.personbild || null, eckdaten: pp.eckdaten || [],
          likes: lks.filter((l) => l.bild === '').length, ich_like: lks.some((l) => l.bild === '' && l.von === ich),
          bilder: (pp.bilder || []).map((b) => ({ id: b.id, url: b.url, text: b.text || '', am: b.am || null, likes: lks.filter((l) => l.bild === b.id).length, ich_like: lks.some((l) => l.bild === b.id && l.von === ich) })),
          status: id === ich ? 'selbst' : statusMit(await verbindungen(ich), ich, id),
          abzeichen,
          // Freie Termine sehen nur vernetzte Betriebe.
          freie_tage: (id === ich || await istKontakt(ich, id)) ? ((pp.freie_tage || []).filter((t) => t >= heuteISO()).slice(0, 8)) : []
        }),
        kontakte: kontaktIds.slice(0, 24).map((k) => Object.assign({ partner: partnerIds.has(k) }, kk[k])).filter((x) => x && x.id)
          .sort((a, b) => (b.partner ? 1 : 0) - (a.partner ? 1 : 0))
      });
    }

    if (was === 'gespraeche') {
      const { data: ms } = await db.from('netz_nachricht').select('*').or(`von.eq.${ich},an.eq.${ich}`).order('created_at', { ascending: false }).limit(400);
      const g = {};
      (ms || []).forEach((m) => {
        const mit = m.von === ich ? m.an : m.von;
        if (!g[mit]) g[mit] = { mit, letzte: kurz(m.text, 90), am: m.created_at, von_mir: m.von === ich, ungelesen: 0 };
        if (m.an === ich && !m.gelesen_at) g[mit].ungelesen++;
      });
      const k = await profileVon(Object.keys(g));
      return res.status(200).json({ ok: true, gespraeche: Object.values(g).map((x) => Object.assign(x, { name: k[x.mit].name, bild: k[x.mit].bild, branche_text: k[x.mit].branche_text })) });
    }

    if (was === 'verlauf') {
      const mit = String(p.mit || '');
      if (!istId(mit)) return res.status(400).json({ ok: false });
      const [{ data: ms }, k, kontakt] = await Promise.all([
        db.from('netz_nachricht').select('*').or(`and(von.eq.${ich},an.eq.${mit}),and(von.eq.${mit},an.eq.${ich})`).order('created_at').limit(300),
        profileVon([mit]),
        istKontakt(ich, mit)
      ]);
      db.from('netz_nachricht').update({ gelesen_at: new Date().toISOString() }).eq('von', mit).eq('an', ich).is('gelesen_at', null).then(() => {}, () => {});
      return res.status(200).json({ ok: true, mit: k[mit], kontakt, nachrichten: (ms || []).map((m) => ({ id: m.id, ich: m.von === ich, text: m.text, am: m.created_at })) });
    }
    if (was === 'lead') {
      const lead = await meineAnfrage(p.id, user);
      if (!lead) return res.status(404).json({ ok: false });
      const vs = await verbindungen(ich);
      const k = await profileVon(vs.filter((v) => v.status === 'ok').map((v) => v.von === ich ? v.an : v.von));
      const frei = await freiAm(Object.keys(k), lead.termin);
      return res.status(200).json({ ok: true, termin: lead.termin || null, weiter_ok: !!lead.weiter_ok, weitergeleitet: lead.weitergeleitet || [],
        kontakte: Object.values(k).map((x) => Object.assign({ frei: frei[x.id] || 'unbekannt' }, x)) });
    }
    return res.status(400).json({ ok: false, error: 'unbekannt' });
  }

  /* ═══ Schreiben ═══ */
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!darf(rolle, 'bearbeiten')) return res.status(403).json({ ok: false, error: 'Ihre Rolle darf hier nichts ändern.' });
  const a = p.aktion;
  const jetzt = new Date().toISOString();

  // Gesperrte Profile dürfen nichts mehr einstellen oder schreiben, nur noch entfernen, melden und blockieren.
  if (!['bild_weg', 'melden', 'blockieren', 'trennen'].includes(a)) {
    const { data: sp } = await db.from('netz_profil').select('gesperrt, gesperrt_grund').eq('tenant_id', ich).maybeSingle();
    if (sp && sp.gesperrt) return res.status(403).json({ ok: false, gesperrt: true, error: 'Ihre Teilnahme am Netzwerk ist gesperrt' + (sp.gesperrt_grund ? ': ' + sp.gesperrt_grund : '') + '. Bei Fragen schreiben Sie an projekt@clickzauber.de.' });
  }
  // Prüft Text und Bild, bevor etwas gespeichert oder verschickt wird.
  async function sauber(art, text, bild) {
    const erg = await pruefen({ text, bild });
    if (erg.ok) return true;
    await vermerken(ich, art, text, erg);
    res.status(422).json({ ok: false, blockiert: true, error: 'Das können wir so nicht veröffentlichen (' + erg.grund + '). Bitte ändern Sie ' + (bild ? 'das Bild.' : 'den Text.') });
    return false;
  }

  if (a === 'profil') {
    const x = p.profil || {};
    const satz = {
      tenant_id: ich, name: kurz(x.name, 80) || null, branche: BRANCHEN[x.branche] ? x.branche : 'sonstige',
      ort: kurz(x.ort, 80) || null, plz: kurz(x.plz, 5).replace(/\D/g, '') || null,
      umkreis_km: Math.max(0, Math.min(1000, parseInt(x.umkreis_km, 10) || 0)) || null,
      text: kurz(x.text, 1200) || null, person_name: kurz(x.person_name, 80) || null, person_rolle: kurz(x.person_rolle, 60) || null,
      sichtbar: x.sichtbar !== false, updated_at: jetzt,
      land: ['DE', 'AT', 'CH'].includes(x.land) ? x.land : 'DE', rang_zeigen: x.rang_zeigen !== false,
      eckdaten: (Array.isArray(x.eckdaten) ? x.eckdaten : []).slice(0, 3)
        .map((f) => ({ wert: kurz(f && f.wert, 16), label: kurz(f && f.label, 24) })).filter((f) => f.wert)
    };
    if (!satz.name) return res.status(400).json({ ok: false, error: 'Bitte den Namen des Betriebs angeben.' });
    if (!await sauber('profil', [satz.name, satz.text, satz.person_name, satz.person_rolle, satz.ort].concat(satz.eckdaten.map((f) => f.wert + ' ' + f.label)).filter(Boolean).join('\n'))) return;
    const { error } = await db.from('netz_profil').upsert(satz, { onConflict: 'tenant_id' });
    if (error) return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' });
    return res.status(200).json({ ok: true });
  }

  if (a === 'bild') {
    const art = ['titel', 'person', 'galerie'].includes(p.art) ? p.art : 'galerie';
    const { data: pr } = await db.from('netz_profil').select('*').eq('tenant_id', ich).maybeSingle();
    if (!pr) return res.status(400).json({ ok: false, error: 'Bitte zuerst das Profil speichern.' });
    if (art === 'galerie' && (pr.bilder || []).length >= MAX_BILDER) return res.status(400).json({ ok: false, error: `Höchstens ${MAX_BILDER} Bilder.` });
    if (!/^data:image\/(jpeg|webp|png);base64,/.test(String(p.daten || ''))) return res.status(400).json({ ok: false, error: 'Bitte ein Foto als JPG, PNG oder WebP wählen.' });
    if (!await sauber('bild', kurz(p.text, 600), p.daten)) return;
    const b = await bildHochladen(ich, p.daten);
    if (b.fehler) return res.status(400).json({ ok: false, error: b.fehler });
    const upd = { updated_at: jetzt };
    if (art === 'titel') { await bildEntfernen(pr.titelbild); upd.titelbild = b.url; }
    else if (art === 'person') { await bildEntfernen(pr.personbild); upd.personbild = b.url; }
    else upd.bilder = [...(pr.bilder || []), { id: b.id, url: b.url, text: kurz(p.text, 600), am: jetzt }];
    await db.from('netz_profil').update(upd).eq('tenant_id', ich);
    return res.status(200).json({ ok: true, id: b.id, url: b.url });
  }

  if (a === 'bild_weg') {
    const { data: pr } = await db.from('netz_profil').select('*').eq('tenant_id', ich).maybeSingle();
    if (!pr) return res.status(200).json({ ok: true });
    const upd = { updated_at: jetzt };
    if (p.art === 'titel') { await bildEntfernen(pr.titelbild); upd.titelbild = null; }
    else if (p.art === 'person') { await bildEntfernen(pr.personbild); upd.personbild = null; }
    else {
      const weg = (pr.bilder || []).find((b) => b.id === p.id);
      if (weg) await bildEntfernen(weg.url);
      upd.bilder = (pr.bilder || []).filter((b) => b.id !== p.id);
      await db.from('netz_like').delete().eq('ziel', ich).eq('bild', String(p.id || ''));
    }
    await db.from('netz_profil').update(upd).eq('tenant_id', ich);
    return res.status(200).json({ ok: true });
  }

  if (a === 'vernetzen') {
    const an = String(p.an || '');
    if (!istId(an) || an === ich) return res.status(400).json({ ok: false });
    if (await geblockt(ich, an)) return res.status(403).json({ ok: false, error: 'Mit diesem Betrieb ist keine Verbindung möglich.' });
    const { data: pr } = await db.from('netz_profil').select('tenant_id').eq('tenant_id', ich).maybeSingle();
    if (!pr) return res.status(400).json({ ok: false, error: 'Bitte legen Sie zuerst Ihr Profil an. Der andere Betrieb soll sehen, wer anfragt.' });
    const seit = new Date(Date.now() - 864e5).toISOString();
    const { count } = await db.from('netz_verbindung').select('id', { count: 'exact', head: true }).eq('von', ich).gte('created_at', seit);
    if ((count || 0) >= MAX_NEU_PRO_TAG) return res.status(429).json({ ok: false, error: 'Heute sind schon ' + MAX_NEU_PRO_TAG + ' Anfragen verschickt. Morgen geht es weiter.' });
    const { data: gegen } = await db.from('netz_verbindung').select('*').eq('von', an).eq('an', ich).maybeSingle();
    const name = await eigenerName(ich);
    if (gegen && gegen.status === 'offen') {
      await db.from('netz_verbindung').update({ status: 'ok', beantwortet_at: jetzt }).eq('id', gegen.id);
      melden(an, name + ' hat angenommen', 'Sie sind jetzt vernetzt.', '#vernetzen');
      mail(an, name + ' hat Ihre Anfrage angenommen', [name + ' und Sie sind jetzt auf clickzauber vernetzt. Sie können sich ab sofort im Cockpit schreiben.'], COCKPIT + '#vernetzen');
      return res.status(200).json({ ok: true, status: 'ok' });
    }
    const { error } = await db.from('netz_verbindung').upsert({ von: ich, an, status: 'offen', created_at: jetzt, beantwortet_at: null }, { onConflict: 'von,an' });
    if (error) return res.status(500).json({ ok: false, error: 'Anfrage fehlgeschlagen.' });
    const text = kurz(p.nachricht, 1000);
    if (text && !await sauber('nachricht', text)) { await db.from('netz_verbindung').delete().eq('von', ich).eq('an', an).eq('status', 'offen'); return; }
    if (text) await db.from('netz_nachricht').insert({ von: ich, an, text });
    melden(an, 'Neue Vernetzungs-Anfrage', name + (text ? ': ' + kurz(text, 100) : ' möchte sich mit Ihnen vernetzen.'), '#vernetzen');
    mail(an, name + ' möchte sich mit Ihnen vernetzen', [name + ' möchte sich auf clickzauber mit Ihnen vernetzen.', ...(text ? ['Nachricht: „' + text + '“'] : []), 'Sie können die Anfrage im Cockpit unter „Vernetzen“ annehmen oder ablehnen.'], COCKPIT + '#vernetzen');
    return res.status(200).json({ ok: true, status: 'offen_raus' });
  }

  if (a === 'antwort') {
    const { data: v } = await db.from('netz_verbindung').select('*').eq('id', p.id).eq('an', ich).maybeSingle();
    if (!v) return res.status(404).json({ ok: false });
    await db.from('netz_verbindung').update({ status: p.ja ? 'ok' : 'abgelehnt', beantwortet_at: jetzt }).eq('id', v.id);
    if (p.ja) {
      const name = await eigenerName(ich);
      melden(v.von, name + ' hat angenommen', 'Sie sind jetzt vernetzt.', '#vernetzen');
      mail(v.von, name + ' hat Ihre Anfrage angenommen', [name + ' und Sie sind jetzt auf clickzauber vernetzt. Sie können sich ab sofort im Cockpit schreiben.'], COCKPIT + '#vernetzen');
    }
    return res.status(200).json({ ok: true });
  }

  if (a === 'trennen') {
    const mit = String(p.mit || '');
    if (!istId(mit)) return res.status(400).json({ ok: false });
    await Promise.all([
      db.from('netz_verbindung').delete().or(`and(von.eq.${ich},an.eq.${mit}),and(von.eq.${mit},an.eq.${ich})`),
      db.from('netz_partner').delete().or(`and(tenant_id.eq.${ich},partner_id.eq.${mit}),and(tenant_id.eq.${mit},partner_id.eq.${ich})`)
    ]);
    return res.status(200).json({ ok: true });
  }

  if (a === 'nachricht') {
    const an = String(p.an || ''), text = kurz(p.text, 2000);
    if (!an || !text) return res.status(400).json({ ok: false, error: 'Die Nachricht ist leer.' });
    if (await geblockt(ich, an)) return res.status(403).json({ ok: false, error: 'Nachricht nicht möglich.' });
    if (!await istKontakt(ich, an)) return res.status(403).json({ ok: false, error: 'Schreiben geht erst, wenn Sie vernetzt sind.' });
    if (!await sauber('nachricht', text)) return;
    const { data: offen } = await db.from('netz_nachricht').select('id').eq('von', ich).eq('an', an).is('gelesen_at', null).limit(1);
    const { data, error } = await db.from('netz_nachricht').insert({ von: ich, an, text }).select('id, created_at').single();
    if (error) return res.status(500).json({ ok: false, error: 'Senden fehlgeschlagen.' });
    // Nur die erste ungelesene Nachricht löst eine Mail aus — sonst eine Mail pro Zeile.
    const name = await eigenerName(ich);
    melden(an, name, kurz(text, 140), '#nachrichten');
    if (!offen || !offen.length) {
      mail(an, 'Neue Nachricht von ' + name, [name + ' hat Ihnen auf clickzauber geschrieben:', '„' + kurz(text, 300) + '“'], COCKPIT + '#nachrichten');
    }
    return res.status(200).json({ ok: true, id: data.id, am: data.created_at });
  }

  if (a === 'like') {
    const ziel = String(p.ziel || ''), bild = kurz(p.bild, 40);
    if (!ziel || ziel === ich) return res.status(400).json({ ok: false });
    const { data: da } = await db.from('netz_like').select('von').eq('von', ich).eq('ziel', ziel).eq('bild', bild).maybeSingle();
    if (da) await db.from('netz_like').delete().eq('von', ich).eq('ziel', ziel).eq('bild', bild);
    else await db.from('netz_like').insert({ von: ich, ziel, bild });
    const { count } = await db.from('netz_like').select('von', { count: 'exact', head: true }).eq('ziel', ziel).eq('bild', bild);
    return res.status(200).json({ ok: true, an: !da, anzahl: count || 0 });
  }

  if (a === 'partner') {
    const liste = [...new Set((Array.isArray(p.liste) ? p.liste : []).map(String))].filter((x) => x && x !== ich).slice(0, MAX_PARTNER);
    const ok = [];
    for (const id of liste) if (await istKontakt(ich, id)) ok.push(id);
    const { data: alt } = await db.from('netz_partner').select('*').eq('tenant_id', ich);
    const weg = (alt || []).filter((x) => !ok.includes(x.partner_id)).map((x) => x.partner_id);
    if (weg.length) await db.from('netz_partner').delete().eq('tenant_id', ich).in('partner_id', weg);
    const name = await eigenerName(ich);
    for (let i = 0; i < ok.length; i++) {
      const vorher = (alt || []).find((x) => x.partner_id === ok[i]);
      if (vorher) await db.from('netz_partner').update({ reihenfolge: i }).eq('tenant_id', ich).eq('partner_id', ok[i]);
      else {
        await db.from('netz_partner').insert({ tenant_id: ich, partner_id: ok[i], reihenfolge: i, zugestimmt: false });
        mail(ok[i], name + ' möchte Sie als Partner zeigen', [name + ' möchte Sie im eigenen Anfrageformular unter „Unsere Partner“ zeigen, mit Link zu Ihrer Anfrageseite.', 'Sichtbar wird das erst, wenn Sie im Cockpit unter „Vernetzen“ zustimmen.'], COCKPIT + '#vernetzen');
      }
    }
    return res.status(200).json({ ok: true, anzahl: ok.length });
  }

  if (a === 'partner_zustimmen') {
    const von = String(p.von || '');
    if (p.ja) await db.from('netz_partner').update({ zugestimmt: true }).eq('tenant_id', von).eq('partner_id', ich);
    else await db.from('netz_partner').delete().eq('tenant_id', von).eq('partner_id', ich);
    return res.status(200).json({ ok: true });
  }

  if (a === 'blockieren') {
    const an = String(p.an || '');
    if (!istId(an) || an === ich) return res.status(400).json({ ok: false });
    await db.from('netz_block').upsert({ von: ich, an }, { onConflict: 'von,an' });
    await Promise.all([
      db.from('netz_verbindung').delete().or(`and(von.eq.${ich},an.eq.${an}),and(von.eq.${an},an.eq.${ich})`),
      db.from('netz_partner').delete().or(`and(tenant_id.eq.${ich},partner_id.eq.${an}),and(tenant_id.eq.${an},partner_id.eq.${ich})`)
    ]);
    return res.status(200).json({ ok: true });
  }

  if (a === 'melden') {
    const ziel = String(p.ziel || ''), grund = kurz(p.grund, 600);
    if (!ziel) return res.status(400).json({ ok: false });
    // Gespräch melden: die letzten Nachrichten des Gemeldeten werden als Auszug gespeichert.
    let auszug = null;
    if (p.chat) {
      const { data: ms } = await db.from('netz_nachricht').select('text, created_at').eq('von', ziel).eq('an', ich).order('created_at', { ascending: false }).limit(15);
      auszug = (ms || []).reverse().map((m) => '[' + new Date(m.created_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + '] ' + m.text).join('\n').slice(0, 6000) || null;
    }
    await db.from('netz_meldung').insert({ von: ich, ziel, bild: kurz(p.bild, 40) || null, grund: grund || null, art: p.chat ? 'nachricht' : (p.bild ? 'bild' : 'profil'), auszug });
    if (MAIL_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject: 'Meldung im Netz: ' + ziel,
          html: `<p>Betrieb ${ich} meldet Betrieb ${ziel}${p.bild ? ', Bild ' + kurz(p.bild, 40) : ''}.</p><p>${grund.replace(/</g, '&lt;') || '(ohne Begründung)'}</p>` })
      }).catch(() => {});
    }
    return res.status(200).json({ ok: true });
  }

  if (a === 'weiterleiten') {
    const lead = await meineAnfrage(p.lead, user);
    if (!lead) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden.' });
    // Option A: mehrere Partner auf einmal, auf Wunsch mit Nachricht an den Gast.
    const liste = [...new Set((Array.isArray(p.an) ? p.an : [p.an]).map((x) => String(x || '')).filter(Boolean))].slice(0, 5);
    if (!liste.length) return res.status(400).json({ ok: false, error: 'Bitte mindestens einen Partner wählen.' });
    const gut = [], fehler = [];
    for (const an of liste) {
      const r = await weitergeben(ich, lead, an, kurz(p.hinweis, 600), '');
      if (r.ok) gut.push(an); else fehler.push(r.error);
    }
    if (!gut.length) return res.status(400).json({ ok: false, error: fehler[0] || 'Weiterleiten fehlgeschlagen.' });
    let gast = false;
    if (p.gast_info && lead.email) gast = await gastInformieren(ich, lead, gut, kurz(p.gast_text, 1200));
    return res.status(200).json({ ok: true, gesendet: gut.length, fehler, gast });
  }

  if (a === 'frei') {
    const { data: pr } = await db.from('netz_profil').select('freie_tage, freie_tage_am').eq('tenant_id', ich).maybeSingle();
    if (!pr) return res.status(400).json({ ok: false, error: 'Bitte legen Sie zuerst Ihr Profil an.' });
    const upd = {};
    if (Array.isArray(p.tage)) upd.freie_tage = tageSauber(p.tage);
    if (typeof p.frei_zeigen === 'boolean') upd.frei_zeigen = p.frei_zeigen;
    const neu = (upd.freie_tage || []).filter((t) => !(pr.freie_tage || []).includes(t));
    // Kontakte höchstens einmal am Tag benachrichtigen, und nur über neu gemeldete Tage.
    const zuletzt = pr.freie_tage_am ? new Date(pr.freie_tage_am).getTime() : 0;
    const melde = neu.length && Date.now() - zuletzt > 864e5;
    if (melde) upd.freie_tage_am = jetzt;
    const { error } = await db.from('netz_profil').update(upd).eq('tenant_id', ich);
    if (error) { console.error('netz_profil (sql/41?):', error.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    if (melde) {
      const name = await eigenerName(ich);
      const vs = (await verbindungen(ich)).filter((v) => v.status === 'ok');
      for (const v of vs.slice(0, 100)) melden(v.von === ich ? v.an : v.von, name + ' hat noch frei', neu.slice(0, 3).map(deTag).join(', ') + (neu.length > 3 ? ' …' : ''), '#vernetzen');
    }
    return res.status(200).json({ ok: true, tage: upd.freie_tage, benachrichtigt: !!melde });
  }

  if (a === 'pakete') {
    const { data: pa } = await db.from('netz_partner').select('partner_id').eq('tenant_id', ich).eq('zugestimmt', true);
    const ok = new Set((pa || []).map((x) => x.partner_id));
    const liste = (Array.isArray(p.liste) ? p.liste : []).slice(0, MAX_PAKETE).map((x, i) => ({
      tenant_id: ich, titel: kurz(x && x.titel, 80), text: kurz(x && x.text, 300) || null,
      partner: [...new Set((Array.isArray(x && x.partner) ? x.partner : []).map(String))].filter((id) => ok.has(id)).slice(0, 5),
      aktiv: !(x && x.aktiv === false), reihenfolge: i
    })).filter((x) => x.titel && x.partner.length);
    const { error: e1 } = await db.from('netz_paket').delete().eq('tenant_id', ich);
    if (e1) { console.error('netz_paket (sql/36?):', e1.message); return res.status(500).json({ ok: false, error: 'Speichern fehlgeschlagen.' }); }
    if (liste.length) {
      const { error: e2 } = await db.from('netz_paket').insert(liste);
      if (e2) return res.status(500).json({ ok: false, error: 'Pakete konnten nicht gespeichert werden.' });
    }
    return res.status(200).json({ ok: true, anzahl: liste.length });
  }

  return res.status(400).json({ ok: false, error: 'unbekannte Aktion' });
}
