/*
 * clickzauber — Hochzeits-Planer · gemeinsamer Core (Web Component)
 * <wedding-planner data-location="gutseerose" data-api-url="…" data-tenant="…"></wedding-planner>
 *
 * Core übernimmt: Rendering, Formular-/Wizard-Logik, Keyword-Erkennung, Preisberechnung,
 * Begründungstexte, Kalender-UI, Lead-Versand (gleiches Sicherheits-/DSGVO-Schema wie
 * klickzauber-calculator.js: Honeypot + Time-to-Submit + Double-Opt-in-Versprechen).
 *
 * Eine neue Location braucht NUR eine eigene Config unter window.WEDDING_LOCATIONS[id]
 * (siehe configs/wedding-<ort>.config.js) — an dieser Datei ändert sich nichts.
 *
 * Config-Schema (Kurzreferenz):
 *   meta: { name, tenantId, color, privacyUrl, capacityMin, capacityMax }
 *   features: { freieTrauung, exklusivbuchung, floristikPaket, djBand, fotobox,
 *               uebernachtung, shuttle, kinderbetreuung, schlechtwetterplan }
 *   fields: { <fieldId>: { type: date|select|chips|toggle|textarea, label, options:[...], … } }
 *   pricing: { baseRentalByGuestTier:{value:eur}, seasonMonths:{1..12:faktor}, weekdayMultiplier:{0..6:faktor,default} }
 *   keywords: [ { key, aliases:[...], category, label, preis|preisProGast, reasonHint } ]
 *   calendar: [ { from, to, status: frei|belegt|reserviert } ]
 *   trust: { ansprechpartner, antwortzeit, tagSelbst, wetterRegel, absageRegel, kommunikation }
 */
(function () {
  "use strict";
  const E = window.WeddingEngine;

  const SCREENS = [
    { id: "rahmen", eyebrow: "1 · Ihr Rahmen", title: "Wann und in welchem Rahmen feiern Sie?", fields: ["termin", "ausweichtermin", "gaeste", "budget"] },
    { id: "stil", eyebrow: "2 · Stil & Zeremonie", title: "Wie soll sich Ihr Tag anfühlen?", fields: ["floristik", "stil", "trauung", "location"] },
    { id: "genuss", eyebrow: "3 · Genuss", title: "Worauf freuen sich Ihre Gäste kulinarisch?", fields: ["menue", "getraenke", "mitternachtssnack"] },
    { id: "atmosphaere", eyebrow: "4 · Atmosphäre", title: "Musik & Unterhaltung", fields: ["musik"] },
    { id: "extras", eyebrow: "5 · Erinnerung & Extras", title: "Was soll festgehalten oder mitgedacht werden?", fields: ["fotoVideo", "zusatz"] },
    { id: "vorsorge", eyebrow: "6 · Für alle Fälle", title: "Und für den Fall der Fälle?", fields: ["wetterplan", "freitext"] }
  ];

  class WeddingPlanner extends HTMLElement {
    connectedCallback() {
      if (this._built) return; this._built = true;
      if (!E) { this.innerHTML = "<p>wedding-engine.js fehlt.</p>"; return; }
      const locId = this.getAttribute("data-location");
      const cfg = (window.WEDDING_LOCATIONS || {})[locId];
      if (!cfg) { this.innerHTML = `<p style="font:14px sans-serif;color:#b91c1c">wedding-planner: Location „${locId}" nicht gefunden.</p>`; return; }
      this.cfg = cfg;
      this.tenant = this.getAttribute("data-tenant") || cfg.meta.tenantId || "";
      this.apiUrl = this.getAttribute("data-api-url") || "";
      this.privacyUrl = this.getAttribute("data-privacy-url") || cfg.meta.privacyUrl || "#";
      this.company = this.getAttribute("data-company") || cfg.meta.name;
      this.consentVersion = "v1_2026_wedding_DE";
      this.calMap = E.expandCalendar(cfg.calendar);

      // Keyword-Wörterbuch: eigenständige Keywords + Alias-Erkennung aus Auswahlfeldern
      this.keywordDict = (cfg.keywords || []).slice();

      this.attachShadow({ mode: "open" });
      this.state = this.defaultState();
      this.screen = 0;
      this.render();
      this.bind();
      this.showScreen(0);
    }

    $(sel) { return this.shadowRoot.querySelector(sel); }
    fieldDef(id) { return this.cfg.fields[id]; }
    optOf(fieldId, value) { const f = this.fieldDef(fieldId); return (f.options || []).find((o) => o.value === (value !== undefined ? value : this.state.values[fieldId])) || (f.options || [])[0]; }
    visibleOptions(f) { return (f.options || []).filter((o) => E.hasFeature(this.cfg, o.feature)); }
    fieldVisible(f) { return E.hasFeature(this.cfg, f.feature) && (f.type !== "select" && f.type !== "chips" ? true : this.visibleOptions(f).length > 0); }

    defaultState() {
      const values = {};
      Object.keys(this.cfg.fields).forEach((id) => {
        const f = this.cfg.fields[id];
        if (f.type === "select") { const opts = this.visibleOptionsFor(f); values[id] = (opts.find((o) => o.def) || opts[0] || {}).value; }
        else if (f.type === "toggle") values[id] = false;
        else if (f.type === "date") values[id] = "";
      });
      return { values, chips: { location: new Set(), fotoVideo: new Set(), zusatz: new Set() }, freitext: "" };
    }
    visibleOptionsFor(f) { return (f.options || []).filter((o) => E.hasFeature(this.cfg, o.feature)); }

    screenEmpty(n) { const s = this.shadowRoot.querySelector(`.wp-screen[data-idx="${n}"]`); return s && !s.textContent.trim(); }
    showScreen(n) {
      this.screen = n;
      this.shadowRoot.querySelectorAll(".wp-screen").forEach((s) => { s.style.display = (+s.dataset.idx === n) ? "block" : "none"; });
      const back = this.$("#wp-back"), next = this.$("#wp-next"), bar = this.$("#wp-bar"), navWrap = this.$("#wp-nav");
      const lastWizard = SCREENS.length - 1;
      if (n === SCREENS.length) { navWrap.style.display = "none"; this.recalc(); }
      else {
        navWrap.style.display = "flex";
        back.style.visibility = n === 0 ? "hidden" : "visible";
        next.textContent = n === lastWizard ? "Ergebnis berechnen →" : "Weiter →";
        bar.style.width = ((n + 1) / (SCREENS.length + 1) * 100) + "%";
      }
      if (n <= lastWizard) { const label = this.$("#wp-progress-tx"); if (label) label.textContent = `Schritt ${n + 1} von ${SCREENS.length}`; }
    }

    // ── Feldtypen → Markup ──────────────────────────────────────────────────
    fieldHtml(id) {
      const f = this.fieldDef(id);
      if (!f || !this.fieldVisible(f)) return "";
      const today = new Date().toISOString().slice(0, 10);
      if (f.type === "date") {
        return `<div class="wp-field" data-field="${id}"><label class="wp-label">${f.label}</label><button type="button" class="wp-datebtn" id="wp-${id}" data-dp="${id}"><span class="wp-dateval" data-empty="1">tt.mm.jjjj</span></button><div class="wp-dp" id="wp-dp-${id}" hidden></div>${(id === "termin" || id === "ausweichtermin") ? `<div class="wp-avail" id="wp-avail-${id}"></div>` : ""}</div>`;
      }
      if (f.type === "select") {
        const opts = this.visibleOptionsFor(f);
        const optHtml = opts.map((o) => {
          const price = o.preisProGast ? ` — ca. +${E.euro(o.preisProGast)} €/Gast` : (o.preis ? ` — ca. +${E.euro(o.preis)} €` : "");
          return `<option value="${o.value}"${o.value === this.state.values[id] ? " selected" : ""}>${o.label}${price}</option>`;
        }).join("");
        const cur = this.optOf(id);
        return `<div class="wp-field" data-field="${id}"><label class="wp-label">${f.label}</label><select id="wp-${id}" class="wp-select">${optHtml}</select><div class="wp-note" id="wp-note-${id}">${(cur && cur.note) || ""}</div></div>`;
      }
      if (f.type === "chips") {
        const opts = this.visibleOptionsFor(f);
        if (!opts.length) return "";
        const chipHtml = opts.map((o) => `<button type="button" class="wp-chip" data-field="${id}" data-val="${o.value}" title="${(o.reasonHint||"").replace(/"/g,'&quot;')}">${o.label}${o.preis ? ` <small>+${E.euro(o.preis)} €</small>` : ""}</button>`).join("");
        const legend = opts.filter((o) => o.reasonHint).map((o) => `<div class="wp-chip-legend-item"><b>${o.label}${o.preis ? ` (+${E.euro(o.preis)} €)` : ""}</b> ${o.reasonHint}</div>`).join("");
        return `<div class="wp-field" data-field="${id}"><label class="wp-label">${f.label}</label><div class="wp-chips">${chipHtml}</div>${f.hint ? `<div class="wp-hint">${f.hint}</div>` : ""}${legend ? `<div class="wp-chip-legend">${legend}</div>` : ""}</div>`;
      }
      if (f.type === "toggle") {
        const price = f.preisProGast ? `+${E.euro(f.preisProGast)} €/Gast` : (f.preis ? `+${E.euro(f.preis)} €` : "inklusive");
        return `<label class="wp-toggle" data-field="${id}"><input type="checkbox" id="wp-${id}"><span class="wp-switch"></span><span class="wp-toggle-txt">${f.label} <small>${f.note || ""} · ${price}</small></span></label>`;
      }
      if (f.type === "textarea") {
        return `<div class="wp-field" data-field="${id}"><label class="wp-label">${f.label}</label><textarea id="wp-${id}" class="wp-textarea" rows="3" placeholder="${f.placeholder || ""}"></textarea><div class="wp-detect" id="wp-detect"></div></div>`;
      }
      return "";
    }

    screenHtml(scr, idx) {
      const fieldsHtml = scr.fields.map((id) => this.fieldHtml(id)).join("");
      if (!fieldsHtml.trim()) return `<section class="wp-screen" data-idx="${idx}"></section>`;
      return `<section class="wp-screen" data-idx="${idx}"><p class="wp-eyebrow">${scr.eyebrow}</p><h3 class="wp-title">${scr.title}</h3>${fieldsHtml}</section>`;
    }

    trustHtml() {
      const t = this.cfg.trust || {};
      const rows = [
        ["👤", t.ansprechpartner], ["⏱", t.antwortzeit], ["🎤", t.tagSelbst],
        ["☔", t.wetterRegel], ["✎", t.absageRegel], ["💬", t.kommunikation]
      ].filter((r) => r[1]);
      return `<div class="wp-trust"><div class="wp-trust-head">Damit Sie sich sicher fühlen</div><div class="wp-trust-grid">${rows.map((r) => `<div class="wp-trust-item"><span class="wp-trust-ic">${r[0]}</span><span>${r[1]}</span></div>`).join("")}</div></div>`;
    }

    render() {
      const c = this.cfg.meta.color || "#b0894f";
      const screensHtml = SCREENS.map((s, i) => this.screenHtml(s, i)).join("");
      this.shadowRoot.innerHTML = `
      <style>
        :host{--wp-c:${c};--wp-ink:#2d2a24;--wp-ink-2:#6b6455;--wp-line:#e7e0d3;--wp-bg:#fffdf9;--wp-soft:#f7f1e6;all:initial;display:block;box-sizing:border-box;font-family:var(--fd,"Space Grotesk",system-ui,sans-serif);color:var(--wp-ink);line-height:1.55;text-align:left}
        *,*::before,*::after{box-sizing:border-box}
        .wp-card{position:relative;background:var(--wp-bg);border:1px solid var(--wp-line);border-radius:22px;padding:clamp(22px,5vw,32px);max-width:560px;margin:0 auto;box-shadow:0 30px 70px -30px color-mix(in srgb,var(--wp-c) 35%,transparent),0 14px 34px rgba(30,20,10,.08)}
        .wp-chrome{display:flex;align-items:center;gap:9px;margin:-4px -4px 18px;padding:0 4px 14px;border-bottom:1px solid var(--wp-line)}
        .wp-dots{display:inline-flex;gap:5px}.wp-dots i{width:9px;height:9px;border-radius:50%;background:var(--wp-line)}
        .wp-dots i:nth-child(3){background:color-mix(in srgb,var(--wp-c) 55%,#fff)}
        .wp-mod{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:10.5px;letter-spacing:.05em;color:var(--wp-ink-2);flex:1}
        .wp-eyebrow{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--wp-c);margin:0 0 8px}
        .wp-title{font-size:clamp(18px,4vw,22px);font-weight:700;letter-spacing:-.02em;margin:0 0 18px}
        #wp-progress-tx{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--wp-ink-2);text-align:right;display:block;margin:0 0 8px}
        .wp-field{margin-bottom:18px}
        .wp-label{display:block;font-size:13.5px;font-weight:600;margin-bottom:8px}
        .wp-input,.wp-select,.wp-textarea{width:100%;border:1px solid var(--wp-line);border-radius:11px;padding:12px 14px;font-family:inherit;font-size:15px;color:var(--wp-ink);background:#fff}
        .wp-select{cursor:pointer;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b6455' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center;padding-right:36px}
        .wp-input:focus,.wp-select:focus,.wp-textarea:focus{outline:none;border-color:var(--wp-c);box-shadow:0 0 0 4px color-mix(in srgb,var(--wp-c) 16%,transparent)}
        .wp-textarea{resize:vertical;min-height:74px}
        .wp-note{margin-top:8px;font-size:12.5px;line-height:1.45;color:var(--wp-ink-2);background:var(--wp-soft);border-radius:9px;padding:8px 11px}
        .wp-note:empty{display:none}
        .wp-avail{margin-top:8px;font-size:12.5px;font-weight:600;padding:7px 11px;border-radius:9px}
        .wp-avail:empty{display:none}
        .wp-avail[data-ok="1"]{background:#e6f4ea;color:#166534}
        .wp-avail[data-ok="0"]{background:#fdeceb;color:#b91c1c}
        .wp-datebtn{width:100%;border:1px solid var(--wp-line);border-radius:11px;padding:12px 40px 12px 14px;font-family:inherit;font-size:15px;color:var(--wp-ink);text-align:left;cursor:pointer;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b6455' stroke-width='2' stroke-linecap='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M16 2v4M8 2v4M3 10h18'/%3E%3C/svg%3E") no-repeat right 13px center}
        .wp-datebtn:focus{outline:none;border-color:var(--wp-c);box-shadow:0 0 0 4px color-mix(in srgb,var(--wp-c) 16%,transparent)}
        .wp-dateval[data-empty="1"]{color:#a49b87;font-size:13.5px}
        .wp-dp{border:1px solid var(--wp-line);border-radius:14px;background:#fff;padding:12px;margin-top:8px;box-shadow:0 18px 44px -18px rgba(30,20,10,.28)}
        .wp-dp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .wp-dp-title{font-size:13.5px;font-weight:700}
        .wp-dp-nav{-webkit-appearance:none;appearance:none;border:1px solid var(--wp-line);background:#fff;border-radius:9px;width:34px;height:34px;font-size:17px;line-height:1;color:var(--wp-ink);cursor:pointer}
        .wp-dp-nav:disabled{opacity:.3;cursor:default}
        .wp-dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
        .wp-dp-wd{font-size:10px;font-weight:600;color:var(--wp-ink-2);text-align:center;text-transform:uppercase;padding:2px 0}
        .wp-dp-day{-webkit-appearance:none;appearance:none;aspect-ratio:1;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;background:#e6f4ea;color:#166534;border:1.5px solid #4ade80}
        .wp-dp-day[data-st="belegt"],.wp-dp-day[data-st="reserviert"]{background:#fdeceb;color:#b91c1c;border-color:#f87171}
        .wp-dp-day:disabled{background:#fdeceb;color:#dca7a2;border-color:#f5c5c0;text-decoration:line-through;cursor:default}
        .wp-dp-day[data-sel="1"]{outline:2.5px solid var(--wp-c);outline-offset:1px}
        .wp-dp .wp-cal-legend{margin-top:10px}
        .wp-chips{display:flex;flex-wrap:wrap;gap:8px}
        .wp-chip{-webkit-appearance:none;appearance:none;border:1px solid var(--wp-line);background:#fff;border-radius:999px;padding:9px 15px;font-family:inherit;font-size:13px;font-weight:600;color:var(--wp-ink-2);cursor:pointer}
        .wp-chip small{font-weight:500;opacity:.8}
        .wp-chip.on{background:var(--wp-c);border-color:var(--wp-c);color:#fff}
        .wp-hint{margin-top:7px;font-size:12px;color:var(--wp-ink-2)}
        .wp-chip-legend{margin-top:9px;display:flex;flex-direction:column;gap:5px}
        .wp-chip-legend-item{font-size:12px;line-height:1.5;color:var(--wp-ink-2);background:var(--wp-soft);border-radius:9px;padding:7px 11px}
        .wp-chip-legend-item b{color:var(--wp-ink);font-weight:600}
        .wp-toggle{display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid var(--wp-line);border-radius:13px;margin-bottom:18px;cursor:pointer}
        .wp-toggle input{position:absolute;opacity:0;pointer-events:none}
        .wp-switch{flex:0 0 auto;width:42px;height:25px;border-radius:999px;background:#e2d9c4;position:relative}
        .wp-switch::after{content:"";position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25);transition:transform .18s ease}
        .wp-toggle input:checked+.wp-switch{background:var(--wp-c)}
        .wp-toggle input:checked+.wp-switch::after{transform:translateX(17px)}
        .wp-toggle-txt{font-size:13.5px;font-weight:600}
        .wp-toggle-txt small{display:block;font-weight:400;color:var(--wp-ink-2);font-size:12px}
        .wp-detect{margin-top:9px;font-size:12.5px;color:var(--wp-c);min-height:1px}
        #wp-nav{display:flex;align-items:center;gap:14px;margin-top:6px}
        #wp-back,#wp-next{-webkit-appearance:none;appearance:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;border-radius:11px;padding:12px 18px;font-size:14px}
        #wp-back{background:none;color:var(--wp-ink-2)}
        #wp-next{background:var(--wp-c);color:#fff;flex:1}
        .wp-progress{flex:1;height:4px;border-radius:99px;background:var(--wp-soft);overflow:hidden}
        #wp-bar{display:block;height:4px;border-radius:99px;background:var(--wp-c);transition:width .3s ease}
        .wp-result-box{background:linear-gradient(150deg,var(--wp-ink) 0%,color-mix(in srgb,var(--wp-ink) 60%,var(--wp-c)) 100%);border-radius:16px;padding:22px 20px;text-align:center;margin-bottom:16px}
        .wp-result-label{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.62);margin-bottom:6px}
        .wp-result-value{font-size:clamp(28px,7vw,38px);font-weight:700;letter-spacing:-.02em;color:#fff}
        .wp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16)}
        .wp-stat-v{display:block;font-size:16px;font-weight:700;color:#fff}
        .wp-stat-l{display:block;font-size:10.5px;color:rgba(255,255,255,.55);margin-top:2px}
        .wp-season{font-size:12px;color:var(--wp-ink-2);margin:0 0 14px}
        .wp-budgetnote{font-size:12.5px;background:var(--wp-soft);border-radius:9px;padding:9px 12px;margin-bottom:14px}
        .wp-reason-head{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--wp-ink-2);margin:0 0 9px}
        .wp-reason{border:1px solid var(--wp-line);border-radius:12px;padding:11px 13px;margin-bottom:8px;font-size:13px;line-height:1.5}
        .wp-reason b{display:block;font-size:13.5px;margin-bottom:2px}
        .wp-cal{margin:16px 0}
        .wp-cal-months{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .wp-cal-month b{display:block;font-size:12.5px;margin-bottom:6px;text-align:center}
        .wp-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
        .wp-cal-cell{aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#166534;background:#e6f4ea;border:1.5px solid #4ade80}
        .wp-cal-cell[data-status="belegt"],.wp-cal-cell[data-status="reserviert"]{background:#fdeceb;color:#b91c1c;border-color:#f87171}
        .wp-cal-cell[data-past="1"]{background:#fdeceb;border-color:#f5c5c0;color:#dca7a2;font-weight:400}
        .wp-cal-cell[data-sel="1"]{outline:2.5px solid var(--wp-c);outline-offset:1px}
        .wp-cal-legend{display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--wp-ink-2)}
        .wp-cal-legend span{display:inline-flex;align-items:center;gap:5px}
        .wp-cal-legend i{width:10px;height:10px;border-radius:50%;background:#e6f4ea;border:1.5px solid #4ade80}
        .wp-cal-legend i.b{background:#fdeceb;border-color:#f87171}
        .wp-trust{margin:16px 0}
        .wp-trust-head{font-family:var(--fm,"IBM Plex Mono",ui-monospace,monospace);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--wp-ink-2);margin:0 0 9px}
        .wp-trust-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .wp-trust-item{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.45;background:var(--wp-soft);border-radius:10px;padding:9px 10px}
        .wp-trust-ic{flex:0 0 auto}
        .wp-disclaimer{font-size:11px;line-height:1.5;color:#8a8371;margin:12px 0}
        .wp-cta{width:100%;border:none;border-radius:12px;padding:15px 20px;font-family:inherit;font-size:15.5px;font-weight:600;cursor:pointer;background:var(--wp-c);color:#fff}
        .wp-lead{margin-top:16px;border-top:1px solid var(--wp-line);padding-top:16px}
        .wp-input-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
        .wp-consent{display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:12px;line-height:1.5;color:var(--wp-ink-2)}
        .wp-consent input{flex:0 0 auto;width:18px;height:18px;margin-top:1px;accent-color:var(--wp-c)}
        .wp-consent a{color:var(--wp-c)}
        .wp-err{color:#dc2626;font-size:12px;margin-top:4px}
        .wp-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
        .wp-back-edit{background:none;border:none;color:var(--wp-ink-2);font-family:inherit;font-size:13px;cursor:pointer;padding:8px 0;text-decoration:underline}
        .wp-success{text-align:center;padding:10px 0}
        .wp-check{width:52px;height:52px;border-radius:50%;background:color-mix(in srgb,var(--wp-c) 14%,#fff);display:grid;place-items:center;margin:0 auto 14px;font-size:24px}
        @media(max-width:460px){.wp-card{padding:18px 15px;border-radius:16px}.wp-trust-grid,.wp-cal-months{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.wp-switch::after{transition:none}}
      </style>
      <div class="wp-card">
        <div class="wp-chrome"><span class="wp-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="wp-mod">clickzauber · Hochzeits-Planer</span></div>
        <div id="wp-progress-tx"></div>
        <div class="wp-stage">
          ${screensHtml}
          <section class="wp-screen wp-result" data-idx="${SCREENS.length}">
            <div id="wp-result-inner"></div>
          </section>
        </div>
        <div id="wp-nav"><button type="button" id="wp-back">← Zurück</button><div class="wp-progress"><span id="wp-bar"></span></div><button type="button" id="wp-next">Weiter →</button></div>
      </div>`;
    }

    // ── Event-Bindung (einmalig; Screens werden nur ein-/ausgeblendet) ──────
    bind() {
      this.shadowRoot.querySelectorAll("select.wp-select").forEach((sel) => {
        const id = sel.closest("[data-field]").dataset.field;
        sel.addEventListener("change", (e) => {
          this.state.values[id] = e.target.value;
          const note = this.$("#wp-note-" + id); if (note) note.textContent = (this.optOf(id) && this.optOf(id).note) || "";
        });
      });
      this.shadowRoot.querySelectorAll(".wp-toggle input").forEach((inp) => {
        const id = inp.closest("[data-field]").dataset.field;
        inp.addEventListener("change", (e) => { this.state.values[id] = e.target.checked; });
      });
      // Datums-Picker mit Verfügbarkeits-Farben (ersetzt natives Datumsfeld)
      this._dpView = {};
      this.shadowRoot.querySelectorAll(".wp-datebtn").forEach((btn) => {
        const id = btn.dataset.dp;
        const t = new Date(); this._dpView[id] = new Date(t.getFullYear(), t.getMonth(), 1);
        btn.addEventListener("click", () => {
          const panel = this.$("#wp-dp-" + id); const wasOpen = !panel.hidden;
          this.shadowRoot.querySelectorAll(".wp-dp").forEach((p) => { p.hidden = true; });
          if (!wasOpen) { this.renderDp(id); panel.hidden = false; }
        });
        this.$("#wp-dp-" + id).addEventListener("click", (e) => {
          const nav = e.target.closest("[data-nav]");
          if (nav && !nav.disabled) { this._dpView[id].setMonth(this._dpView[id].getMonth() + Number(nav.dataset.nav)); this.renderDp(id); return; }
          const day = e.target.closest(".wp-dp-day");
          if (!day || day.disabled) return;
          const iso = day.dataset.iso;
          this.state.values[id] = iso;
          const disp = this.$("#wp-" + id + " .wp-dateval");
          disp.textContent = iso.split("-").reverse().join(".");
          disp.removeAttribute("data-empty");
          this.updateAvail(id, iso);
          this.$("#wp-dp-" + id).hidden = true;
        });
      });
      this.shadowRoot.querySelectorAll(".wp-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.field, val = btn.dataset.val;
          const set = this.state.chips[id];
          if (set.has(val)) { set.delete(val); btn.classList.remove("on"); } else { set.add(val); btn.classList.add("on"); }
        });
      });
      const ta = this.shadowRoot.querySelector('textarea[id="wp-freitext"]');
      if (ta) ta.addEventListener("input", (e) => {
        this.state.freitext = e.target.value;
        clearTimeout(this._dt);
        this._dt = setTimeout(() => this.previewDetect(), 260);
      });

      this.$("#wp-back").addEventListener("click", () => { let n = this.screen - 1; while (n > 0 && this.screenEmpty(n)) n--; if (n >= 0) this.showScreen(n); });
      this.$("#wp-next").addEventListener("click", () => {
        if (this.screen >= SCREENS.length - 1) { this.showScreen(SCREENS.length); return; }
        let n = this.screen + 1; while (n < SCREENS.length - 1 && this.screenEmpty(n)) n++;
        this.showScreen(n);
      });
    }

    renderDp(id) {
      const view = this._dpView[id];
      const m = E.monthMatrix(view.getFullYear(), view.getMonth());
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const minM = new Date(today.getFullYear(), today.getMonth(), 1);
      const maxM = new Date(today.getFullYear(), today.getMonth() + 18, 1);
      const sel = this.state.values[id];
      const wd = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="wp-dp-wd">${w}</span>`).join("");
      const days = m.weeks.flat().map((c) => {
        if (!c) return "<span></span>";
        const past = new Date(c.iso + "T00:00:00") < today;
        return `<button type="button" class="wp-dp-day" data-iso="${c.iso}" data-st="${E.dateStatus(this.calMap, c.iso)}" data-sel="${c.iso === sel ? 1 : 0}"${past ? " disabled" : ""}>${c.day}</button>`;
      }).join("");
      this.$("#wp-dp-" + id).innerHTML = `<div class="wp-dp-head"><button type="button" class="wp-dp-nav" data-nav="-1"${view <= minM ? " disabled" : ""}>‹</button><span class="wp-dp-title">${m.label}</span><button type="button" class="wp-dp-nav" data-nav="1"${view >= maxM ? " disabled" : ""}>›</button></div><div class="wp-dp-grid">${wd}${days}</div><div class="wp-cal-legend"><span><i></i>frei</span><span><i class="b"></i>belegt / vergangen</span></div>`;
    }

    updateAvail(id, iso) {
      const av = this.$("#wp-avail-" + id);
      if (!av) return;
      const st = E.dateStatus(this.calMap, iso);
      if (!iso) { av.textContent = ""; av.removeAttribute("data-ok"); }
      else if (st === "frei") { av.dataset.ok = "1"; av.textContent = id === "termin" ? "✓ Dieser Termin ist frei — wir sind an diesem Tag für Sie verfügbar." : "✓ Ihr Ausweichtermin ist frei."; }
      else { av.dataset.ok = "0"; av.textContent = id === "termin" ? "✗ Dieser Termin ist leider schon " + st + " — wählen Sie gern einen Ausweichtermin, oder wir schlagen Ihnen einen Termin in der Nähe vor." : "✗ Auch dieser Termin ist leider schon " + st + " — bitte wählen Sie einen anderen Tag."; }
    }

    selectedKeySet() {
      const keys = new Set();
      Object.keys(this.cfg.fields).forEach((id) => {
        const f = this.cfg.fields[id];
        if (f.type === "select") { const o = this.optOf(id); if (o && o.key) keys.add(o.key); }
        if (f.type === "toggle" && this.state.values[id] && f.key) keys.add(f.key);
      });
      ["location", "fotoVideo", "zusatz"].forEach((cid) => {
        const f = this.cfg.fields[cid]; if (!f) return;
        this.state.chips[cid].forEach((val) => { const o = (f.options || []).find((x) => x.value === val); if (o && o.key) keys.add(o.key); });
      });
      return keys;
    }

    previewDetect() {
      const hits = E.scanKeywords(this.state.freitext, this.keywordDict, this.selectedKeySet());
      const guest = E.extractGuestCount(this.state.freitext);
      const el = this.$("#wp-detect"); if (!el) return;
      const parts = [];
      if (hits.length) parts.push("Erkannt: " + hits.map((h) => h.label).join(" · "));
      if (guest) parts.push(guest + " Gäste übernommen");
      el.textContent = parts.join(" — ");
    }

    // ── Preisberechnung ──────────────────────────────────────────────────────
    compute() {
      const cfg = this.cfg, v = this.state.values;
      const gOpt = this.optOf("gaeste");
      const detectedGuests = E.extractGuestCount(this.state.freitext);
      const guestCount = (detectedGuests && detectedGuests > gOpt.n) ? detectedGuests : gOpt.n;
      const guestNote = (detectedGuests && detectedGuests > gOpt.n) ? `Sie erwähnten ${detectedGuests} Gäste in Ihrem Text — das haben wir automatisch berücksichtigt.` : null;

      const termin = v.termin ? new Date(v.termin + "T00:00:00") : null;
      const month = termin ? termin.getMonth() + 1 : new Date().getMonth() + 1;
      const dow = termin ? termin.getDay() : 6;
      const seasonMult = (cfg.pricing.seasonMonths || {})[month] ?? 1;
      const weekdayMult = (cfg.pricing.weekdayMultiplier || {})[dow] ?? (cfg.pricing.weekdayMultiplier || {}).default ?? 1;
      const baseRental = (cfg.pricing.baseRentalByGuestTier || {})[gOpt.value] || 0;
      const grundpreis = baseRental * seasonMult * weekdayMult;

      const lineItems = [];
      ["menue", "getraenke", "floristik", "musik", "trauung"].forEach((id) => {
        const f = cfg.fields[id]; if (!f || !this.fieldVisible(f)) return;
        const o = this.optOf(id); if (!o) return;
        const amount = o.preisProGast ? o.preisProGast * guestCount : (o.preis || 0);
        if (amount || o.note) lineItems.push({ category: o.category || f.category, label: o.label, amount, reasonHint: o.note, source: "auswahl" });
      });
      ["mitternachtssnack", "wetterplan"].forEach((id) => {
        const f = cfg.fields[id]; if (!f || !this.fieldVisible(f) || !v[id]) return;
        const amount = f.preisProGast ? f.preisProGast * guestCount : (f.preis || 0);
        lineItems.push({ category: f.category, label: f.label, amount, reasonHint: f.note, source: "auswahl" });
      });
      ["location", "fotoVideo", "zusatz"].forEach((id) => {
        const f = cfg.fields[id]; if (!f) return;
        this.state.chips[id].forEach((val) => {
          const o = (f.options || []).find((x) => x.value === val); if (!o) return;
          lineItems.push({ category: o.category, label: o.label, amount: o.preis || 0, reasonHint: o.reasonHint, source: "auswahl" });
        });
      });
      const textHits = E.scanKeywords(this.state.freitext, this.keywordDict, this.selectedKeySet());
      textHits.forEach((h) => lineItems.push({ category: h.category, label: h.label, amount: h.preisProGast ? h.preisProGast * guestCount : (h.preis || 0), reasonHint: h.reasonHint, source: "text" }));

      const addons = lineItems.reduce((s, li) => s + (li.amount || 0), 0);
      const total = grundpreis + addons;
      const reasoning = E.buildReasoning(lineItems);
      const bOpt = this.optOf("budget");
      const budgetNote = bOpt ? (total <= bOpt.max ? `Das liegt innerhalb Ihres Rahmens von ${bOpt.label}.` : `Das liegt aktuell über Ihrem Rahmen von ${bOpt.label} — wir zeigen Ihnen gern beim Gespräch, wo sich anpassen lässt.`) : "";
      const proGast = ((this.optOf("menue") ? (this.optOf("menue").preisProGast || 0) : 0) + (this.optOf("getraenke") ? (this.optOf("getraenke").preisProGast || 0) : 0));

      return { guestCount, guestNote, grundpreis, total, lineItems, reasoning, budgetNote, proGast, seasonMult, weekdayMult, termin: v.termin, month, dow };
    }

    recalc() {
      const r = this.compute(); this.lastResult = r;
      const cfg = this.cfg;
      const monthName = E.MONATE[(r.month || 1) - 1];
      const seasonTxt = r.seasonMult >= 1.15 ? "Hochsaison" : (r.seasonMult <= 0.9 ? "Nebensaison" : "Zwischensaison");
      const wdTxt = r.weekdayMult >= 1.1 ? "beliebter Wochentag" : "Wochentag mit Preisvorteil";

      // Kalender: gewählter Monat + Folgemonat
      const base = r.termin ? new Date(r.termin + "T00:00:00") : new Date();
      const months = [0, 1].map((off) => {
        const d = new Date(base.getFullYear(), base.getMonth() + off, 1);
        return E.monthMatrix(d.getFullYear(), d.getMonth());
      });
      const today = new Date(); today.setHours(0,0,0,0);
      const calHtml = months.map((m) => `
        <div class="wp-cal-month"><b>${m.label}</b><div class="wp-cal-grid">${m.weeks.flat().map((c) => c ? `<div class="wp-cal-cell" data-status="${E.dateStatus(this.calMap, c.iso)}" data-past="${new Date(c.iso + 'T00:00:00') < today ? 1 : 0}" data-sel="${(c.iso === r.termin || c.iso === this.state.values.ausweichtermin) ? 1 : 0}">${c.day}</div>` : `<div></div>`).join("")}</div></div>`).join("");

      const fmtD = (iso) => { const d = new Date(iso + "T00:00:00"); return d.getDate() + ". " + E.MONATE[d.getMonth()] + " " + d.getFullYear(); };
      const availLine = (iso, name) => { if (!iso) return ""; const st = E.dateStatus(this.calMap, iso); return `<div class="wp-avail" data-ok="${st === "frei" ? 1 : 0}" style="margin-top:8px">${st === "frei" ? "✓" : "✗"} ${name} (${fmtD(iso)}): ${st === "frei" ? "verfügbar" : "leider " + st}</div>`; };
      const availLines = availLine(r.termin, "Wunschtermin") + availLine(this.state.values.ausweichtermin, "Ausweichtermin");

      const reasonHtml = r.reasoning.map((x) => `<div class="wp-reason"><b>${x.label} · +${E.euro(x.amount)} €</b>${x.text}</div>`).join("") || `<div class="wp-reason">Ihr Preis besteht aktuell nur aus dem Grundpaket — passen Sie oben gern Ihre Wünsche an.</div>`;

      this.$("#wp-result-inner").innerHTML = `
        <p class="wp-eyebrow">Ihre Schätzung</p><h3 class="wp-title">So sieht Ihr Tag preislich ungefähr aus</h3>
        <div class="wp-result-box">
          <div class="wp-result-label">Geschätzte Gesamtsumme</div>
          <div class="wp-result-value">${E.euro(r.total)} €</div>
          <div class="wp-stats">
            <div><span class="wp-stat-v">${E.euro(r.grundpreis)} €</span><span class="wp-stat-l">Grundpreis (Miete)</span></div>
            <div><span class="wp-stat-v">${E.euro(r.proGast)} €</span><span class="wp-stat-l">pro Gast · Essen &amp; Getränke</span></div>
          </div>
        </div>
        <p class="wp-season">Ihr Termin fällt in die ${seasonTxt} (${monthName}) auf einen ${wdTxt}.${r.guestNote ? " " + r.guestNote : ""}</p>
        ${r.budgetNote ? `<div class="wp-budgetnote">${r.budgetNote}</div>` : ""}
        <p class="wp-reason-head">Warum genau dieser Preis</p>
        ${reasonHtml}
        <div class="wp-cal"><p class="wp-reason-head">Verfügbarkeit an Ihrem Wunschtermin</p><div class="wp-cal-months">${calHtml}</div><div class="wp-cal-legend"><span><i></i>frei</span><span><i class="b"></i>belegt / reserviert</span></div>${availLines}</div>
        ${this.trustHtml()}
        <p class="wp-disclaimer">Unverbindlicher Richtwert: Diese Schätzung dient der ersten Orientierung und ist kein verbindliches Angebot. Die tatsächlichen Kosten klären wir gern im persönlichen Gespräch.</p>
        <button type="button" class="wp-cta" id="wp-cta">Ja, ich möchte meine persönliche Auswertung →</button>
        <button type="button" class="wp-back-edit" id="wp-back-edit">← Angaben ändern</button>
        <div class="wp-lead" id="wp-lead" hidden>
          <div class="wp-field"><label class="wp-input-label" for="wp-vorname">Vorname</label><input type="text" id="wp-vorname" class="wp-input" autocomplete="given-name"></div>
          <div class="wp-field"><label class="wp-input-label" for="wp-email">E-Mail-Adresse *</label><input type="email" id="wp-email" class="wp-input" autocomplete="email"><div class="wp-err" id="wp-err-email"></div></div>
          <div class="wp-field"><label class="wp-input-label" for="wp-telefon">Telefon <span style="font-weight:400;color:var(--wp-ink-2)">(optional, für schnellere Rückmeldung)</span></label><input type="tel" id="wp-telefon" class="wp-input" autocomplete="tel"></div>
          <input type="text" name="firma" class="wp-hp" id="wp-hp" tabindex="-1" autocomplete="off">
          <label class="wp-consent"><input type="checkbox" id="wp-dsgvo"><span>Ja, ${this.company} darf mich per E-Mail oder Telefon zu meiner Anfrage kontaktieren. Diese Einwilligung kann ich jederzeit widerrufen. Sobald ich sie gebe, erhalte ich sofort eine Bestätigungsmail — unser Team meldet sich noch heute, spätestens morgen persönlich bei mir. Mehr in der <a href="${this.privacyUrl}" target="_blank" rel="noopener">Datenschutzerklärung</a>.</span></label>
          <div class="wp-err" id="wp-err-dsgvo"></div>
          <button type="button" class="wp-cta" id="wp-submit">Unverbindliche Auswertung anfordern</button>
        </div>
        <div class="wp-success" id="wp-success" hidden>
          <div class="wp-check">✓</div>
          <h3 class="wp-title" style="margin-bottom:6px">Vielen Dank!</h3>
          <p style="font-size:14px;color:var(--wp-ink-2)">Sie erhalten in Kürze eine Bestätigungsmail an <b id="wp-success-mail" style="color:var(--wp-ink)"></b>. Unser Team meldet sich noch heute, spätestens morgen persönlich bei Ihnen.</p>
        </div>`;

      this.$("#wp-cta").addEventListener("click", () => { this.$("#wp-lead").hidden = false; this.$("#wp-cta").style.display = "none"; this.$("#wp-back-edit").style.display = "none"; setTimeout(() => this.$("#wp-vorname").focus(), 200); });
      this.$("#wp-back-edit").addEventListener("click", () => this.showScreen(SCREENS.length - 1));
      this.$("#wp-submit").addEventListener("click", () => this.submit());
      this._leadShown = Date.now();
    }

    async submit() {
      const email = this.$("#wp-email"), dsgvo = this.$("#wp-dsgvo"), hp = this.$("#wp-hp"), btn = this.$("#wp-submit");
      if (hp.value) { this.showSuccess(email.value); return; }
      const ttf = Date.now() - (this._leadShown || 0);
      let ok = true;
      this.$("#wp-err-email").textContent = ""; this.$("#wp-err-dsgvo").textContent = "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { this.$("#wp-err-email").textContent = "Bitte eine gültige E-Mail-Adresse eingeben."; ok = false; }
      if (!dsgvo.checked) { this.$("#wp-err-dsgvo").textContent = "Bitte stimmen Sie der Kontaktaufnahme zu."; ok = false; }
      if (!ok) return;

      const r = this.lastResult || this.compute();
      const payload = {
        tenant_id: this.tenant, industry: "wedding", location_id: this.getAttribute("data-location"),
        vorname: this.$("#wp-vorname").value.trim(), email: email.value.trim(), telefon: this.$("#wp-telefon").value.trim(),
        felder: { ...this.state.values, freitext: this.state.freitext, chips: { location: [...this.state.chips.location], fotoVideo: [...this.state.chips.fotoVideo], zusatz: [...this.state.chips.zusatz] } },
        gaeste_anzahl: r.guestCount, termin: this.state.values.termin, ausweichtermin: this.state.values.ausweichtermin,
        geschaetzte_summe_eur: Math.round(r.total), preis_positionen: r.lineItems,
        dsgvo_einwilligung: true, consent_text_version: this.consentVersion, ttf_ms: ttf, time_to_submit_ms: ttf,
        hp_company: hp.value, zeitstempel: new Date().toISOString(), quelle: "clickzauber-wedding-widget-v1"
      };
      const label = btn.textContent; btn.disabled = true; btn.textContent = "Wird gesendet …";
      try {
        if (ttf < 3500) { console.warn("[Wedding-Planner] Verworfen (Time-to-Submit " + ttf + " ms)."); }
        else if (this.apiUrl) {
          const res = await fetch(this.apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error("HTTP " + res.status);
        } else {
          await new Promise((res) => setTimeout(res, 650));
          console.info("[Wedding-Planner] Demo-Modus — kein data-api-url gesetzt. Lead:", payload);
        }
        this.showSuccess(payload.email);
      } catch (err) {
        btn.disabled = false; btn.textContent = label;
        this.$("#wp-err-email").textContent = "Übertragung fehlgeschlagen. Bitte versuchen Sie es erneut.";
        console.error("[Wedding-Planner] Lead-Versand fehlgeschlagen:", err);
      }
    }
    showSuccess(email) { this.$("#wp-lead").hidden = true; this.$("#wp-success").hidden = false; this.$("#wp-success-mail").textContent = email; }
  }

  if (!customElements.get("wedding-planner")) customElements.define("wedding-planner", WeddingPlanner);
})();
