(function () {
  'use strict';

  // -------------------- hero: entrance animation + scroll parallax --------------------
  var hero = document.getElementById('hero');
  var heroImg = hero ? hero.querySelector('.hero__img') : null;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (hero) {
    requestAnimationFrame(function () { hero.classList.add('is-loaded'); });

    if (heroImg && !prefersReducedMotion) {
      var ticking = false;
      function updateParallax() {
        var offset = window.scrollY;
        if (offset < hero.offsetHeight) {
          heroImg.style.transform = 'translateY(' + (offset * 0.4) + 'px)';
        }
        ticking = false;
      }
      window.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(updateParallax);
          ticking = true;
        }
      }, { passive: true });
    }
  }

  // -------------------- header: solid background past 40px scroll --------------------
  var header = document.getElementById('site-header');
  function updateHeaderScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  updateHeaderScroll();
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });

  // -------------------- mobile nav burger --------------------
  var burger = document.getElementById('burger-btn');
  var mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    var isOpen = mobileMenu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  var mobileNavQuery = window.matchMedia('(min-width: 1200px)');
  mobileNavQuery.addEventListener('change', function (e) {
    if (e.matches) closeMobileMenu();
  });

  // -------------------- scroll-reveal (pourquoi, faq, club teaser, etc.) --------------------
  var revealTargets = document.querySelectorAll('[data-reveal]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  revealTargets.forEach(function (el) { io.observe(el); });

  // -------------------- pôles: reveal au scroll (seuil 30%) + parallax léger --------------------
  var poles = document.querySelectorAll('.pole');
  if (poles.length) {
    if (prefersReducedMotion) {
      poles.forEach(function (p) { p.classList.add('is-in-view'); });
    } else {
      var poleObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
            poleObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      poles.forEach(function (p) { poleObserver.observe(p); });

      // le parallax cible le wrapper .pole__bg (pas l'image) pour ne pas entrer
      // en conflit avec les effets propres à l'image (clip-path wipe, scale+flou...)
      // qui manipulent leurs propres propriétés sur .pole__bg-img
      var poleBgs = Array.prototype.map.call(poles, function (p) {
        return p.querySelector('.pole__bg');
      });
      var poleTicking = false;
      function updatePoleParallax() {
        poles.forEach(function (p, i) {
          var bg = poleBgs[i];
          if (!bg) return;
          var rect = p.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            bg.style.transform = 'translateY(' + (rect.top * -0.22) + 'px)';
          }
        });
        poleTicking = false;
      }
      updatePoleParallax();
      window.addEventListener('scroll', function () {
        if (!poleTicking) {
          requestAnimationFrame(updatePoleParallax);
          poleTicking = true;
        }
      }, { passive: true });
    }
  }

  // -------------------- contact form: validation + envoi (Formspree) --------------------
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    var successBox = document.getElementById('form-success');
    var errorBox = document.getElementById('form-error');

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      contactForm.querySelectorAll('[required]').forEach(function (field) {
        var errorEl = contactForm.querySelector('[data-error-for="' + field.id + '"]');
        if (!field.value.trim()) {
          errorEl.textContent = 'Ce champ est requis.';
          valid = false;
        } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          errorEl.textContent = 'Merci de renseigner une adresse email valide.';
          valid = false;
        } else if (field.type === 'tel' && !/^[\d\s+()-]{8,}$/.test(field.value)) {
          errorEl.textContent = 'Merci de renseigner un numéro de téléphone valide.';
          valid = false;
        } else {
          errorEl.textContent = '';
        }
      });

      if (!valid) return;

      errorBox.hidden = true;
      fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          contactForm.hidden = true;
          successBox.hidden = false;
        } else {
          errorBox.hidden = false;
        }
      }).catch(function () {
        errorBox.hidden = false;
      });
    });
  }
})();
