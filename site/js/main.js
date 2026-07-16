(function () {
  'use strict';

  // -------------------- header: hauteur réelle mesurée (pour le menu mobile) --------------------
  var siteHeader = document.getElementById('site-header');
  function updateHeaderHeight() {
    document.documentElement.style.setProperty('--header-height', siteHeader.offsetHeight + 'px');
  }
  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight, { passive: true });
  window.addEventListener('load', updateHeaderHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateHeaderHeight);
  }

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
  }, { threshold: 0.3 });

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
            bg.style.transform = 'translateY(' + (rect.top * -0.1) + 'px)';
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

  // -------------------- FAQ accordion --------------------
  document.querySelectorAll('.faq__item').forEach(function (item) {
    var btn = item.querySelector('.faq__question');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // -------------------- stats: count-up au scroll --------------------
  function countUp(el, target, duration) {
    if (prefersReducedMotion) { el.textContent = target + '+'; return; }
    var start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + '+';
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target + '+';
    }
    requestAnimationFrame(step);
  }
  document.querySelectorAll('.social-proof__stat-number[data-target]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var statObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(el, target, 1400);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statObserver.observe(el);
  });

  // -------------------- contact form: validation + envoi (Formspree) --------------------
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    var successBox = document.getElementById('form-success');
    var errorBox = document.getElementById('form-error');
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var submitBtnDefaultText = submitBtn.textContent;

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      contactForm.querySelectorAll('[required]').forEach(function (field) {
        var errorEl = contactForm.querySelector('[data-error-for="' + field.id + '"]');
        if (!errorEl) return;
        if (field.type === 'checkbox') {
          errorEl.textContent = field.checked ? '' : 'Ce champ est requis.';
          if (!field.checked) valid = false;
        } else if (!field.value.trim()) {
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
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitBtn.textContent = 'Envoi en cours...';

      fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        if (response.ok) {
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = 'Demande envoyée';
          contactForm.hidden = true;
          successBox.hidden = false;
        } else {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = submitBtnDefaultText;
          errorBox.hidden = false;
        }
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.textContent = submitBtnDefaultText;
        errorBox.hidden = false;
      });
    });
  }

  // -------------------- sous-navigation ancrée : surbrillance de la section lue --------------------
  var subnavLinks = document.querySelectorAll('.subnav__link');
  if (subnavLinks.length) {
    var subnavPairs = Array.prototype.map.call(subnavLinks, function (link) {
      return { link: link, target: document.querySelector(link.getAttribute('href')) };
    }).filter(function (pair) { return pair.target; });

    // bande fine au centre de l'écran : la section qui l'occupe est celle
    // "en cours de lecture", plus fiable qu'un simple seuil d'entrée/sortie
    var subnavObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var active = entry.target;
        subnavPairs.forEach(function (pair) {
          pair.link.classList.toggle('is-active', pair.target === active);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    subnavPairs.forEach(function (pair) { subnavObserver.observe(pair.target); });
  }

  // -------------------- bouton WhatsApp flottant : masqué tant que le hero est visible --------------------
  // évite le chevauchement avec le CTA "Appeler / WhatsApp" du hero et la barre de
  // réassurance juste en dessous, surtout marqué sur les petits viewports (hauteur courte)
  var whatsappFloat = document.querySelector('.whatsapp-float');
  if (whatsappFloat && hero) {
    var whatsappObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        whatsappFloat.classList.toggle('is-hidden', entry.isIntersecting);
      });
    });
    whatsappObserver.observe(hero);
  }

  // ==========================================================================
  // ACCUEIL — rupture de grille & micro-interactions (page.page-home uniquement)
  // ==========================================================================
  var isHomePage = document.body.classList.contains('page-home');

  // -------------------- "Trois métiers" : molette verticale -> scroll horizontal --------------------
  var polesScroll = document.getElementById('poles-scroll');
  if (polesScroll) {
    var poleDots = Array.prototype.slice.call(document.querySelectorAll('.poles-scroll-dot'));
    var polePanels = Array.prototype.slice.call(polesScroll.querySelectorAll('.pole'));

    function setActiveDot(index) {
      poleDots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-current', String(i === index));
      });
    }

    poleDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var target = polePanels[i];
        if (!target) return;
        polesScroll.scrollTo({ left: target.offsetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
    });

    if (polePanels.length) {
      var poleDotObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveDot(polePanels.indexOf(entry.target));
          }
        });
      }, { root: polesScroll, threshold: 0.6 });
      polePanels.forEach(function (p) { poleDotObserver.observe(p); });
    }

    // conversion du scroll vertical (molette souris) en scroll horizontal, un
    // panel à la fois : scroll-snap-type + une simple accumulation de deltaY
    // se contrarient (le navigateur re-snap au point de départ à chaque
    // micro-ajustement), donc on avance explicitement d'un panel par "cran"
    // plutôt que de traduire le delta en continu. Comportement natif (trackpad,
    // swipe tactile, scrollbar) inchangé. Désactivé sous prefers-reduced-motion :
    // la section reste un simple ruban horizontal scrollable au doigt/trackpad.
    if (!prefersReducedMotion && polePanels.length) {
      var wheelCooldown = false;
      polesScroll.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) < 8) return;
        var currentIndex = Math.round(polesScroll.scrollLeft / polesScroll.clientWidth);
        var scrollingDown = e.deltaY > 0;
        var atStart = currentIndex <= 0;
        var atEnd = currentIndex >= polePanels.length - 1;
        if ((scrollingDown && atEnd) || (!scrollingDown && atStart)) {
          return; // laisse la page continuer son scroll vertical normal
        }
        e.preventDefault();
        if (wheelCooldown) return;
        wheelCooldown = true;
        var nextIndex = currentIndex + (scrollingDown ? 1 : -1);
        polesScroll.scrollTo({ left: polePanels[nextIndex].offsetLeft, behavior: 'smooth' });
        setTimeout(function () { wheelCooldown = false; }, 700);
      }, { passive: false });
    }
  }

  // -------------------- cartes véhicules : tilt 3D léger au survol (souris) --------------------
  if (isHomePage && !prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.fleet__card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = 'perspective(800px) rotateX(' + (py * -8) + 'deg) rotateY(' + (px * 8) + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  // -------------------- club : parallax marqué (l'image bouge plus lentement que le scroll) --------------------
  var clubBg = document.getElementById('club-teaser-bg');
  var clubSection = document.getElementById('club');
  if (clubBg && clubSection && !prefersReducedMotion) {
    var clubTicking = false;
    function updateClubParallax() {
      var rect = clubSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        clubBg.style.transform = 'translateY(' + (rect.top * -0.15) + 'px)';
      }
      clubTicking = false;
    }
    updateClubParallax();
    window.addEventListener('scroll', function () {
      if (!clubTicking) {
        requestAnimationFrame(updateClubParallax);
        clubTicking = true;
      }
    }, { passive: true });
  }

  // -------------------- curseur personnalisé (souris fine uniquement) --------------------
  if (isHomePage && !prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      cursor.classList.add('is-active');
    });
    document.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-active');
    });

    var hoverTargets = 'a, button, .btn, .fleet__card, .why__item, .poles-scroll-dot';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hovering');
    });
  }
})();
