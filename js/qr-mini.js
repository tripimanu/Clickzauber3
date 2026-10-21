/* qr-mini.js — kleiner QR-Encoder für das Cockpit.
   Byte-Modus, Fehlerkorrektur M, Versionen 1–10 (bis ~213 Zeichen).
   Absichtlich ohne fremde Bibliothek: der QR-Code muss auch dann entstehen,
   wenn ein CDN nicht erreichbar ist.
   window.czQR.zeichnen(canvas, text, {modul, rand, dunkel, hell}) */
(function () {
  'use strict';

  /* ---------- GF(256) ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function genPoly(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var out = new Array(g.length + 1);
      for (var k = 0; k < out.length; k++) out[k] = 0;
      for (var j = 0; j < g.length; j++) {
        out[j] ^= mul(g[j], 1);
        out[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = out;
    }
    return g;
  }
  function ecc(data, n) {
    var g = genPoly(n), res = data.slice();
    for (var i = 0; i < n; i++) res.push(0);
    for (i = 0; i < data.length; i++) {
      var c = res[i];
      if (!c) continue;
      for (var j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], c);
    }
    return res.slice(data.length);
  }

  /* ---------- Versionstabelle, Level M ---------- */
  /* [gesamt, ecProBlock, [[anzahl, datenProBlock], …]] */
  var V = {
    1:  [26,  10, [[1, 16]]],
    2:  [44,  16, [[1, 28]]],
    3:  [70,  26, [[1, 44]]],
    4:  [100, 18, [[2, 32]]],
    5:  [134, 24, [[2, 43]]],
    6:  [172, 16, [[4, 27]]],
    7:  [196, 18, [[4, 31]]],
    8:  [242, 22, [[2, 38], [2, 39]]],
    9:  [292, 22, [[3, 36], [2, 37]]],
    10: [346, 26, [[4, 43], [1, 44]]]
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };
  var VINFO = { 7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3 };

  /* Selbstprüfung: Daten + Fehlerkorrektur müssen die Gesamtzahl genau treffen.
     Ein Zahlendreher in der Tabelle fällt so sofort auf statt erst beim Scannen. */
  (function () {
    for (var v in V) {
      var t = V[v], bl = 0, dat = 0;
      t[2].forEach(function (b) { bl += b[0]; dat += b[0] * b[1]; });
      if (dat + bl * t[1] !== t[0]) {
        console.error('[czQR] Tabelle fehlerhaft bei Version', v, '—', dat + bl * t[1], 'statt', t[0]);
      }
    }
  })();

  function datenBytes(v) {
    var t = V[v], sum = 0;
    t[2].forEach(function (b) { sum += b[0] * b[1]; });
    return sum;
  }
  function zaehlBits(v) { return v < 10 ? 8 : 16; }

  function utf8(text) {
    var s = unescape(encodeURIComponent(String(text))), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
  }

  function version(len) {
    for (var v = 1; v <= 10; v++) {
      if (4 + zaehlBits(v) + 8 * len <= datenBytes(v) * 8) return v;
    }
    return 0;
  }

  /* ---------- Bitstrom ---------- */
  function bits() {
    var a = [];
    return {
      push: function (wert, n) { for (var i = n - 1; i >= 0; i--) a.push((wert >>> i) & 1); },
      len: function () { return a.length; },
      bytes: function () {
        var out = [];
        for (var i = 0; i < a.length; i += 8) {
          var b = 0;
          for (var j = 0; j < 8; j++) b = (b << 1) | (a[i + j] || 0);
          out.push(b);
        }
        return out;
      }
    };
  }

  function codewoerter(text) {
    var d = utf8(text), v = version(d.length);
    if (!v) return null;
    var kap = datenBytes(v) * 8, bs = bits();
    bs.push(4, 4);                    // Byte-Modus
    bs.push(d.length, zaehlBits(v));
    d.forEach(function (b) { bs.push(b, 8); });
    bs.push(0, Math.min(4, kap - bs.len()));            // Abschluss
    while (bs.len() % 8) bs.push(0, 1);                 // auf Byte auffüllen
    var roh = bs.bytes(), pad = [0xEC, 0x11], k = 0;
    while (roh.length < datenBytes(v)) roh.push(pad[k++ % 2]);

    // In Blöcke schneiden, ECC je Block, dann verschränkt zusammensetzen.
    var t = V[v], ecN = t[1], bl = [], pos = 0;
    t[2].forEach(function (b) {
      for (var i = 0; i < b[0]; i++) {
        var dat = roh.slice(pos, pos + b[1]); pos += b[1];
        bl.push({ d: dat, e: ecc(dat, ecN) });
      }
    });
    var out = [], maxD = 0;
    bl.forEach(function (b) { if (b.d.length > maxD) maxD = b.d.length; });
    for (var i = 0; i < maxD; i++) bl.forEach(function (b) { if (i < b.d.length) out.push(b.d[i]); });
    for (i = 0; i < ecN; i++) bl.forEach(function (b) { out.push(b.e[i]); });
    return { v: v, cw: out };
  }

  /* ---------- Matrix ---------- */
  function matrix(v) {
    var n = 17 + 4 * v, m = [], res = [];
    for (var i = 0; i < n; i++) { m.push(new Int8Array(n).fill(-1)); res.push(new Uint8Array(n)); }

    function finder(r, c) {
      for (var i = -1; i <= 7; i++) for (var j = -1; j <= 7; j++) {
        var y = r + i, x = c + j;
        if (y < 0 || x < 0 || y >= n || x >= n) continue;
        var d = (i >= 0 && i <= 6 && (j === 0 || j === 6)) || (j >= 0 && j <= 6 && (i === 0 || i === 6)) || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
        m[y][x] = d ? 1 : 0; res[y][x] = 1;
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (i = 8; i < n - 8; i++) { var b = (i % 2 === 0) ? 1 : 0; m[6][i] = b; res[6][i] = 1; m[i][6] = b; res[i][6] = 1; }

    var al = ALIGN[v];
    al.forEach(function (r) {
      al.forEach(function (c) {
        if ((r === 6 && c === 6) || (r === 6 && c === n - 7) || (r === n - 7 && c === 6)) return;
        for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) {
          var d = (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) ? 1 : 0;
          m[r + i][c + j] = d; res[r + i][c + j] = 1;
        }
      });
    });

    m[n - 8][8] = 1; res[n - 8][8] = 1;                 // dunkles Modul
    for (i = 0; i <= 8; i++) { if (m[8][i] < 0) { m[8][i] = 0; } res[8][i] = 1; if (m[i][8] < 0) { m[i][8] = 0; } res[i][8] = 1; }
    for (i = n - 8; i < n; i++) { res[8][i] = 1; res[i][8] = 1; }

    if (v >= 7) {
      var vi = VINFO[v];
      for (i = 0; i < 18; i++) {
        var bit = (vi >> i) & 1;
        m[Math.floor(i / 3)][n - 11 + (i % 3)] = bit; res[Math.floor(i / 3)][n - 11 + (i % 3)] = 1;
        m[n - 11 + (i % 3)][Math.floor(i / 3)] = bit; res[n - 11 + (i % 3)][Math.floor(i / 3)] = 1;
      }
    }
    return { m: m, res: res, n: n };
  }

  /* Daten im Zickzack von unten rechts nach oben links einsetzen. */
  function daten(M, cw) {
    var n = M.n, m = M.m, res = M.res, bitN = 0, total = cw.length * 8, hoch = true;
    for (var c = n - 1; c > 0; c -= 2) {
      if (c === 6) c--;
      for (var k = 0; k < n; k++) {
        var y = hoch ? (n - 1 - k) : k;
        for (var s = 0; s < 2; s++) {
          var x = c - s;
          if (res[y][x]) continue;
          var bit = 0;
          if (bitN < total) bit = (cw[bitN >> 3] >> (7 - (bitN & 7))) & 1;
          bitN++;
          m[y][x] = bit;
        }
      }
      hoch = !hoch;
    }
    return M;
  }

  function maskFn(k, y, x) {
    switch (k) {
      case 0: return (y + x) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (y + x) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((y * x) % 2) + ((y * x) % 3) === 0;
      case 6: return (((y * x) % 2) + ((y * x) % 3)) % 2 === 0;
      default: return (((y + x) % 2) + ((y * x) % 3)) % 2 === 0;
    }
  }

  function format(mask) {
    var d = (0 << 3) | mask;              // Level M = 0b00
    var v = d << 10, g = 0x537;
    for (var i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= g << i;
    return ((d << 10) | v) ^ 0x5412;
  }

  function strafe(g, n) {
    var p = 0, i, j, run, dunkel = 0;
    for (i = 0; i < n; i++) {
      run = 1;
      for (j = 1; j < n; j++) {
        if (g[i][j] === g[i][j - 1]) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (j = 0; j < n; j++) {
      run = 1;
      for (i = 1; i < n; i++) {
        if (g[i][j] === g[i - 1][j]) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) {
      var a = g[i][j];
      if (a === g[i][j + 1] && a === g[i + 1][j] && a === g[i + 1][j + 1]) p += 3;
    }
    var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    function findet(arr) {
      var c = 0;
      for (var s = 0; s + 11 <= arr.length; s++) {
        var ok = true;
        for (var t = 0; t < 11; t++) if (arr[s + t] !== pat[t]) { ok = false; break; }
        if (ok) c++;
        ok = true;
        for (t = 0; t < 11; t++) if (arr[s + t] !== pat[10 - t]) { ok = false; break; }
        if (ok) c++;
      }
      return c;
    }
    for (i = 0; i < n; i++) {
      var row = [], col = [];
      for (j = 0; j < n; j++) { row.push(g[i][j]); col.push(g[j][i]); }
      p += 40 * (findet(row) + findet(col));
    }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (g[i][j]) dunkel++;
    p += 10 * Math.floor(Math.abs(dunkel * 100 / (n * n) - 50) / 5);
    return p;
  }

  function bauen(text) {
    var cwd = codewoerter(text);
    if (!cwd) return null;
    var v = cwd.v, best = null, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      var M = daten(matrix(v), cwd.cw), n = M.n;
      var g = [];
      for (var i = 0; i < n; i++) {
        g.push(new Uint8Array(n));
        for (var j = 0; j < n; j++) {
          var b = M.m[i][j] < 0 ? 0 : M.m[i][j];
          if (!M.res[i][j] && maskFn(mk, i, j)) b ^= 1;
          g[i][j] = b;
        }
      }
      var f = format(mk);
      for (i = 0; i < 15; i++) {
        var bit = (f >> i) & 1;
        if (i < 6) g[i][8] = bit;
        else if (i < 8) g[i + 1][8] = bit;
        else g[n - 15 + i][8] = bit;
        if (i < 8) g[8][n - i - 1] = bit;
        else if (i < 9) g[8][15 - i] = bit;
        else g[8][14 - i] = bit;
      }
      g[n - 8][8] = 1;
      var p = strafe(g, n);
      if (p < bestP) { bestP = p; best = g; }
    }
    return best;
  }

  window.czQR = {
    bauen: bauen,
    /* SVG als Zeichenkette — scharf in jeder Größe, ideal für Druck und Download. */
    svg: function (text, opt) {
      opt = opt || {};
      var g = bauen(text);
      if (!g) return null;
      var n = g.length, rand = opt.rand == null ? 4 : opt.rand, gr = n + rand * 2;
      var d = '';
      for (var i = 0; i < n; i++) {
        var j = 0;
        while (j < n) {
          if (!g[i][j]) { j++; continue; }
          var l = j;
          while (j < n && g[i][j]) j++;
          d += 'M' + (l + rand) + ' ' + (i + rand) + 'h' + (j - l) + 'v1h' + -(j - l) + 'z';
        }
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + gr + ' ' + gr
        + '" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="' + gr + '" height="' + gr
        + '" fill="' + (opt.hell || '#ffffff') + '"/><path d="' + d + '" fill="' + (opt.dunkel || '#000000') + '"/></svg>';
    },
    zeichnen: function (canvas, text, opt) {
      opt = opt || {};
      var g = bauen(text);
      if (!g) return false;
      var n = g.length, mod = opt.modul || 6, rand = opt.rand == null ? 4 : opt.rand;
      var px = (n + rand * 2) * mod;
      canvas.width = px; canvas.height = px;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = opt.hell || '#ffffff';
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = opt.dunkel || '#000000';
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        if (g[i][j]) ctx.fillRect((j + rand) * mod, (i + rand) * mod, mod, mod);
      }
      return true;
    }
  };
})();
