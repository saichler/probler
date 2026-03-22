/* Layer 8 — Scroll Reveal */
(function () {
  'use strict';

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });
  });
})();
