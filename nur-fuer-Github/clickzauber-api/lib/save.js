// POST /api/save  — Formular-Version aus dem Konfigurator speichern und veröffentlichen.
// Zugang über den Anmelde-Token des Nutzers (Selbstbedienung). ADMIN_TOKEN wirkt weiter
// als Generalschlüssel für eigene Eingriffe.
import { db, cors, body, userByToken } from './_lib.js';
import { PLANS, STUFEN, istPilot, istBetreiber, stufeVon, stufeVomKonto, formularGrenze, kostenlos } from './_plans.js';
import { ausKonfigurator, personalAbgleich, zeitenAbgleich } from './_termine.js';
import { appFreischalten } from './_app-freischalten.js';
import { einladungLive } from './einladung.js';
import { pflichtOffen } from './einstellungen.js';

export default async function handler(req, res) {
  cors(res, req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const p = body(req);
  if (!p.token) return res.status(403).json({ ok: false, error: 'kein zugriff' });

  const istAdmin = process.env.ADMIN_TOKEN && p.token === process.env.ADMIN_TOKEN;
  const user = istAdmin ? null : await userByToken(p.token);
  if (!istAdmin && !user) return res.status(403).json({ ok: false, error: 'kein zugriff' });
  // Online-Test vor dem Verschicken (seit 10.10.2026, Plattform → Kundenakte, lib/konto-admin.js online_test): Manuel testet ein vorgebautes
  // Konto online. Bis der Kunde die Einladung einlöst, gilt es ohne E-Mail-Bestätigung und ohne Tarif. Speichern bleibt möglich, das Formular bleibt live.
  const sch = user && user.schritte && typeof user.schritte === 'object' && !Array.isArray(user.schritte) ? user.schritte : {};
  const onlineTest = !!(user && user.einladung_code && !user.eingeloest_am && sch.online_test);

  // ── Live schalten (Knopf im Cockpit) ──────────────────────────────────
  // Gespeichert ist noch nicht live: Ein neues Formular liegt erst als Entwurf hier. Live geht es
  // erst, wenn alles da ist: bestätigte E-Mail, Angaben, Datenschutz-Link, Tarif oder Pilotplatz.
  // Solange die Zahlung aus ist (lib/_plans.js kostenlos), entfällt der Tarif für alle.
  // Die Antwort sagt, was fehlt; das Cockpit führt dann genau dorthin.
  // Aus der App (js/cz-native.js): Konto ohne Tarif sieht die Tarif-Seite. Mail mit dem Weg zum Tarif, Meldung an den Betreiber.
  if (p.aktion === 'app_freischalten') {
    if (!user) return res.status(403).json({ ok: false, error: 'kein zugriff' });
    if (istBetreiber(user) || kostenlos(user) || istPilot(user) || ['aktiv', 'gekündigt'].includes(user.plan_status)) return res.status(200).json({ ok: true, noetig: false });
    const r = await appFreischalten(user, await stufeVomKonto(db, user.tenant_id)).catch(() => ({}));
    return res.status(200).json({ ok: true, noetig: true, gesendet: !!(r && r.gesendet) });
  }

  if (p.aktion === 'live') {
    if (!user) return res.status(403).json({ ok: false, error: 'kein zugriff' });
    const tid = user.tenant_id;
    const { data: ws } = tid
      ? await db.from('widgets').select('slug, status').eq('tenant_id', tid).neq('status', 'papierkorb').order('created_at', { ascending: true })
      : { data: [] };
    if (!ws || !ws.length) return res.status(400).json({ ok: false, error: 'kein-formular', hinweis: 'Bauen und speichern Sie zuerst Ihr Formular.' });
    const chef = istBetreiber(user);
    if (!chef && !user.verified && !onlineTest) {
      return res.status(403).json({ ok: false, error: 'nicht-bestaetigt',
        hinweis: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Den Link haben wir Ihnen geschickt. Dorthin gehen später auch Ihre Anfragen.' });
    }
    if (!chef && !(user.vorname && user.nachname && user.firma && user.telefon)) return res.status(400).json({ ok: false, error: 'profil-fehlt' });
    const { data: ein } = await db.from('einstellungen').select('datenschutz_url').eq('tenant_id', tid).maybeSingle();
    if (!(ein && ein.datenschutz_url)) return res.status(400).json({ ok: false, error: 'datenschutz-fehlt' });
    // Startklar (seit 15.10.2026 auch hier, nicht nur im Cockpit): Benachrichtigung, Datenschutz, AV-Vertrag, Löschfrist bestätigt.
    // Vor dem Tarif, damit niemand bezahlt und dann doch nicht live gehen kann.
    if (!chef && !onlineTest) {
      let offen;
      try { offen = await pflichtOffen(tid, user); }
      catch (e) { return res.status(500).json({ ok: false, error: 'pflicht-unbekannt', hinweis: 'Ihre Einstellungen ließen sich gerade nicht prüfen. Bitte gleich noch einmal versuchen.' }); }
      if (offen.length) return res.status(400).json({ ok: false, error: 'pflicht-offen', offen });
    }
    if (!chef && !onlineTest && !kostenlos(user) && !istPilot(user) && !['aktiv', 'gekündigt'].includes(user.plan_status)) {
      const stufeT = await stufeVomKonto(db, tid);
      // In der App wird nicht bezahlt: Mail mit dem Weg zum Tarif, Meldung an den Betreiber (lib/_app-freischalten.js)
      if (p.app) await appFreischalten(user, stufeT).catch(() => null);
      return res.status(402).json({ ok: false, error: 'tarif-fehlt', stufe: stufeT, app: !!p.app });
    }
    await db.from('widgets').update({ status: 'live', updated_at: new Date().toISOString() }).eq('tenant_id', tid).neq('status', 'live').neq('status', 'papierkorb');
    // Vorgebautes Konto (sql/67, 68): Schritt in der Checkliste der Plattform, Mitteilung an Manuel.
    if (user.einladung_code && !onlineTest) await einladungLive(user).catch(() => null);
    return res.status(200).json({ ok: true, live: true, widget: ws[0].slug });
  }

  // Nur-Token = Zugangsprüfung aus dem Konfigurator (bewusst 400, nicht 403).
  if (!p.widget || !p.config) return res.status(400).json({ ok: false, error: 'widget/config fehlt' });

  const slug = String(p.widget).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (!slug) return res.status(400).json({ ok: false, error: 'ungültige widget-kennung' });

  // Entwurf oder live? Ein neues Formular ist ein Entwurf, bis es im Cockpit live geschaltet wird.
  // Ein Entwurf braucht weder bestätigte E-Mail noch Datenschutz-Link; ausgeliefert wird er nicht (lib/config.js).
  const { data: alt } = await db.from('widgets').select('status').eq('slug', slug).maybeSingle();
  // Papierkorb (sql/74): erst zurückholen, dann speichern. Sonst entstünde eine neue Fassung an einem Formular, das niemand sieht.
  if (alt && alt.status === 'papierkorb') return res.status(409).json({ ok: false, error: 'papierkorb', hinweis: 'Dieses Formular liegt im Papierkorb. Bitte zuerst im Cockpit unter „Mein Formular“ zurückholen, dann lässt es sich wieder speichern.' });
  const wirdLive = !!istAdmin || p.live === true || !!(alt && alt.status !== 'entwurf');

  // Bei allem, was live ist, wird die bestätigte Adresse verlangt. Anfragen gehen an diese
  // Adresse; ist sie falsch, gehen sie ins Leere.
  if (user && !user.verified && wirdLive && !onlineTest) {
    return res.status(403).json({
      ok: false, nicht_bestaetigt: true,
      error: 'nicht-bestaetigt',
      hinweis: 'Bevor Ihr Formular live geht, bestätigen Sie bitte Ihre E-Mail-Adresse. '
        + 'Wir haben Ihnen den Link geschickt — dorthin gehen später auch Ihre Anfragen.'
    });
  }

  // ── Name des Betriebs ─────────────────────────────────────────────────
  // Er kommt aus dem Konfigurator und steht in den Mails an die Gäste („Ihre Anfrage bei …“).
  // Eine E-Mail-Adresse oder ein Platzhalter ist kein Name. Dieselbe Regel gilt in der
  // Datenbank (sql/23, tenants_name_echt): Ein Name mit „@“ lässt sich gar nicht speichern.
  const TABU = /^(dein|ihr|mein)[\s_-]*(betriebs?name|firmenname|name)|^betriebsname$|^firmenname$|^name des betriebs$|^ihr betriebsname$|^platzhalter$|^test$|^xxx+$|^tbd$|^todo$/i;
  const echt = (v) => {
    const t = String(v || '').trim();
    return t.length >= 2 && !t.includes('@') && !TABU.test(t) ? t.slice(0, 80) : null;
  };
  const betriebsname = echt(p.betrieb || (p.config && p.config.betrieb));
  const NAME_FEHLT = { ok: false, feld: 'betrieb', error: 'betrieb-fehlt', hinweis: 'Bitte tragen Sie den Namen Ihres Betriebs ein. Er steht in der Bestätigung an Ihre Gäste.' };

  // ── Mandant bestimmen ─────────────────────────────────────────────────
  let tenantId = user ? user.tenant_id : null;
  if (user && !tenantId) {
    // Erst nachsehen, ob dieses Konto schon einen Betrieb hat. Sonst entstünde bei jedem
    // Speichern ohne verknüpftes Konto ein weiterer Betrieb.
    const { data: vorhandenT } = await db
      .from('tenants')
      .select('id')
      .eq('email', user.email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (vorhandenT) {
      tenantId = vorhandenT.id;
    } else {
      // Seit 02.10.2026 hat ein neues Konto beim ersten Speichern noch keine Firma: Die Angaben
      // kommen erst beim Live-Schalten. Früher stand hier `user.firma || user.email` — die
      // E-Mail-Adresse scheitert an sql/23, und das Speichern brach ab.
      const tname = betriebsname || echt(user.firma);
      if (!tname) return res.status(400).json(NAME_FEHLT);
      const { data: t, error: te } = await db
        .from('tenants')
        .insert({ name: tname, email: user.email })
        .select('id')
        .single();
      if (te) return res.status(500).json({ ok: false, error: 'mandant anlegen fehlgeschlagen', hinweis: te.message });
      tenantId = t.id;
    }
    await db.from('users').update({ tenant_id: tenantId }).eq('id', user.id);
  }

  // Firma fehlt im Konto: den Betriebsnamen übernehmen. Dann ist sie beim Live-Schalten schon ausgefüllt.
  if (user && betriebsname && !echt(user.firma)) {
    await db.from('users').update({ firma: betriebsname }).eq('id', user.id).then(() => {}, () => {});
    user.firma = betriebsname;
  }

  if (tenantId) {
    if (betriebsname) {
      await db.from('tenants').update({ name: betriebsname }).eq('id', tenantId);
    } else {
      // Kein gültiger Name mitgeschickt: dann muss in der Datenbank schon einer stehen.
      const { data: t } = await db.from('tenants').select('name').eq('id', tenantId).maybeSingle();
      if (!echt(t && t.name)) return res.status(400).json(NAME_FEHLT);
    }
  }

  // ── Datenschutzerklärung ─────────────────────────────────────────────
  // Der Link steht im Formular unter dem Absenden-Knopf (Art. 13 DSGVO). Ohne ihn geht nichts live.
  // Der Konfigurator fragt ihn beim ersten Live-Schalten ab und schickt ihn hier mit.
  if (user && tenantId) {
    /* „clickzauber“: Betrieb ohne eigene Website nutzt die Datenschutzerklärung, die clickzauber für ihn bereitstellt. */
    const ds = String(p.datenschutz_url || '').trim() === 'clickzauber' ? 'https://clickzauber.de/datenschutz-betrieb.html?b=' + encodeURIComponent(tenantId) : String(p.datenschutz_url || '').trim();
    if (ds) {
      if (!/^https:\/\/[^\/\s]+\.[^\/\s]{2,}/i.test(ds)) {
        return res.status(400).json({ ok: false, feld: 'datenschutz', error: 'datenschutz-ungueltig',
          hinweis: 'Die Adresse muss mit https:// beginnen, zum Beispiel https://ihre-seite.de/datenschutz.' });
      }
      await db.from('einstellungen').upsert({ tenant_id: tenantId, datenschutz_url: ds.slice(0, 300), updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' });
    } else if (wirdLive) {
      const { data: e, error: ee } = await db.from('einstellungen').select('datenschutz_url').eq('tenant_id', tenantId).maybeSingle();
      if (!ee && !(e && e.datenschutz_url)) return res.status(400).json({ ok: false, feld: 'datenschutz', error: 'datenschutz-fehlt' });
    }
  }

  // ── Preisstufe ────────────────────────────────────────────────────────
  // Der Preis hängt an der Vorlage. Wer schon zahlt, rutscht nicht still in die andere Stufe:
  // Speichern bricht mit einem Hinweis ab, die Umstellung macht der Betreiber von Hand.
  if (user && STUFEN.includes(user.plan) && ['aktiv', 'gekündigt'].includes(user.plan_status) && !istBetreiber(user)) {
    const neu = stufeVon(p.config && p.config.zielgruppe);
    if (neu !== user.plan) {
      return res.status(402).json({
        ok: false, error: 'stufe-wechsel', stufe: neu,
        hinweis: `Diese Vorlage gehört zum Preis „${PLANS[neu].name}“ mit ${PLANS[neu].monthly} € im Monat. Ihr Abo läuft über „${PLANS[user.plan].name}“. Schreiben Sie mir kurz an projekt@clickzauber.de, dann stelle ich Ihr Abo um.`
      });
    }
  }

  // ── Formular suchen oder anlegen ────────────────────────────────────────
  const { data: vorhanden } = await db
    .from('widgets')
    .select('id, tenant_id, status')
    .eq('slug', slug)
    .maybeSingle();

  let erstesMal = false;

  if (vorhanden) {
    // Fremde Formulare nie überschreiben.
    if (!istAdmin && vorhanden.tenant_id !== tenantId) {
      return res.status(409).json({ ok: false, error: 'kennung belegt' });
    }
  } else {
    erstesMal = true;

    // Ein Konto, ein Formular. Eine andere Vorlage ersetzt das bestehende (gleiche Kennung,
    // Einbau-Code und Link bleiben). Mehr nur für Betreiber und alte Abos (lib/_plans.js).
    if (user) {
      const grenze = formularGrenze(user);
      if (grenze > 0) {
        const { count } = await db
          .from('widgets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .neq('status', 'papierkorb');
        if ((count || 0) >= grenze) {
          return res.status(402).json({
            ok: false,
            error: 'tarif-grenze',
            grenze,
            hinweis: grenze === 1 ? 'Zu jedem Konto gehört ein Formular.' : `Ihr Tarif erlaubt ${grenze} Formulare.`
          });
        }
      }
    }

    const { error: we } = await db.from('widgets').insert({
      slug,
      tenant_id: tenantId,
      name: p.name || p.config.name || slug,
      branche: p.branche || (p.config && p.config.zielgruppe) || null,
      domain: p.domain || null,   // ohne Bindung läuft es überall
      status: wirdLive ? 'live' : 'entwurf'
    });
    if (we) return res.status(500).json({ ok: false, error: we.message });
  }

  // ── Nächste Version ermitteln ─────────────────────────────────────────
  const { data: letzte } = await db
    .from('widget_versions')
    .select('version, config_json')
    .eq('widget_id', slug)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const naechste = ((letzte && letzte.version) || 0) + 1;
  const cfg = { ...p.config, version: naechste };
  const veroeffentlicht = new Date().toISOString();

  const { error } = await db.from('widget_versions').insert({
    widget_id: slug,
    version: naechste,
    config_json: cfg,
    published_at: veroeffentlicht
  });
  if (error) return res.status(500).json({ ok: false, error: error.message });

  await db.from('widgets').update({ updated_at: veroeffentlicht }).eq('slug', slug);

  /* Termin-Formular: beim ersten Mal Mitarbeiter und Leistungen anlegen. Danach übernimmt
     personalAbgleich geänderte Namen aus dem Konfigurator; zeitenAbgleich (seit 13.10.2026) Öffnungstage
     und Uhrzeiten für alle Mitarbeiter. Einzelne Abweichungen pflegt das Cockpit (Kalender → Uhrzeit-Termine). */
  const hatTermin = Array.isArray(p.config && p.config.steps) && p.config.steps.some((x) => x && x.typ === 'termin');
  if (tenantId && hatTermin && p.config.termin) {
    try { await ausKonfigurator(tenantId, p.config.termin, false); } catch (e) { /* ohne sql/28 einfach überspringen */ }
    try { await personalAbgleich(tenantId, letzte && letzte.config_json && letzte.config_json.termin, p.config.termin); } catch (e) { console.error('personalAbgleich', e && e.message); }
    try { await zeitenAbgleich(tenantId, letzte && letzte.config_json && letzte.config_json.termin, p.config.termin); } catch (e) { console.error('zeitenAbgleich', e && e.message); }
  }

  res.status(200).json({
    ok: true,
    version: naechste,
    widget: slug,
    since: veroeffentlicht,
    first: erstesMal,
    status: wirdLive ? 'live' : 'entwurf'
  });
}
