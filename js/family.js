/* clickzauber — geteiltes Verhalten für die Seitenfamilie (leichtgewichtig, kein Framework) */
(function () {
  "use strict";
  function ready(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () {
    // Nav-Schatten beim Scrollen (rAF-gebündelt → kein Ruckeln)
    var nav = document.querySelector(".nav");
    if (nav) {
      var t = false;
      function upd(){ nav.classList.toggle("scrolled", window.scrollY > 8); t = false; }
      window.addEventListener("scroll", function(){ if (!t){ t = true; requestAnimationFrame(upd); } }, { passive: true });
      upd();
    }

    // Reveal-on-scroll
    var els = [].slice.call(document.querySelectorAll(".reveal"));
    if (els.length) {
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (en) {
          en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
        }, { threshold: 0.04, rootMargin: "0px 0px -8% 0px" });
        els.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 1.05) el.classList.add("in"); else io.observe(el);
        });
        setTimeout(function(){ document.querySelectorAll(".reveal:not(.in)").forEach(function(el){ if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in"); }); }, 900);
      } else { els.forEach(function (el) { el.classList.add("in"); }); }
    }

    // FAQ-Akkordeon
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var open = item.classList.contains("open");
        item.classList.toggle("open", !open);
        a.style.maxHeight = open ? null : a.scrollHeight + "px";
        q.setAttribute("aria-expanded", String(!open));
      });
      q.setAttribute("aria-expanded", "false");
    });
    window.addEventListener("resize", function () {
      document.querySelectorAll(".faq-item.open .faq-a").forEach(function (a) { a.style.maxHeight = a.scrollHeight + "px"; });
    });

    // Jahr im Footer
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });
})();
