// Plattform-Übersicht für den Betreiber (clickzauber-plattform.html). Schlüssel = ADMIN_TOKEN.
// GET  ?key                                       → Zahlen, Verlauf, Meldungen, Blockiertes, Anmeldungen, Aktivität
// POST { key, aktion:'erledigt', id, notiz }      → Meldung abschließen
// POST { key, aktion:'gesehen', id }              → blockierten Inhalt als gesehen markieren
// POST { key, aktion:'bild_weg', tenant, bild, grund }   → Bild entfernen (bild = Bild-ID, 'titel' oder 'person')
// POST { key, aktion:'sperren', tenant, grund }   → Netzwerk-Teilnahme sperren, Profil ausblenden
// POST { key, aktion:'freigeben', tenant }        → Sperre aufheben
// POST { key, aktion:'rundmail', gruppe, branche, betreff, text, test, nur_zaehlen } → E-Mail an eine Kundengruppe
// Nachrichten zwischen Betrieben liest der Betreiber nicht mit. Sichtbar sind nur Zahlen sowie Texte,
// die automatisch blockiert oder gemeldet wurden.
import { db, cors, body, MAIL_KEY, MAIL_FROM } from './_lib.js';

const tag = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const vor = (t) => new Date(Date.now() - t * 864e5).toISOString();

async function inhaberMail(tenant) {
  const { data } = await db.from('users').select('email').eq('tenant_id', tenant).order('created_at').limit(1);
  return data && data[0] && data[0].email;
}
async function benachrichtigen(tenant, betreff, zeilen) {
  const an = await inhaberMail(tenant);
  if (!MAIL_KEY || !an) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [an], subject: betreff,
        html: zeilen.map((z) => '<p style="font:15px/1.5 system-ui,sans-serif;color:#27241d">' + String(z).replace(/</g, '&lt;') + '</p>').join('') })
    });
  } catch (e) {}
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const p = req.method === 'POST' ? body(req) : (req.query || {});
  if (!process.env.ADMIN_TOKEN || (p.key || '') !== process.env.ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'kein Zugriff' });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET' && p.q != null) {
    const q = String(p.q || '').trim().replace(/[%,()*]/g, ' ').slice(0, 80);
    if (q.length < 2) return res.status(200).json({ ok: true, kunden: [] });
    const wort = '%' + q + '%';
    // select('*'): fehlt eine neuere Spalte (z. B. weil sql/39 noch nicht lief), findet die Suche trotzdem alles.
    const { data: us, error: fe } = await db.from('users').select('*')
      .or(['email', 'vorname', 'nachname', 'firma', 'telefon'].map((f) => f + '.ilike."' + wort + '"').join(',')).order('created_at', { ascending: false }).limit(25);
    if (fe) return res.status(200).json({ ok: false, error: 'Suche fehlgeschlagen: ' + fe.message });
    const tids = [...new Set((us || []).map((u) => u.tenant_id).filter(Boolean))];
    const [{ data: ws }, { data: np }, { data: tn }] = tids.length ? await Promise.all([
      db.from('widgets').select('slug, name, status, tenant_id').in('tenant_id', tids),
      db.from('netz_profil').select('tenant_id, name, gesperrt, sichtbar, personbild, titelbild').in('tenant_id', tids),
      db.from('tenants').select('id, name').in('id', tids)
    ]) : [{ data: [] }, { data: [] }, { data: [] }];
    const seit = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data: ld } = tids.length ? await db.from('leads').select('tenant_id').in('tenant_id', tids).gte('ts', seit).limit(5000) : { data: [] };
    const an = {}; (ld || []).forEach((x) => { an[x.tenant_id] = (an[x.tenant_id] || 0) + 1; });
    return res.status(200).json({ ok: true, kunden: (us || []).map((u) => {
      const pr = (np || []).find((x) => x.tenant_id === u.tenant_id);
      const t = (tn || []).find((x) => x.id === u.tenant_id);
      return { email: u.email, name: [u.vorname, u.nachname].filter(Boolean).join(' ') || null, firma: u.firma || (t && t.name) || null, telefon: u.telefon || null,
        plan: u.plan || null, cycle: u.cycle || null, status: u.plan_status || 'inaktiv', abo: !!u.stripe_sub, bestaetigt: !!u.verified, am: u.created_at, kostenlos_bis: u.kostenlos_bis || null, pilot_seit: u.pilot_seit || null,
        widget_gesperrt: !!u.gesperrt_am && !u.komplett_gesperrt, komplett: !!u.komplett_gesperrt, grund: u.gesperrt_grund || null, notiz: u.admin_notiz || null,
        netz: pr ? { name: pr.name, gesperrt: !!pr.gesperrt, sichtbar: pr.sichtbar !== false, bild: pr.personbild || pr.titelbild || null } : null,
        anfragen_30: an[u.tenant_id] || 0, widgets: (ws || []).filter((w) => w.tenant_id === u.tenant_id).map((w) => ({ slug: w.slug, name: w.name, status: w.status })) };
    }) });
  }

  if (req.method === 'GET') {
    const c = (q) => q.then((r) => r.count || 0);
    const [kontenGes, neu1, neu7, neu30, zahlend, gesperrtK, wLive, anfr7, profile, profGesp, nachr7, verb7, likes7, meldOffen, block7, dringend] = await Promise.all([
      c(db.from('users').select('id', { count: 'exact', head: true })),
      c(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', vor(1))),
      c(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
      c(db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', vor(30))),
      c(db.from('users').select('id', { count: 'exact', head: true }).eq('plan_status', 'aktiv')),
      c(db.from('users').select('id', { count: 'exact', head: true }).not('gesperrt_am', 'is', null)),
      c(db.from('widgets').select('slug', { count: 'exact', head: true }).eq('status', 'live')),
      c(db.from('leads').select('id', { count: 'exact', head: true }).gte('ts', vor(7))),
      c(db.from('netz_profil').select('tenant_id', { count: 'exact', head: true })),
      c(db.from('netz_profil').select('tenant_id', { count: 'exact', head: true }).eq('gesperrt', true)),
      c(db.from('netz_nachricht').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
      c(db.from('netz_verbindung').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
      c(db.from('netz_like').select('von', { count: 'exact', head: true }).gte('created_at', vor(7))),
      c(db.from('netz_meldung').select('id', { count: 'exact', head: true }).eq('status', 'offen')),
      c(db.from('netz_moderation').select('id', { count: 'exact', head: true }).gte('created_at', vor(7))),
      c(db.from('netz_moderation').select('id', { count: 'exact', head: true }).eq('status', 'dringend'))
    ]);
    const ADMIN_WAS = ['konto_gesperrt', 'konto_komplett_gesperrt', 'konto_entsperrt', 'netz_gesperrt', 'netz_frei', 'mail_vom_betreiber', 'tarif_von_hand', 'konto_uebergeben', 'konto_geloescht', 'kostenlos_bis', 'kostenlos_aufgehoben', 'pilot_vergeben', 'pilot_entzogen', 'mahnung', 'auto_gesperrt', 'zahlung_wieder_da', 'rundmail', 'bild_entfernt', 'profil_gesperrt', 'profil_frei', 'meldung_erledigt', 'alle_neu_laden', 'funktionen_geaendert', 'cockpit_neu_laden', 'einrichtung_gebucht'];
    const { data: prot } = await db.from('protokoll').select('tenant_id, was, wer, anzahl, hinweis, created_at').in('was', ADMIN_WAS).order('created_at', { ascending: false }).limit(80);
    const [{ data: us30 }, { data: meld }, { data: mod }, { data: neue }, { data: profs }, { data: verb }] = await Promise.all([
      db.from('users').select('created_at').gte('created_at', vor(30)).limit(5000),
      db.from('netz_meldung').select('*').order('created_at', { ascending: false }).limit(80),
      db.from('netz_moderation').select('*').order('created_at', { ascending: false }).limit(80),
      db.from('users').select('email, vorname, nachname, firma, plan, plan_status, verified, created_at, tenant_id, gesperrt_am').order('created_at', { ascending: false }).limit(40),
      db.from('netz_profil').select('tenant_id, name, branche, ort, titelbild, personbild, bilder, gesperrt, gesperrt_grund, sichtbar, updated_at').order('updated_at', { ascending: false }).limit(60),
      db.from('netz_verbindung').select('von, an, status, created_at').order('created_at', { ascending: false }).limit(30)
    ]);
    const verlauf = {};
    for (let i = 29; i >= 0; i--) verlauf[tag(Date.now() - i * 864e5)] = 0;
    (us30 || []).forEach((u) => { const t = tag(u.created_at); if (t in verlauf) verlauf[t]++; });

    const ids = new Set();
    (meld || []).forEach((m) => { ids.add(m.von); ids.add(m.ziel); });
    (mod || []).forEach((m) => ids.add(m.tenant_id));
    (verb || []).forEach((v) => { ids.add(v.von); ids.add(v.an); });
    (prot || []).forEach((x) => ids.add(x.tenant_id));
    const idl = [...ids].filter(Boolean);
    const [{ data: np }, { data: tn }] = idl.length ? await Promise.all([
      db.from('netz_profil').select('tenant_id, name, titelbild, personbild, bilder, gesperrt').in('tenant_id', idl),
      db.from('tenants').select('id, name').in('id', idl)
    ]) : [{ data: [] }, { data: [] }];
    const P = {};
    (tn || []).forEach((t) => { P[t.id] = { id: t.id, name: t.name }; });
    (np || []).forEach((x) => { P[x.tenant_id] = Object.assign(P[x.tenant_id] || { id: x.tenant_id }, { name: x.name || (P[x.tenant_id] || {}).name, bild: x.personbild || x.titelbild || null, gesperrt: !!x.gesperrt, bilder: x.bilder || [] }); });
    const wer = (id) => (P[id] ? { id, name: P[id].name || 'Ohne Namen', bild: P[id].bild || null, gesperrt: !!P[id].gesperrt } : { id, name: 'Unbekannt' });

    const bilder = [];
    (profs || []).forEach((x) => (x.bilder || []).forEach((b) => bilder.push({ tenant: x.tenant_id, name: x.name, id: b.id, url: b.url, text: b.text || '', am: b.am })));
    bilder.sort((a, b) => String(b.am).localeCompare(String(a.am)));

    return res.status(200).json({
      ok: true,
      zahlen: { konten: kontenGes, neu_heute: neu1, neu_7: neu7, neu_30: neu30, zahlend, gesperrt_konten: gesperrtK, widgets_live: wLive, anfragen_7: anfr7,
        profile, profile_gesperrt: profGesp, nachrichten_7: nachr7, verbindungen_7: verb7, likes_7: likes7, meldungen_offen: meldOffen, blockiert_7: block7, dringend },
      verlauf: Object.entries(verlauf).map(([t, n]) => ({ tag: t, n })),
      meldungen: (meld || []).map((m) => {
        const z = P[m.ziel] || {}; let bild = null;
        if (m.bild) { const b = (z.bilder || []).find((x) => x.id === m.bild); bild = b ? { id: b.id, url: b.url } : { id: m.bild, url: null }; }
        return { id: m.id, von: wer(m.von), ziel: wer(m.ziel), grund: m.grund, bild, art: m.art || (m.bild ? 'bild' : 'profil'), auszug: m.auszug || null, status: m.status || (m.erledigt_at ? 'erledigt' : 'offen'), notiz: m.notiz || null, am: m.created_at, erledigt_am: m.erledigt_at };
      }),
      blockiert: (mod || []).map((m) => ({ id: m.id, wer: wer(m.tenant_id), art: m.art, grund: m.grund, auszug: m.auszug, schwer: !!m.schwer, status: m.status, am: m.created_at })),
      anmeldungen: (neue || []).map((u) => ({ email: u.email, name: [u.vorname, u.nachname].filter(Boolean).join(' ') || null, firma: u.firma || null, plan: u.plan || null, status: u.plan_status || 'inaktiv', bestaetigt: !!u.verified, gesperrt: !!u.gesperrt_am, am: u.created_at })),
      profile: (profs || []).map((x) => ({ id: x.tenant_id, name: x.name, branche: x.branche, ort: x.ort, bild: x.personbild || x.titelbild || null, bilder: (x.bilder || []).length, gesperrt: !!x.gesperrt, grund: x.gesperrt_grund || null, sichtbar: x.sichtbar !== false, am: x.updated_at })),
      bilder: bilder.slice(0, 36),
      protokoll: (prot || []).map((x) => ({ was: x.was, wer: x.wer || null, hinweis: x.hinweis || null, anzahl: x.anzahl, am: x.created_at, betrieb: x.tenant_id ? wer(x.tenant_id) : null })),
      verbindungen: (verb || []).map((v) => ({ von: wer(v.von), an: wer(v.an), status: v.status, am: v.created_at }))
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const a = p.aktion, jetzt = new Date().toISOString();
  const grund = String(p.grund || '').trim().slice(0, 400);
  const log = (tenant, was, hinweis, anzahl) => db.from('protokoll').insert({ tenant_id: tenant || null, was, wer: 'Betreiber', anzahl: anzahl || 1, hinweis: hinweis || null }).then(() => {}, () => {});

  if (a === 'erledigt') {
    await db.from('netz_meldung').update({ status: 'erledigt', erledigt_at: jetzt, notiz: String(p.notiz || '').slice(0, 400) || null }).eq('id', p.id);
    await log(null, 'meldung_erledigt', p.notiz || 'Kein Verstoß');
    return res.status(200).json({ ok: true });
  }
  if (a === 'gesehen') {
    await db.from('netz_moderation').update({ status: 'gesehen' }).eq('id', p.id);
    return res.status(200).json({ ok: true });
  }
  if (a === 'bild_weg') {
    const { data: pr } = await db.from('netz_profil').select('*').eq('tenant_id', p.tenant).maybeSingle();
    if (!pr) return res.status(404).json({ ok: false });
    const weg = (url) => { const m = String(url || '').match(/\/object\/public\/netz\/(.+)$/); return m ? db.storage.from('netz').remove([m[1]]).catch(() => {}) : null; };
    const upd = { updated_at: jetzt };
    if (p.bild === 'titel') { await weg(pr.titelbild); upd.titelbild = null; }
    else if (p.bild === 'person') { await weg(pr.personbild); upd.personbild = null; }
    else { const b = (pr.bilder || []).find((x) => x.id === p.bild); if (b) await weg(b.url); upd.bilder = (pr.bilder || []).filter((x) => x.id !== p.bild); }
    await db.from('netz_profil').update(upd).eq('tenant_id', p.tenant);
    await log(p.tenant, 'bild_entfernt', grund);
    await benachrichtigen(p.tenant, 'Ein Bild in Ihrem Profil wurde entfernt', ['Guten Tag,', 'wir haben ein Bild aus Ihrem Profil im Bereich „Vernetzen“ entfernt.', 'Grund: ' + (grund || 'Verstoß gegen § 1j Abs. 4 der AGB.'), 'Wenn Sie das für falsch halten, antworten Sie einfach auf diese E-Mail. Wir prüfen es erneut.', 'Ihr clickzauber-Team']);
    return res.status(200).json({ ok: true });
  }
  if (a === 'sperren') {
    await db.from('netz_profil').update({ gesperrt: true, sichtbar: false, gesperrt_grund: grund || 'Verstoß gegen die Regeln im Netzwerk' }).eq('tenant_id', p.tenant);
    await Promise.all([
      db.from('netz_partner').delete().or('tenant_id.eq.' + p.tenant + ',partner_id.eq.' + p.tenant),
      db.from('netz_paket').update({ aktiv: false }).eq('tenant_id', p.tenant)
    ]).catch(() => {});
    await log(p.tenant, 'profil_gesperrt', grund);
    await benachrichtigen(p.tenant, 'Ihre Teilnahme am Netzwerk ist gesperrt', ['Guten Tag,', 'wir haben Ihre Teilnahme am Bereich „Vernetzen“ gesperrt. Ihr Profil ist für andere nicht mehr sichtbar. Ihr Formular und Ihr Cockpit funktionieren weiter.', 'Grund: ' + (grund || 'Verstoß gegen § 1j Abs. 4 der AGB.'), 'Wenn Sie widersprechen möchten, antworten Sie einfach auf diese E-Mail. Wir prüfen die Entscheidung erneut.', 'Ihr clickzauber-Team']);
    return res.status(200).json({ ok: true });
  }
  if (a === 'freigeben') {
    await db.from('netz_profil').update({ gesperrt: false, gesperrt_grund: null }).eq('tenant_id', p.tenant);
    await log(p.tenant, 'profil_frei');
    await benachrichtigen(p.tenant, 'Ihre Teilnahme am Netzwerk ist wieder freigeschaltet', ['Guten Tag,', 'die Sperre im Bereich „Vernetzen“ ist aufgehoben. Sie können Ihr Profil in den Einstellungen wieder sichtbar schalten.', 'Ihr clickzauber-Team']);
    return res.status(200).json({ ok: true });
  }
  if (a === 'rundmail') {
    const gruppe = String(p.gruppe || 'alle');
    let q = db.from('users').select('email, vorname, tenant_id').eq('komplett_gesperrt', false).not('email', 'is', null).limit(5000);
    if (gruppe === 'zahlend') q = q.eq('plan_status', 'aktiv');
    else if (gruppe === 'ohne_abo') q = q.neq('plan_status', 'aktiv');
    else if (gruppe === 'zahlung_offen') q = q.eq('plan_status', 'zahlung offen');
    let { data: us } = await q;
    us = us || [];
    if (gruppe === 'branche') {
      const { data: np } = await db.from('netz_profil').select('tenant_id').eq('branche', String(p.branche || ''));
      const t = new Set((np || []).map((x) => x.tenant_id));
      us = us.filter((u) => t.has(u.tenant_id));
    }
    const an = [...new Map(us.map((u) => [String(u.email).toLowerCase(), u])).values()];
    if (p.nur_zaehlen) return res.status(200).json({ ok: true, anzahl: an.length });
    const betreff = String(p.betreff || '').trim().slice(0, 150), text = String(p.text || '').trim().slice(0, 8000);
    if (!betreff || !text) return res.status(400).json({ ok: false, error: 'Betreff und Text fehlen.' });
    if (!MAIL_KEY) return res.status(500).json({ ok: false, error: 'Kein Mail-Schlüssel in Vercel.' });
    const html = (vn) => '<div style="font:15px/1.55 system-ui,sans-serif;color:#27241d;max-width:560px">'
      + text.replace(/\{vorname\}/g, vn || '').split(/\n{2,}/).map((x) => '<p style="margin:0 0 14px">' + x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>').join('')
      + '<p style="margin:24px 0 0;color:#7a7263;font-size:12.5px">Sie erhalten diese Nachricht als Kunde von clickzauber. Fragen? Antworten Sie einfach auf diese E-Mail.</p></div>';
    const ziel = p.test ? [{ email: process.env.NOTIFY_TO || process.env.MAIL_TO || 'projekt@clickzauber.de', vorname: 'Manuel' }] : an;
    let ok = 0;
    for (let i = 0; i < ziel.length; i += 100) {
      const teil = ziel.slice(i, i + 100).map((u) => ({ from: MAIL_FROM, to: [u.email], reply_to: 'projekt@clickzauber.de', subject: (p.test ? '[Test] ' : '') + betreff, html: html(u.vorname) }));
      const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: 'Bearer ' + MAIL_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(teil) }).catch(() => null);
      if (r && r.ok) ok += teil.length;
    }
    if (!p.test) await log(null, 'rundmail', betreff + ' · Gruppe: ' + gruppe + (gruppe === 'branche' ? ' (' + p.branche + ')' : ''), ok);
    return res.status(200).json({ ok: ok > 0, gesendet: ok, von: ziel.length });
  }
  return res.status(400).json({ ok: false, error: 'unbekannt' });
}
