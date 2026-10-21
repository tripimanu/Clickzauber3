/* clickzauber · Vertrauensabzeichen (Skizzen-Stand 29.09.2026)
   Eine Quelle für Cockpit, Rangliste, Profil und die Skizzenseite.
   czAbzeichen.svg(stufe, px, { anim }) — stufe -1 = noch keins, 0 Bronze … 8 Löwenkristall.
   Die Schwellen stehen gleich noch einmal im Server (lib/_vertrauen.js). Beide zusammen ändern. */
(function () {
  'use strict';
  var STUFEN = [
    { n: 'Bronze', ab: 10 },
    { n: 'Silber', ab: 100 },
    { n: 'Gold', ab: 250 },
    { n: 'Diamant', ab: 500 },
    { n: 'Zwei Diamanten', ab: 1000 },
    { n: 'Drei Diamanten', ab: 2000 },
    { n: 'Goldlöwe', ab: 3500 },
    { n: 'Zwei Goldlöwen', ab: 6000 },
    { n: 'Löwenkristall', ab: 10000 }
  ];
  function stufeVon(p) { var s = -1; STUFEN.forEach(function (x, i) { if (p >= x.ab) s = i; }); return s; }

  var css = '.cza-dreh{transform-box:fill-box;transform-origin:center;animation:czaDreh 18s linear infinite}'
    + '.cza-dreh.lang{animation-duration:40s}'
    + '.cza-puls{animation:czaPuls 2.4s ease-in-out infinite}'
    + '.cza-fk{transform-box:fill-box;transform-origin:center;animation:czaFunkel 2.4s ease-in-out infinite;opacity:0}'
    + '.cza-atem{transform-box:fill-box;transform-origin:center;animation:czaAtem 3.4s ease-in-out infinite}'
    + '.cza-glanz{animation:czaGlanz 3.8s ease-in-out infinite}'
    + '.cza-schwebe{animation:czaSchwebe 4.2s ease-in-out infinite}'
    + '@keyframes czaDreh{to{transform:rotate(360deg)}}'
    + '@keyframes czaPuls{0%,100%{opacity:.35}50%{opacity:.95}}'
    + '@keyframes czaFunkel{0%,100%{transform:scale(.2);opacity:0}45%,55%{transform:scale(1);opacity:1}}'
    + '@keyframes czaAtem{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}'
    + '@keyframes czaGlanz{0%{transform:translateX(-70px)}55%,100%{transform:translateX(70px)}}'
    + '@keyframes czaSchwebe{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.2px)}}'
    + '@media(prefers-reduced-motion:reduce){.cza-dreh,.cza-puls,.cza-atem,.cza-glanz,.cza-schwebe{animation:none!important}.cza-fk{animation:none!important;opacity:.8}}';
  if (!document.getElementById('cz-abzeichen-css')) { var st = document.createElement('style'); st.id = 'cz-abzeichen-css'; st.textContent = css; document.head.appendChild(st); }

  var zaehler = 0;
  function f(x) { return Math.round(x * 100) / 100; }
  function stops(s) { return s.map(function (c, i) { return '<stop offset="' + f(i / (s.length - 1)) + '" stop-color="' + c + '"/>'; }).join(''); }
  function lg(id, s) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2=".7" y2="1">' + stops(s) + '</linearGradient>'; }
  function rg(id, s) { return '<radialGradient id="' + id + '" cx=".5" cy=".4" r=".62">' + stops(s) + '</radialGradient>'; }

  var SCHILD = 'M50 6L86 18V47C86 70 70 84 50 93C30 84 14 70 14 47V18Z';
  var RAND = 'M50 13.5L79 23.2V47C79 65.5 66.5 77.5 50 85.3C33.5 77.5 21 65.5 21 47V23.2Z';
  var GOLD = ['#fff0a6', '#f4c542', '#b07a10'];
  var MAEHNE = ['#f9d95e', '#d0951a', '#80530a'];

  function stern(cx, cy, R) {
    var p = '';
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * .45 : R; p += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r); }
    return p + 'Z';
  }
  function funkel(x, y, s, verz, anim) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path class="' + (anim ? 'cza-fk' : '') + '" style="animation-delay:' + verz + 's' + (anim ? '' : ';opacity:.9') + '" d="M0-1Q.14-.14 1 0Q.14.14 0 1Q-.14.14-1 0Q-.14-.14 0-1Z" fill="#fff"/></g>';
  }
  /* Facettierter Edelstein. fb = [hell, mittel, dunkel, Kante] */
  var UMRISS = [[-.55, -.6], [.55, -.6], [1, -.15], [0, .95], [-1, -.15]];
  function umriss(cx, cy, s) { return 'M' + UMRISS.map(function (q) { return f(cx + q[0] * s) + ' ' + f(cy + q[1] * s); }).join('L') + 'Z'; }
  function diamant(cx, cy, s, fb) {
    var F = [
      [[-.55, -.6], [-1, -.15], [-.35, -.15], 0], [[-.55, -.6], [-.35, -.15], [0, -.6], 1], [[0, -.6], [-.35, -.15], [.35, -.15], 0],
      [[0, -.6], [.35, -.15], [.55, -.6], 1], [[.55, -.6], [.35, -.15], [1, -.15], 2],
      [[-1, -.15], [-.35, -.15], [0, .95], 1], [[-.35, -.15], [.35, -.15], [0, .95], 2], [[.35, -.15], [1, -.15], [0, .95], 3]
    ];
    var h = '<g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ')">';
    F.forEach(function (x) { h += '<path d="M' + x.slice(0, 3).map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + 'Z" fill="' + fb[x[3]] + '"/>'; });
    h += '<path d="M' + UMRISS.map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + 'Z" fill="none" stroke="' + fb[3] + '" stroke-width=".06" stroke-linejoin="round"/>';
    h += '<path d="M-.3-.48L-.12-.48" stroke="#fff" stroke-width=".07" stroke-linecap="round" opacity=".85"/>';
    return h + '</g>';
  }
  function lorbeer(farbe, dunkel) {
    var h = '';
    [-1, 1].forEach(function (seite) {
      h += '<path d="' + (seite < 0 ? 'M46 96Q8 88 6 46' : 'M54 96Q92 88 94 46') + '" fill="none" stroke="' + dunkel + '" stroke-width="1.6" stroke-linecap="round"/>';
      for (var k = 0; k < 7; k++) {
        var grad = 102 + k * 13.5, phi = grad * Math.PI / 180;
        [[47.5, -34], [40.5, 34]].forEach(function (b) {
          var x = 50 + b[0] * Math.cos(phi), y = 51 + b[0] * Math.sin(phi), rot = grad + 90 + b[1];
          if (seite > 0) { x = 100 - x; rot = 180 - rot; }
          h += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="5.6" ry="2.3" transform="rotate(' + f(rot) + ' ' + f(x) + ' ' + f(y) + ')" fill="' + farbe + '" stroke="' + dunkel + '" stroke-width=".6"/>';
        });
      }
    });
    return h;
  }
  function band(hell, dunkel, kante) {
    return '<path d="M19 81L6 82.5L10.5 88.5L6 94.5L19 93Z" fill="' + dunkel + '"/><path d="M81 81L94 82.5L89.5 88.5L94 94.5L81 93Z" fill="' + dunkel + '"/>'
      + '<path d="M17 79Q50 86 83 79V91.5Q50 98.5 17 91.5Z" fill="' + hell + '" stroke="' + kante + '" stroke-width="1.2"/>'
      + '<path d="M22 84Q50 90 78 84" fill="none" stroke="' + kante + '" stroke-width=".8" opacity=".7"/>';
  }
  function krone(cx, cy, w, gid, stein) {
    var s = w / 2;
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + f(s) + ')">'
      + '<path d="M-1 .45L-1.08-.42L-.52 .02L0-.7L.52 .02L1.08-.42L1 .45Z" fill="url(#' + gid + ')" stroke="#7d5208" stroke-width=".07" stroke-linejoin="round"/>'
      + '<rect x="-1.02" y=".42" width="2.04" height=".34" rx=".08" fill="url(#' + gid + ')" stroke="#7d5208" stroke-width=".07"/>'
      + '<circle cx="-1.08" cy="-.46" r=".13" fill="' + stein + '"/><circle cx="0" cy="-.74" r=".15" fill="' + stein + '"/><circle cx="1.08" cy="-.46" r=".13" fill="' + stein + '"/>'
      + '<circle cx="0" cy=".59" r=".11" fill="' + stein + '"/><circle cx="-.55" cy=".59" r=".08" fill="#fff" opacity=".8"/><circle cx=".55" cy=".59" r=".08" fill="#fff" opacity=".8"/></g>';
  }
  function rosette(cx, cy, R, zahl) {
    var p = '', st = Math.PI * 2 / zahl;
    for (var i = 0; i <= zahl; i++) {
      var a = i * st, x = cx + Math.cos(a) * R * .95, y = cy + Math.sin(a) * R * .95;
      if (!i) { p += 'M' + f(x) + ' ' + f(y); continue; }
      var ac = a - st / 2; p += 'Q' + f(cx + Math.cos(ac) * R * 1.09) + ' ' + f(cy + Math.sin(ac) * R * 1.09) + ' ' + f(x) + ' ' + f(y);
    }
    return p + 'Z';
  }
  function strahlen(cx, cy, zahl, R, farben, deck) {
    var h = '', st = Math.PI * 2 / zahl, d = st * .28;
    for (var i = 0; i < zahl; i++) {
      var a = i * st;
      h += '<path d="M' + cx + ' ' + cy + 'L' + f(cx + Math.cos(a - d) * R) + ' ' + f(cy + Math.sin(a - d) * R) + 'L' + f(cx + Math.cos(a + d) * R) + ' ' + f(cy + Math.sin(a + d) * R) + 'Z" fill="' + farben[i % farben.length] + '" opacity="' + deck + '"/>';
    }
    return h;
  }
  /* Löwenkopf von vorn, Mähne als geschwungene Flammen. Einheit: Mähnen-Radius 1. */
  function flammen(R, r, zahl, off) {
    var p = '', st = Math.PI * 2 / zahl;
    for (var i = 0; i < zahl; i++) {
      var a = i * st + off, at = a + st * .58, an = a + st;
      var c1 = a + st * .16, c2 = at + st * .32, rm = (R + r) / 2;
      if (!i) p += 'M' + f(Math.cos(a) * r) + ' ' + f(Math.sin(a) * r);
      p += 'Q' + f(Math.cos(c1) * R * .99) + ' ' + f(Math.sin(c1) * R * .99) + ' ' + f(Math.cos(at) * R) + ' ' + f(Math.sin(at) * R)
        + 'Q' + f(Math.cos(c2) * rm) + ' ' + f(Math.sin(c2) * rm) + ' ' + f(Math.cos(an) * r) + ' ' + f(Math.sin(an) * r);
    }
    return p + 'Z';
  }
  function loewe(cx, cy, s, rot, gM, gF, cls) {
    var dk = '#5a3505', sw = ' stroke="' + dk + '" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    return '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + (rot || 0) + ') scale(' + s + ')"><g class="' + (cls || '') + '">'
      + '<path d="' + flammen(1, .74, 15, -.2) + '" fill="url(#' + gM + ')" stroke="#6b4406" stroke-width=".04"/>'
      + '<path d="' + flammen(.82, .6, 13, .1) + '" fill="url(#' + gF + ')" stroke="#8a5a0a" stroke-width=".03" opacity=".95"/>'
      + '<circle cx="-.46" cy="-.52" r=".17" fill="url(#' + gF + ')" stroke="' + dk + '" stroke-width=".04"/><circle cx=".46" cy="-.52" r=".17" fill="url(#' + gF + ')" stroke="' + dk + '" stroke-width=".04"/>'
      + '<circle cx="-.46" cy="-.52" r=".08" fill="#8a5a0a"/><circle cx=".46" cy="-.52" r=".08" fill="#8a5a0a"/>'
      + '<path d="M-.42-.4C-.54-.06-.44.3-.2.54Q0 .68.2.54C.44.3.54-.06.42-.4Q0-.62-.42-.4Z" fill="url(#' + gF + ')" stroke="' + dk + '" stroke-width=".04"/>'
      + '<path d="M-.1-.44Q0-.3.1-.44"' + sw + ' stroke-width=".03" opacity=".5"/>'
      + '<path d="M-.36-.2Q-.22-.31-.07-.18M.36-.2Q.22-.31.07-.18"' + sw + ' stroke-width=".05"/>'
      + '<path d="M-.32-.1Q-.21-.2-.1-.11Q-.21-.05-.32-.1ZM.32-.1Q.21-.2.1-.11Q.21-.05.32-.1Z" fill="' + dk + '"/>'
      + '<circle cx="-.19" cy="-.125" r=".025" fill="#fff"/><circle cx=".23" cy="-.125" r=".025" fill="#fff"/>'
      + '<path d="M-.08-.08L-.12.15H.12L.08-.08Z" fill="#fff8d0" opacity=".45"/>'
      + '<path d="M-.15.14H.15Q.13.22 0 .29Q-.13.22-.15.14Z" fill="' + dk + '"/>'
      + '<ellipse cx="-.11" cy=".36" rx=".14" ry=".11" fill="#fff4c4" stroke="' + dk + '" stroke-width=".02" stroke-opacity=".4"/><ellipse cx=".11" cy=".36" rx=".14" ry=".11" fill="#fff4c4" stroke="' + dk + '" stroke-width=".02" stroke-opacity=".4"/>'
      + '<path d="M0 .29V.4M-.16.47Q0 .55.16.47"' + sw + ' stroke-width=".035"/>'
      + '<circle cx="-.1" cy=".34" r=".016" fill="' + dk + '"/><circle cx="-.16" cy=".38" r=".016" fill="' + dk + '"/><circle cx=".1" cy=".34" r=".016" fill="' + dk + '"/><circle cx=".16" cy=".38" r=".016" fill="' + dk + '"/>'
      + '</g></g>';
  }

  var CYAN = ['#ffffff', '#c9f3ff', '#6cc9ee', '#2a7fb0'], PINK = ['#ffe0f0', '#ff8fcb', '#e23b91', '#8f0f55'], VIOL = ['#efe0ff', '#b98cff', '#7a3fe0', '#3f1a8c'];
  var SCHILDE = [
    ['#f0b27a', '#b0682f', '#7a4119'], ['#ffffff', '#c9d1d8', '#7f8b96'], ['#fff1a8', '#f2c13d', '#a8740c'],
    ['#9be7ff', '#2f9fe0', '#164f9e'], ['#d3bcff', '#7a4cf0', '#3a1a9e'], ['#8ff7dc', '#12b39a', '#0a5e63']
  ];

  function bauen(i, u, anim) {
    var d = '', h = '';
    if (i < 0) {
      d = lg(u + 's', ['#eee9df', '#cfc7b8', '#aaa190']);
      return '<defs>' + d + '</defs><g transform="translate(50 53) scale(.88) translate(-50 -50)"><path d="' + SCHILD + '" fill="url(#' + u + 's)" stroke="rgba(0,0,0,.12)" stroke-width="1.2"/><path d="' + RAND + '" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="50" cy="47" r="7" fill="#fff" opacity=".75"/></g>';
    }
    if (i <= 5) {
      d = lg(u + 's', SCHILDE[i]) + lg(u + 'g', GOLD);
      if (i >= 2) h += lorbeer(i === 2 ? '#e8b93a' : '#f2c94c', '#8a5d0c');
      if (i >= 5) h += krone(50, 11, 26, u + 'g', '#ff5fae');
      h += '<g transform="translate(50 53) scale(.88) translate(-50 -50)">';
      h += '<path d="' + SCHILD + '" fill="url(#' + u + 's)" stroke="' + (i >= 3 ? '#f5cf57' : 'rgba(0,0,0,.16)') + '" stroke-width="' + (i >= 3 ? 4 : 1.2) + '" stroke-linejoin="round"/>';
      h += '<path d="' + RAND + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>';
      if (i >= 3) h += '<path d="M24 26L50 16.5L76 26" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>';
      if (i <= 2) {
        h += '<path d="' + stern(50, 47, 21) + '" fill="#fff" fill-opacity=".94" stroke="rgba(0,0,0,.12)" stroke-width="1"/>';
        if (i === 2) h += '<path d="' + stern(50, 47, 9) + '" fill="#f5c542"/>';
      } else if (i === 3) h += diamant(50, 43, 21, CYAN);
      else if (i === 4) h += diamant(37, 46, 13, CYAN) + diamant(63, 46, 13, PINK);
      else h += diamant(31, 50, 11, CYAN) + diamant(69, 50, 11, VIOL) + diamant(50, 40, 12.5, PINK);
      h += '</g>';
      if (i >= 4) h += band(i === 4 ? '#e2453c' : '#12b39a', i === 4 ? '#8e1d17' : '#0a5e63', '#f5cf57');
      return '<defs>' + d + '</defs>' + h;
    }
    d = lg(u + 'g', GOLD) + lg(u + 'm', MAEHNE) + lg(u + 'f', ['#fff6c2', '#f6cf55', '#c48c16']);
    var innen = i === 6 ? ['#ff6b7d', '#c01a3a', '#5a0418'] : i === 7 ? ['#a57bff', '#5220c4', '#1e0858'] : ['#7a1655', '#2c0620', '#0d0209'];
    d += rg(u + 'i', innen);
    if (i === 8) { d += '<radialGradient id="' + u + 'l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7cc8" stop-opacity=".95"/><stop offset="1" stop-color="#ff7cc8" stop-opacity="0"/></radialGradient>'; d += '<clipPath id="' + u + 'c"><path d="' + umriss(50, 49, 15) + '"/></clipPath>'; }
    var strFarben = i === 6 ? ['#f5c542'] : i === 7 ? ['#f5c542', '#b98cff'] : ['#ff5fae', '#f5c542'];
    h += '<g class="' + (anim && i >= 7 ? 'cza-dreh' + (i === 7 ? ' lang' : '') : '') + '">' + strahlen(50, 48, i === 8 ? 28 : 24, 50, strFarben, i === 8 ? .7 : .42) + '</g>';
    h += lorbeer('#f2c94c', '#8a5d0c');
    h += '<path d="' + rosette(50, 48, 34, 20) + '" fill="' + (i === 8 ? '#120a10' : 'url(#' + u + 'g)') + '" stroke="' + (i === 8 ? '#f5cf57' : '#8a5d0c') + '" stroke-width="' + (i === 8 ? 1.8 : 1) + '"/>';
    h += '<circle cx="50" cy="48" r="29.5" fill="none" stroke="url(#' + u + 'g)" stroke-width="2.4"/>';
    h += '<circle cx="50" cy="48" r="27" fill="url(#' + u + 'i)"/>';
    if (i === 6) {
      h += loewe(50, 48, 23, 0, u + 'm', u + 'f');
      h += band('#d8283f', '#7a0b22', '#f5cf57');
    } else if (i === 7) {
      h += krone(50, 11, 26, u + 'g', '#b98cff');
      h += loewe(35, 50, 14.5, -8, u + 'm', u + 'f') + loewe(65, 50, 14.5, 8, u + 'm', u + 'f');
      h += band('#5a28d0', '#2a0b6e', '#f5cf57');
      h += funkel(24, 26, 4, 0, anim) + funkel(78, 70, 3.2, 1.2, anim);
    } else {
      h += '<circle class="' + (anim ? 'cza-puls' : '') + '" cx="50" cy="49" r="24" fill="url(#' + u + 'l)"' + (anim ? '' : ' opacity=".7"') + '/>';
      h += krone(50, 10.5, 28, u + 'g', '#ff5fae');
      h += '<path d="' + umriss(50, 49, 20.5) + '" fill="#0b0709" stroke="#f5cf57" stroke-width="1.6" stroke-linejoin="round"/>';
      h += '<path d="' + umriss(50, 49, 18) + '" fill="none" stroke="#f5cf57" stroke-width=".6" stroke-opacity=".6" stroke-linejoin="round"/>';
      h += diamant(50, 49, 15, ['#ffe3f2', '#ff97cf', '#ea3f96', '#1a0710']);
      h += '<g clip-path="url(#' + u + 'c)"><path class="' + (anim ? 'cza-glanz' : '') + '" d="M40 25L48 25L34 75L26 75Z" fill="#fff" opacity=".55"' + (anim ? '' : ' transform="translate(14 0)"') + '/></g>';
      h += loewe(17, 55, 15.5, -12, u + 'm', u + 'f', anim ? 'cza-atem' : '') + loewe(83, 55, 15.5, 12, u + 'm', u + 'f', anim ? 'cza-atem' : '');
      h += band('#141014', '#000', '#f5cf57') + '<path d="M26 86Q50 91.5 74 86" fill="none" stroke="#ff5fae" stroke-width="1.6" stroke-linecap="round"/>';
      h += funkel(30, 24, 4.2, 0, anim) + funkel(72, 22, 3.4, .8, anim) + funkel(63, 70, 3, 1.6, anim) + funkel(38, 67, 2.6, 2.1, anim);
      if (anim) h = '<g class="cza-schwebe">' + h + '</g>';
    }
    return '<defs>' + d + '</defs>' + h;
  }

  function svg(i, px, o) {
    o = o || {};
    var u = 'cza' + (++zaehler), anim = o.anim !== false;
    i = Math.max(-1, Math.min(STUFEN.length - 1, i == null ? -1 : i));
    return '<svg class="cza' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 100 100" width="' + px + '" height="' + px + '" role="img" aria-label="' + (i < 0 ? 'Noch kein Vertrauensabzeichen' : 'Vertrauensabzeichen ' + STUFEN[i].n) + '">' + bauen(i, u, anim) + '</svg>';
  }

  window.czAbzeichen = { STUFEN: STUFEN, stufeVon: stufeVon, svg: svg, name: function (i) { return i < 0 ? 'Noch kein Abzeichen' : STUFEN[i].n; } };
})();
