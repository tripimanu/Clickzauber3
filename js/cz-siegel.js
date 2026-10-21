/* clickzauber · Vertrauenssiegel für die eigene Website
   Einbau: <script src="https://clickzauber.de/js/cz-siegel.js" data-cz="KENNUNG" async></script>
   Zeigt das aktuelle Vertrauensabzeichen des Betriebs und wächst mit. Ohne Abzeichen erscheint nichts. */
(function () {
  'use strict';
  var me = document.currentScript; if (!me) return;
  var slug = me.getAttribute('data-cz'); if (!slug) return;
  var api = (me.getAttribute('data-api') || 'https://clickzauber-api.vercel.app/api').replace(/\/$/, '');
  var basis = String(me.src || '').replace(/cz-siegel\.js.*$/, '');
  var a = document.createElement('a');
  a.href = 'https://clickzauber.de'; a.target = '_blank'; a.rel = 'noopener'; a.className = 'cz-siegel'; a.hidden = true;
  me.parentNode.insertBefore(a, me);
  if (!document.getElementById('cz-siegel-css')) {
    var st = document.createElement('style'); st.id = 'cz-siegel-css';
    st.textContent = '.cz-siegel{display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 8px;border-radius:999px;background:#fffdf8;border:1px solid rgba(36,31,25,.14);box-shadow:0 6px 18px rgba(36,31,25,.1);font:14px/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;color:#241f19;text-decoration:none}'
      + '.cz-siegel[hidden]{display:none}.cz-siegel:hover{border-color:rgba(36,31,25,.3)}.cz-siegel b{display:block;font-weight:600}.cz-siegel i{display:block;font-style:normal;font-size:12px;color:#7a7263}';
    document.head.appendChild(st);
  }
  function zeigen() {
    fetch(api + '/config?widget=' + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (c) {
      var s = c && c.vertrauen, A = window.czAbzeichen;
      if (s == null || s < 0 || !A) return;
      a.innerHTML = A.svg(s, 44) + '<span><b>Vertrauensabzeichen ' + A.name(s) + '</b><i>clickzauber · Punkte aus echten Anfragen</i></span>';
      a.title = 'Vertrauensabzeichen von clickzauber: wächst mit echten Anfragen und Abschlüssen';
      a.hidden = false;
    }).catch(function () {});
  }
  if (window.czAbzeichen) zeigen();
  else { var s = document.createElement('script'); s.src = basis + 'cz-abzeichen.js'; s.onload = zeigen; document.head.appendChild(s); }
})();
