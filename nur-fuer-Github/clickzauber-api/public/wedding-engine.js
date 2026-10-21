/*
 * clickzauber — Hochzeits-Planer: gemeinsamer Rechen-/Erkennungskern (reines JS, kein DOM).
 * Enthält: Feature-Schalter-Helfer, Kalender-Expansion, Keyword-Erkennung im Freitext,
 * Preisbegründungs-Vorlagen je Kategorie.
 *
 * WICHTIG: Diese Datei ist für ALLE Hochzeitslocations identisch. Eine neue Location
 * bekommt NUR eine eigene Config-Datei (configs/wedding-<ort>.config.js) — an diesem
 * Kern ändert sich nichts.
 */
(function () {
  "use strict";

  const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
  const euro = (n) => nf.format(Math.round(n || 0));
  const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

  function hasFeature(cfg, key) {
    if (!key) return true;
    if (!cfg || !cfg.features) return true;
    return cfg.features[key] !== false;
  }

  // ── Kalender: Zeitspannen → Datum-Status-Map ────────────────────────────────
  function expandCalendar(ranges) {
    const map = new Map();
    (ranges || []).forEach((r) => {
      const from = new Date(r.from + "T00:00:00");
      const to = new Date((r.to || r.from) + "T00:00:00");
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        map.set(d.toISOString().slice(0, 10), r.status || "belegt");
      }
    });
    return map;
  }
  function dateStatus(map, iso) { return iso ? (map.get(iso) || "frei") : "frei"; }

  // Monatsraster (Montag-first) fürs Kalender-UI
  function monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { label: `${MONATE[month]} ${year}`, weeks };
  }

  // ── Freitext: Keyword-Erkennung ─────────────────────────────────────────────
  function scanKeywords(text, dict, alreadySelectedKeys) {
    const t = (text || "").toLowerCase();
    if (!t.trim()) return [];
    const seen = new Set();
    const hits = [];
    (dict || []).forEach((entry) => {
      if (alreadySelectedKeys && entry.key && alreadySelectedKeys.has(entry.key)) return;
      if (seen.has(entry.key || entry.label)) return;
      const found = (entry.aliases || []).some((a) => t.includes(a.toLowerCase()));
      if (found) { seen.add(entry.key || entry.label); hits.push(entry); }
    });
    return hits;
  }

  function extractGuestCount(text) {
    const m = (text || "").match(/(\d{2,3})\s*(gäste|gaeste|personen|pax|leuten)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  // ── Preisbegründung: eine Zeile je Kategorie, gemeinsam für alle Locations ──
  const CATEGORY_LABEL = {
    location: "Location & Aufbau", catering: "Essen & Küche", getraenke: "Getränke",
    floristik: "Blumen & Deko", musik: "Musik", fotoVideo: "Foto & Video", technik: "Technik",
    logistik: "Logistik", kinderbetreuung: "Kinderbetreuung", extras: "Extras"
  };
  function buildReasoning(lineItems) {
    const byCat = new Map();
    (lineItems || []).forEach((li) => {
      if (!li.amount) return;
      if (!byCat.has(li.category)) byCat.set(li.category, { amount: 0, hints: [], detected: [] });
      const c = byCat.get(li.category);
      c.amount += li.amount;
      if (li.reasonHint && !c.hints.includes(li.reasonHint)) c.hints.push(li.reasonHint);
      if (li.source === "text") c.detected.push(li.label);
    });
    const out = [];
    byCat.forEach((c, cat) => {
      const hintTxt = c.hints.length ? c.hints.join("; ") : "individuelle Zusatzleistung";
      let text = `${CATEGORY_LABEL[cat] || cat}: ${hintTxt}.`;
      if (c.detected.length) text += ` Aus Ihrem Text erkannt: „${c.detected.join(", ")}".`;
      out.push({ category: cat, label: CATEGORY_LABEL[cat] || cat, amount: c.amount, text });
    });
    out.sort((a, b) => b.amount - a.amount);
    return out;
  }

  window.WeddingEngine = { euro, MONATE, hasFeature, expandCalendar, dateStatus, monthMatrix, scanKeywords, extractGuestCount, buildReasoning, CATEGORY_LABEL };
})();
