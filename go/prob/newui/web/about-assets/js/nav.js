/* Layer 8 — Navigation */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
        var spans = toggle.querySelectorAll('span');
        if (links.classList.contains('open')) {
          spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
          spans[1].style.opacity = '0';
          spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
          spans[0].style.transform = '';
          spans[1].style.opacity = '';
          spans[2].style.transform = '';
        }
      });

      links.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          links.classList.remove('open');
          var spans = toggle.querySelectorAll('span');
          spans[0].style.transform = '';
          spans[1].style.opacity = '';
          spans[2].style.transform = '';
        });
      });
    }
  });
})();
