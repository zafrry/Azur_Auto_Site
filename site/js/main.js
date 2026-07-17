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

  // -------------------- "Trois métiers" : carrousel automatique, entrée droite -> gauche --------------------
  // Section normale du flux de page (pas d'épinglage ni de scroll-jacking) :
  // les panels défilent tout seuls toutes les POLES_AUTOPLAY_MS, avec des
  // flèches et des points pour naviguer manuellement à tout moment. La
  // précédente version pilotait le changement de panel par le scroll de la
  // page (section épinglée + interception de la molette), mais aucun réglage
  // de sensibilité ne convenait à tout le monde : soit plusieurs panels
  // sautaient d'un coup avec l'inertie du trackpad, soit un scroll pourtant
  // volontaire ne faisait rien ("il faut forcer"). Un carrousel autonome,
  // indépendant du scroll de la page, élimine ce compromis.
  var POLES_AUTOPLAY_MS = 3500;
  var polesCarousel = document.getElementById('poles-carousel');
  var polesTrack = document.getElementById('poles-carousel-track');
  if (polesCarousel && polesTrack) {
    var poleDots = Array.prototype.slice.call(document.querySelectorAll('.poles-carousel-dot'));
    var polePanels = Array.prototype.slice.call(polesTrack.querySelectorAll('.pole'));
    var polePrevBtn = polesCarousel.querySelector('.poles-carousel-arrow--prev');
    var poleNextBtn = polesCarousel.querySelector('.poles-carousel-arrow--next');
    var currentPoleIndex = 0;

    function applyPoleIndex(index) {
      polePanels.forEach(function (p, i) {
        p.style.transform = 'translateX(' + (i < index ? -100 : (i > index ? 100 : 0)) + '%)';
      });
      poleDots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-current', String(i === index));
      });
    }
    applyPoleIndex(currentPoleIndex);

    if (polePanels.length > 1) {
      function goToPole(index) {
        currentPoleIndex = (index + polePanels.length) % polePanels.length;
        applyPoleIndex(currentPoleIndex);
      }

      // Autoplay coupé si l'utilisateur préfère moins d'animation, si la
      // section n'est pas à l'écran (inutile de faire tourner un carrousel
      // que personne ne regarde), ou pendant un focus clavier dans la
      // section (le temps de cliquer sur un lien/une flèche sans que ça
      // change sous le focus).
      var polesAutoplayTimer = null;
      var polesIsIntersecting = false;
      var polesIsPaused = false;

      function startPolesAutoplay() {
        if (polesAutoplayTimer) return;
        polesAutoplayTimer = setInterval(function () { goToPole(currentPoleIndex + 1); }, POLES_AUTOPLAY_MS);
      }
      function stopPolesAutoplay() {
        if (polesAutoplayTimer) { clearInterval(polesAutoplayTimer); polesAutoplayTimer = null; }
      }
      function refreshPolesAutoplay() {
        if (!prefersReducedMotion && polesIsIntersecting && !polesIsPaused) startPolesAutoplay();
        else stopPolesAutoplay();
      }
      // toute navigation manuelle réarme le délai complet plutôt que de
      // laisser l'autoplay déclencher un changement juste après
      function restartPolesAutoplay() {
        stopPolesAutoplay();
        refreshPolesAutoplay();
      }

      if (!prefersReducedMotion) {
        var polesObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            polesIsIntersecting = entry.isIntersecting;
            refreshPolesAutoplay();
          });
        }, { threshold: 0.4 });
        polesObserver.observe(polesCarousel);

        // pause au survol souris (demandé explicitement) et au focus clavier
        // (accessibilité : on peut interagir avec les liens/flèches sans que
        // le contenu change sous le focus).
        polesCarousel.addEventListener('mouseenter', function () { polesIsPaused = true; refreshPolesAutoplay(); });
        polesCarousel.addEventListener('mouseleave', function () { polesIsPaused = false; refreshPolesAutoplay(); });
        polesCarousel.addEventListener('focusin', function () { polesIsPaused = true; refreshPolesAutoplay(); });
        polesCarousel.addEventListener('focusout', function () { polesIsPaused = false; refreshPolesAutoplay(); });
      }

      // Un clic laisse le bouton focus (comportement normal du navigateur),
      // ce qui déclencherait la pause au focus clavier ci-dessus pour de bon
      // (rien ne la lève tant qu'on ne retire pas le focus) : on le retire
      // nous-mêmes juste après le clic pour ne pas figer l'autoplay en
      // permanence après une simple interaction souris, tout en gardant la
      // pause pour la vraie navigation au clavier (Tab).
      if (polePrevBtn) {
        polePrevBtn.addEventListener('click', function () {
          goToPole(currentPoleIndex - 1);
          restartPolesAutoplay();
          polePrevBtn.blur();
        });
      }
      if (poleNextBtn) {
        poleNextBtn.addEventListener('click', function () {
          goToPole(currentPoleIndex + 1);
          restartPolesAutoplay();
          poleNextBtn.blur();
        });
      }
      poleDots.forEach(function (dot, i) {
        dot.addEventListener('click', function () {
          goToPole(i);
          restartPolesAutoplay();
          dot.blur();
        });
      });
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

    var hoverTargets = 'a, button, .btn, .fleet__card, .why__item, .poles-carousel-dot, .poles-carousel-arrow';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hovering');
    });
  }
})();
