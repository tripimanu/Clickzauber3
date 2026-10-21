// Vertrauenspunkte (sql/44, sql/45). Eine Quelle für Cockpit, Profil, Rangliste und Formular.
// Punkte = einmalige Missionen + 2 je Anfrage + 10 je Abschluss + Glücksanfragen + 200 je geworbenem Betrieb.
// Gegen Schummeln: jede Gast-Adresse zählt einmal, eigene Adressen nicht, höchstens 10 Anfragen pro Tag.
// Ein Abschluss zählt nur bei einer Anfrage, die selbst gezählt wurde.
import { db, MAIL_FROM } from './_lib.js';
import { antwortZeit } from './_antwortzeit.js';
import { pushSenden } from './_push.js';

export const PRO_ANFRAGE = 2, PRO_ABSCHLUSS = 10, MAX_PRO_TAG = 10, PRO_WERBUNG = 200;
// Glücksanfrage: ungefähr jede 25. gezählte Anfrage bringt 20 statt 2 Punkte.
export const BONUS_CHANCE = 1 / 25, BONUS_PUNKTE = 18;
// Gleiche Schwellen wie js/cz-abzeichen.js
export const STUFEN = [10, 100, 250, 500, 1000, 2000, 3500, 6000, 10000];
export const stufeVon = (p) => { let s = -1; STUFEN.forEach((ab, i) => { if (p >= ab) s = i; }); return s; };
// Einziger Vorteil je Stufe: Rabatt auf den Monatspreis. Alle Funktionen gelten für alle Betriebe gleich.
// Gleiche Werte wie js/cz-missionen.js (RABATT).
export const RABATT = [0, 0, 5, 10, 10, 10, 15, 15, 20];
export const rabattVon = (s) => (s >= 0 ? RABATT[s] || 0 : 0);
// Gleiche Punkte wie js/cz-missionen.js. werber = 0, die 200 Punkte laufen über „geworben“.
export const MISSIONEN = {
  willkommen: 10, formular: 20, mail: 15, datenschutz: 20, av: 20,
  eingebaut: 25, anfrage1: 20, vorlage: 15, loeschfrist: 15, kalender: 20,
  profil: 20, kontakt: 20, partner: 25, frei: 10,
  anfrage10: 20, gebucht: 25, schnell: 30, anfrage50: 30, kontakte5: 25, partner3: 30,
  // Sondertrophäen
  anfrage100: 50, hochzeit1: 30, nachteule: 15, jahr1: 50, monatssieger: 100, werber: 0
};
const HOCHZEIT = ['hochzeit', 'catering', 'foto', 'floristik', 'deko', 'musik', 'konditorei', 'planung', 'foodtruck'];

const tagVon = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const heute = () => tagVon(new Date().toISOString());

async function alle(bauen, max = 20000) {
  const aus = [];
  for (let ab = 0; ab < max; ab += 1000) {
    const { data, error } = await bauen().range(ab, ab + 999);
    if (error || !data) break;
    aus.push(...data);
    if (data.length < 1000) break;
  }
  return aus;
}
async function markieren(ids, feld, wert) {
  let n = 0;
  for (let i = 0; i < ids.length; i += 200) {
    // Nur Zeilen, die noch offen sind: so zählt ein zweiter, gleichzeitiger Aufruf nichts doppelt.
    const { data } = await db.from('leads').update({ [feld]: wert }).in('id', ids.slice(i, i + 200)).is(feld, null).select('id');
    n += (data || []).length;
  }
  return n;
}

// Neue Anfragen und Abschlüsse zählen. Gibt zurück, wie viele dazukamen.
async function zaehlen(tid, eigene) {
  const neu = await alle(() => db.from('leads').select('id, email, created_at').eq('tenant_id', tid).is('vt_anfrage', null).order('created_at'), 5000);
  let plusA = 0, bonus = 0;
  if (neu.length) {
    const gezaehlt = await alle(() => db.from('leads').select('email, created_at').eq('tenant_id', tid).eq('vt_anfrage', true));
    const schon = new Set(gezaehlt.map((l) => String(l.email || '').trim().toLowerCase()).filter(Boolean));
    const proTag = {}; gezaehlt.forEach((l) => { const t = tagVon(l.created_at); proTag[t] = (proTag[t] || 0) + 1; });
    const ja = [], nein = [];
    neu.forEach((l) => {
      const m = String(l.email || '').trim().toLowerCase(), t = tagVon(l.created_at);
      if (!m || eigene.has(m) || schon.has(m) || (proTag[t] || 0) >= MAX_PRO_TAG) { nein.push(l.id); return; }
      schon.add(m); proTag[t] = (proTag[t] || 0) + 1; ja.push(l.id);
    });
    plusA = await markieren(ja, 'vt_anfrage', true);
    await markieren(nein, 'vt_anfrage', false);
    for (let i = 0; i < plusA; i++) if (Math.random() < BONUS_CHANCE) bonus++;
  }
  const ab = await alle(() => db.from('leads').select('id').eq('tenant_id', tid).eq('vt_anfrage', true).is('vt_abschluss', null)
    .or('status.eq.gebucht,angenommen_am.not.is.null'), 5000);
  const plusB = ab.length ? await markieren(ab.map((x) => x.id), 'vt_abschluss', true) : 0;
  return { plusA, plusB, bonus };
}

// Freunde werben: geworbene Konten, die nach 30 Tagen noch ein Formular live haben.
async function werbungPruefen(tid) {
  const grenze = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: gs, error } = await db.from('users').select('id, tenant_id').eq('geworben_von', tid).eq('werbung_gutgeschrieben', false).lte('created_at', grenze).limit(50);
  if (error || !gs || !gs.length) return 0;
  let n = 0;
  for (const g of gs) {
    if (!g.tenant_id || g.tenant_id === tid) continue;
    const { count } = await db.from('widgets').select('id', { count: 'exact', head: true }).eq('tenant_id', g.tenant_id).eq('status', 'live');
    if (!count) continue;
    const { data: ok } = await db.from('users').update({ werbung_gutgeschrieben: true }).eq('id', g.id).eq('werbung_gutgeschrieben', false).select('id');
    if (ok && ok.length) n++;
  }
  return n;
}

async function missionenPruefen(tid, stand) {
  const q = (p) => p.then((r) => r, () => ({}));
  const [{ data: us }, { data: ws }, { data: ei }, { count: starts }, { count: vorl }, { data: pr }, { data: vs }, { count: pa }, az, { data: tn }, { data: ant }] = await Promise.all([
    q(db.from('users').select('touren').eq('tenant_id', tid)),
    q(db.from('widgets').select('id, belegung, branche').eq('tenant_id', tid)),
    q(db.from('einstellungen').select('*').eq('tenant_id', tid).maybeSingle()),
    q(db.from('events').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('type', 'start')),
    q(db.from('vorlagen').select('id', { count: 'exact', head: true }).eq('tenant_id', tid)),
    q(db.from('netz_profil').select('freie_tage, freie_tage_am, branche').eq('tenant_id', tid).maybeSingle()),
    q(db.from('netz_verbindung').select('id').eq('status', 'ok').or(`von.eq.${tid},an.eq.${tid}`)),
    q(db.from('netz_partner').select('partner_id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('zugestimmt', true)),
    antwortZeit(tid).catch(() => null),
    q(db.from('tenants').select('created_at').eq('id', tid).maybeSingle()),
    q(db.from('leads').select('erste_antwort_at').eq('tenant_id', tid).not('erste_antwort_at', 'is', null).order('erste_antwort_at', { ascending: false }).limit(300))
  ]);
  const w = ws || [], k = (vs || []).length, a = stand.anfragen, b = stand.abschluesse;
  const branche = (pr && pr.branche) || (w[0] && w[0].branche) || '';
  const spaet = (ant || []).some((l) => { const h = +new Date(l.erste_antwort_at).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Berlin' }); return h >= 22 || h < 5; });
  // Lesen und bestätigen (sql/60): ohne Haken im Cockpit keine Mission. Fehlt die Spalte noch, gilt der Wert allein.
  const bs = ei && Object.prototype.hasOwnProperty.call(ei, 'bestaetigt') ? (ei.bestaetigt || {}) : null;
  const best = (k) => !bs || !!bs[k];
  const ok = {
    willkommen: (us || []).some((u) => Array.isArray(u.touren) && u.touren.includes('cockpit')),
    formular: w.length > 0, mail: !!(ei && ei.mail_haupt) && best('mail'), datenschutz: !!(ei && ei.datenschutz_url) && best('datenschutz'), av: !!(ei && ei.av_vertrag_am),
    eingebaut: (starts || 0) > 0, anfrage1: a >= 1, vorlage: (vorl || 0) > 0, loeschfrist: !!(ei && ei.loeschfrist_monate) && best('loeschfrist'),
    // Verbunden heißt: Abo bestätigt (Probe-Termin gesehen) oder bestehender Kalender eingelesen.
    kalender: !!(ei && ei.kal_abo_bestaetigt_am) || w.some((x) => x.belegung && x.belegung.kal_url),
    profil: !!pr, kontakt: k >= 1, partner: (pa || 0) >= 1, frei: !!(pr && (pr.freie_tage_am || (pr.freie_tage || []).length)),
    anfrage10: a >= 10, gebucht: b >= 1, schnell: !!(az && az.stufe), anfrage50: a >= 50, kontakte5: k >= 5, partner3: (pa || 0) >= 3,
    anfrage100: a >= 100, hochzeit1: b >= 1 && HOCHZEIT.some((x) => String(branche).indexOf(x) === 0), nachteule: spaet,
    jahr1: !!(tn && tn.created_at && Date.now() - new Date(tn.created_at).getTime() >= 365 * 864e5),
    monatssieger: (stand.kronen || 0) > 0, werber: (stand.geworben || 0) > 0
  };
  return Object.keys(ok).filter((m) => ok[m]);
}

// Einen Betrieb neu berechnen. warte = Sekunden, in denen ein frischer Stand genügt.
export async function aktualisieren(tid, warte = 30) {
  if (!tid) return null;
  const { data: alt } = await db.from('vertrauen').select('*').eq('tenant_id', tid).maybeSingle();
  if (alt && warte && Date.now() - new Date(alt.aktualisiert).getTime() < warte * 1000) return alt;
  const vorher = alt || { anfragen: 0, abschluesse: 0, missionen: [], geworben: 0, kronen: 0 };
  // Eigene Adressen (Konto und Team) zählen nie als Gast.
  const [{ data: us }, { data: tm }] = await Promise.all([
    db.from('users').select('email').eq('tenant_id', tid),
    db.from('team').select('email').eq('tenant_id', tid).then((r) => r, () => ({}))
  ]);
  const eigene = new Set([...(us || []), ...(tm || [])].map((u) => String(u.email || '').trim().toLowerCase()).filter(Boolean));
  const { plusA, plusB, bonus } = await zaehlen(tid, eigene);
  const plusG = await werbungPruefen(tid).catch(() => 0);
  const stand = { anfragen: vorher.anfragen + plusA, abschluesse: vorher.abschluesse + plusB, kronen: vorher.kronen || 0, geworben: (vorher.geworben || 0) + plusG };
  const erfuellt = await missionenPruefen(tid, stand);
  const alle_m = [...new Set([...(vorher.missionen || []), ...erfuellt])].filter((m) => MISSIONEN[m] != null);
  const mp = alle_m.reduce((s, m) => s + MISSIONEN[m], 0);
  const { data, error } = await db.rpc('cz_vertrauen_buchen', {
    tid, plus_anfragen: plusA, plus_abschluesse: plusB, neue_missionen: alle_m, mp,
    plus_bonus: bonus * BONUS_PUNKTE, plus_bonus_anzahl: bonus, plus_geworben: plusG
  });
  if (error) return alt;
  return Array.isArray(data) ? data[0] : data;
}

// Werbe-Code für den Link clickzauber.de/clickzauber-anmelden.html?werber=CODE
export async function werbeCode(tid) {
  const { data: t } = await db.from('tenants').select('werbe_code').eq('id', tid).maybeSingle();
  if (t && t.werbe_code) return t.werbe_code;
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let v = 0; v < 5; v++) {
    let c = ''; for (let i = 0; i < 6; i++) c += ABC[Math.floor(Math.random() * ABC.length)];
    const { data } = await db.from('tenants').update({ werbe_code: c }).eq('id', tid).is('werbe_code', null).select('werbe_code');
    if (data && data.length) return c;
    const { data: t2 } = await db.from('tenants').select('werbe_code').eq('id', tid).maybeSingle();
    if (t2 && t2.werbe_code) return t2.werbe_code;
  }
  return null;
}

// Mails an Gäste tragen den Namen des Betriebs als Absender, für alle Betriebe gleich.
export async function absender(tid, name) {
  try {
    if (!tid && !name) return MAIL_FROM;
    if (!name) { const { data: t } = await db.from('tenants').select('name').eq('id', tid).maybeSingle(); name = t && t.name; }
    name = String(name || '').replace(/["<>@\r\n]/g, '').trim().slice(0, 60);
    const adr = (String(MAIL_FROM).match(/<([^>]+)>/) || [])[1] || MAIL_FROM;
    return name ? `"${name} über clickzauber" <${adr}>` : MAIL_FROM;
  } catch (e) { return MAIL_FROM; }
}

// Filter für die Rangliste: gebiet = region | DE | AT | CH | dach
export function rangFilter(q, gebiet, ich, branche) {
  const land = (ich && ich.land) || 'DE', region = String((ich && ich.plz) || '').slice(0, 2);
  if (gebiet === 'region' && region) q = q.eq('land', land).like('plz', region + '%');
  else if (gebiet === 'region') q = q.eq('land', land);
  else if (['DE', 'AT', 'CH'].includes(gebiet)) q = q.eq('land', gebiet);
  if (branche) q = q.eq('branche', branche);
  return q;
}
export async function platzVon(punkte, gebiet, ich, branche) {
  const [{ count: vor }, { count: gesamt }] = await Promise.all([
    rangFilter(db.from('vertrauen_rang').select('tenant_id', { count: 'exact', head: true }).gt('punkte', punkte), gebiet, ich, branche),
    rangFilter(db.from('vertrauen_rang').select('tenant_id', { count: 'exact', head: true }), gebiet, ich, branche)
  ]);
  return { platz: (vor || 0) + 1, gesamt: gesamt || 0 };
}
export const kroneAktiv = (v) => !!(v && v.krone_bis && String(v.krone_bis) >= heute());

/* ── Nachtlauf ─────────────────────────────────────────── */
const gebietVon = (x) => (x.land || 'DE') + '-' + String(x.plz || '').slice(0, 2);
function melden(tid, titel, text, url) {
  try { return pushSenden(tid, { titel, text, url: 'clickzauber-cockpit-live.html' + (url || '#rangliste'), tag: 'cz-rang' }).catch(() => {}); } catch (e) { return Promise.resolve(); }
}

// Plätze je PLZ-Gebiet neu setzen. Wer aufsteigt, bekommt eine Nachricht aufs Handy.
async function plaetzePflegen() {
  const rs = await alle(() => db.from('vertrauen_rang').select('tenant_id, punkte, name, land, plz, platz_region'), 20000);
  const gruppen = {}; rs.forEach((x) => { (gruppen[gebietVon(x)] = gruppen[gebietVon(x)] || []).push(x); });
  let n = 0;
  for (const [g, l] of Object.entries(gruppen)) {
    l.sort((a, b) => b.punkte - a.punkte);
    for (let i = 0; i < l.length; i++) {
      const x = l[i], platz = 1 + l.filter((y) => y.punkte > x.punkte).length;
      if (x.platz_region === platz) continue;
      if (x.platz_region && platz < x.platz_region && platz <= 100) {
        const ueberholt = l.slice(i + 1).find((y) => y.platz_region && y.platz_region < x.platz_region);
        const gebiet = String(x.plz || '').slice(0, 2);
        await melden(x.tenant_id, 'Aufgestiegen: Platz ' + platz,
          (ueberholt ? 'Sie haben ' + ueberholt.name + ' überholt. ' : '') + 'Jetzt Platz ' + platz + (gebiet ? ' im PLZ-Gebiet ' + gebiet : '') + '.');
        n++;
      }
      await db.from('vertrauen').update({ platz_region: platz }).eq('tenant_id', x.tenant_id);
    }
  }
  return n;
}

// Am 1. des Monats: wer im Vormonat im PLZ-Gebiet am meisten dazugewonnen hat, trägt die Krone bis Monatsende.
async function monatssieger() {
  const d = new Date(), berlin = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
  if (berlin.getDate() !== 1) return 0;
  const ende = new Date(Date.UTC(berlin.getFullYear(), berlin.getMonth() + 1, 0)).toISOString().slice(0, 10);
  const { count: schon } = await db.from('vertrauen').select('tenant_id', { count: 'exact', head: true }).eq('krone_bis', ende);
  if (schon) return 0;
  const rs = await alle(() => db.from('vertrauen_rang').select('tenant_id, punkte, punkte_monat_start, land, plz'), 20000);
  const beste = {};
  rs.forEach((x) => { const g = gebietVon(x), plus = x.punkte - (x.punkte_monat_start || 0); if (plus > 0 && (!beste[g] || plus > beste[g].plus)) beste[g] = { id: x.tenant_id, plus }; });
  let n = 0;
  for (const [g, b] of Object.entries(beste)) {
    const { data: v } = await db.from('vertrauen').select('kronen').eq('tenant_id', b.id).maybeSingle();
    await db.from('vertrauen').update({ krone_bis: ende, krone_region: g, kronen: ((v && v.kronen) || 0) + 1 }).eq('tenant_id', b.id);
    await melden(b.id, 'Monatssieger im PLZ-Gebiet ' + g.slice(3), 'Sie haben im letzten Monat am meisten Vertrauen gesammelt. Ihre Krone steht jetzt im Profil.');
    n++;
  }
  await db.rpc('cz_vertrauen_monatsstart');
  return n;
}

// Rabatt je Stufe und „Freunde werben“ bei Stripe. Nur, wenn die Zahlung eingeschaltet ist.
async function stripeAbgleich() {
  if (process.env.ZAHLUNG_AKTIV !== '1' || !process.env.STRIPE_SECRET_KEY) return { aus: true };
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const us = await alle(() => db.from('users').select('tenant_id, stripe_sub').not('stripe_sub', 'is', null).not('tenant_id', 'is', null), 10000);
  let n = 0;
  for (const u of us) {
    try {
      const { data: v } = await db.from('vertrauen').select('punkte, rabatt_prozent, werbe_rabatt_monate').eq('tenant_id', u.tenant_id).maybeSingle();
      if (!v) continue;
      const soll = rabattVon(stufeVon(v.punkte));
      if (soll !== (v.rabatt_prozent || 0)) {
        const coupon = soll ? await rabattCoupon(stripe, soll) : null;
        await stripe.subscriptions.update(u.stripe_sub, { discounts: coupon ? [{ coupon }] : [] });
        await db.from('vertrauen').update({ rabatt_prozent: soll }).eq('tenant_id', u.tenant_id);
        n++;
      }
      if (v.werbe_rabatt_monate > 0) {
        // Ein Monat 50 %: als Guthaben beim Kunden, wird mit der nächsten Rechnung verrechnet.
        const sub = await stripe.subscriptions.retrieve(u.stripe_sub);
        const it = sub.items && sub.items.data && sub.items.data[0], preis = it && it.price ? it.price.unit_amount : 0;
        const monat = it && it.price && it.price.recurring && it.price.recurring.interval === 'year' ? Math.round(preis / 12) : preis;
        if (monat > 0) {
          await stripe.customers.createBalanceTransaction(sub.customer, { amount: -Math.round(monat * 0.5), currency: 'eur', description: 'clickzauber: Freunde werben, 1 Monat 50 %' });
          await db.from('vertrauen').update({ werbe_rabatt_monate: v.werbe_rabatt_monate - 1 }).eq('tenant_id', u.tenant_id);
        }
      }
    } catch (e) { /* nächster Betrieb */ }
  }
  return { geaendert: n };
}
export async function rabattCoupon(stripe, pct) {
  const id = 'cz-vertrauen-' + pct;
  try { await stripe.coupons.retrieve(id); } catch (e) { await stripe.coupons.create({ id, percent_off: pct, duration: 'forever', name: 'Vertrauensabzeichen −' + pct + ' %' }); }
  return id;
}
// Für lib/checkout.js: Rabatt der aktuellen Stufe gleich beim Abschluss.
export async function checkoutRabatt(stripe, tid) {
  try {
    if (!tid) return null;
    const { data: v } = await db.from('vertrauen').select('punkte').eq('tenant_id', tid).maybeSingle();
    const pct = v ? rabattVon(stufeVon(v.punkte)) : 0;
    if (!pct) return null;
    const coupon = await rabattCoupon(stripe, pct);
    await db.from('vertrauen').update({ rabatt_prozent: pct }).eq('tenant_id', tid);
    return coupon;
  } catch (e) { return null; }
}

// Nachtlauf: alle Betriebe, vier gleichzeitig. Danach Plätze, Monatssieger, Stripe.
export async function alleAktualisieren() {
  const ts = await alle(() => db.from('tenants').select('id').order('created_at'), 10000);
  let n = 0, i = 0;
  async function arbeiter() { while (i < ts.length) { const t = ts[i++]; try { await aktualisieren(t.id, 0); n++; } catch (e) {} } }
  await Promise.all([arbeiter(), arbeiter(), arbeiter(), arbeiter()]);
  const sieger = await monatssieger().catch(() => 0);
  const aufstiege = await plaetzePflegen().catch(() => 0);
  const stripe = await stripeAbgleich().catch(() => ({ fehler: true }));
  return { betriebe: n, sieger, aufstiege, stripe };
}
