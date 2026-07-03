(function () {
  'use strict';

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

  // -------------------- scroll-reveal (pôles, pourquoi, club teaser) --------------------
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
