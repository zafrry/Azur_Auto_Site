(function () {
  'use strict';

  // -------------------- newsletter : composant centralisé --------------------
  // Même section (kicker, titre, sous-titre, formulaire) reprise à l'identique
  // sur toutes les pages : plutôt que de dupliquer ce bloc dans chaque fichier
  // HTML, il est défini une seule fois ici et injecté en fin de <main>. Posé
  // en tout premier dans ce script (qui s'exécute en synchrone, <script> placé
  // juste avant </body>) pour que le nœud existe déjà dans le DOM avant que
  // le reste du fichier n'interroge [data-reveal] (animation d'apparition) et
  // .newsletter-form (suivi de conversion) plus bas. Exclue des pages portant
  // data-no-newsletter sur <body> (mentions-legales.html : page légale, hors
  // périmètre d'un formulaire d'inscription marketing).
  var newsletterHost = document.querySelector('main');
  if (newsletterHost && !document.body.hasAttribute('data-no-newsletter')) {
    var newsletterSlug = (location.pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()) || 'home';
    var newsletterEmailId = 'newsletter-email-' + newsletterSlug;
    var newsletterSection = document.createElement('section');
    newsletterSection.className = 'newsletter page-section page-section--dark';
    newsletterSection.setAttribute('data-reveal', '');
    newsletterSection.setAttribute('data-reveal-variant', 'fade-up');
    newsletterSection.innerHTML =
      '<div class="section-inner section-inner--narrow">' +
        '<div class="section-head">' +
          '<div class="kicker kicker--gray">Newsletter</div>' +
          '<h2 class="section-title section-title--light">Recevez nos actualités</h2>' +
          '<p class="contact__subtitle">Import, location, detailing : les nouveautés Azur Auto directement dans votre boîte mail.</p>' +
        '</div>' +
        '<form class="newsletter-form">' +
          '<div class="form-group">' +
            '<label for="' + newsletterEmailId + '">Email</label>' +
            '<input type="email" id="' + newsletterEmailId + '" name="email" placeholder="vous@exemple.com" required>' +
          '</div>' +
          '<button type="submit" class="btn btn--outline-gold">S\'inscrire</button>' +
        '</form>' +
      '</div>';
    newsletterHost.appendChild(newsletterSection);
  }

  // -------------------- Calendly : chargement paresseux du widget (performance) --------------------
  // Le script officiel Calendly (widget.js) charge un iframe assez lourd (polices,
  // JS de leur propre application) ; le poser en dur sur chaque page payait ce
  // coût à chaque chargement, même pour les visiteurs qui ne descendent jamais
  // jusqu'à la section de prise de RDV. On ne charge donc widget.js que lorsque
  // le conteneur .calendly-inline-widget approche du viewport (rootMargin
  // avant qu'il soit visible, pour qu'il soit prêt au moment où on l'atteint).
  // Calendly scanne le DOM à son chargement pour initialiser tout élément
  // .calendly-inline-widget déjà présent : retarder uniquement le script,
  // sans toucher au marquage HTML (déjà dans le DOM), suffit.
  var calendlyWidgets = document.querySelectorAll('.calendly-inline-widget');
  if (calendlyWidgets.length) {
    var calendlyScriptLoaded = false;
    function loadCalendlyScript() {
      if (calendlyScriptLoaded) return;
      calendlyScriptLoaded = true;
      var script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
    if ('IntersectionObserver' in window) {
      var calendlyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadCalendlyScript();
            calendlyObserver.disconnect();
          }
        });
      }, { rootMargin: '600px 0px' });
      calendlyWidgets.forEach(function (el) { calendlyObserver.observe(el); });
    } else {
      // repli pour les navigateurs très anciens sans IntersectionObserver
      loadCalendlyScript();
    }
  }

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

  // -------------------- Phase 5 du document de finalisation : événements dataLayer (GTM) --------------------
  // GTM lui-même est un placeholder (voir <head>, ID GTM-XXXXXXX à remplacer) mais
  // window.dataLayer existe déjà (posé par le snippet GTM) : on peut pousser ces
  // événements dès maintenant, ils remonteront dans le conteneur réel une fois créé.
  window.dataLayer = window.dataLayer || [];

  // clics sur les CTA des 3 pôles (accueil, carrousel mobile ou grille desktop/tablette)
  document.querySelectorAll('[data-gtm-cta="pole"]').forEach(function (el) {
    el.addEventListener('click', function () {
      window.dataLayer.push({ event: 'pole_cta_click', pole_label: el.getAttribute('data-gtm-pole') || '' });
    });
  });

  // clics sur le CTA d'entrée vers la prise de RDV/réservation (Prestige Rent,
  // Detailing Studio, Club) — pointe aujourd'hui vers le formulaire existant,
  // vers le widget Cal.com une fois la Phase 8 mise en place, sans changement ici
  document.querySelectorAll('[data-gtm-cta="rdv"]').forEach(function (el) {
    el.addEventListener('click', function () {
      window.dataLayer.push({ event: 'rdv_widget_click', page: el.getAttribute('data-gtm-page') || '' });
    });
  });

  // clic sur le bouton WhatsApp flottant (présent sur les 7 pages principales)
  var whatsappFloat = document.querySelector('.whatsapp-float');
  if (whatsappFloat) {
    whatsappFloat.addEventListener('click', function () {
      window.dataLayer.push({ event: 'whatsapp_click' });
    });
  }

  // inscription newsletter : suivi de conversion, un seul écouteur centralisé
  // pour les formulaires .newsletter-form posés sur toutes les pages
  document.querySelectorAll('.newsletter-form').forEach(function (form) {
    form.addEventListener('submit', function () {
      window.dataLayer.push({ event: 'newsletter_submit' });
    });
  });

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

  // -------------------- Prestige Rent : onglets destinations --------------------
  var destinationsTabs = document.querySelector('.destinations-tabs');
  if (destinationsTabs) {
    var destTabButtons = destinationsTabs.querySelectorAll('.destinations-tabs__btn');
    destTabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-active')) return;
        destTabButtons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
          b.setAttribute('tabindex', '-1');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        btn.setAttribute('tabindex', '0');

        destinationsTabs.querySelectorAll('.destinations-tabs__panel').forEach(function (panel) {
          var isTarget = panel.id === btn.getAttribute('aria-controls');
          panel.hidden = !isTarget;
          panel.classList.toggle('is-active', isTarget);
        });
      });
    });

    // carrousel manuel (flèches) pour les onglets à plus de 4 destinations
    destinationsTabs.querySelectorAll('.destinations-tabs__grid').forEach(function (grid) {
      if (grid.children.length <= 4) return;
      grid.classList.add('is-carousel');

      var wrap = document.createElement('div');
      wrap.className = 'destinations-tabs__carousel';
      grid.parentNode.insertBefore(wrap, grid);
      wrap.appendChild(grid);

      ['prev', 'next'].forEach(function (dir) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'destinations-tabs__arrow destinations-tabs__arrow--' + dir;
        btn.setAttribute('aria-label', dir === 'prev' ? 'Destination précédente' : 'Destination suivante');
        btn.innerHTML = dir === 'prev' ? '&#8249;' : '&#8250;';
        btn.addEventListener('click', function () {
          var card = grid.querySelector(':scope > div');
          if (!card) return;
          var gap = parseFloat(getComputedStyle(grid).columnGap) || 20;
          var step = card.getBoundingClientRect().width + gap;
          grid.scrollBy({ left: dir === 'prev' ? -step : step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
        wrap.appendChild(btn);
      });
    });
  }

  // -------------------- Detailing Studio : curseur avant/après --------------------
  document.querySelectorAll('.before-after__pair[data-compare]').forEach(function (pair) {
    function setPos(percent) {
      var clamped = Math.min(100, Math.max(0, percent));
      pair.style.setProperty('--pos', clamped + '%');
      pair.setAttribute('aria-valuenow', Math.round(clamped));
    }
    function percentFromClientX(clientX) {
      var rect = pair.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    // en version web (souris), le curseur suit le survol directement, sans
    // clic ni maintien. Au tactile (pas de "survol"), il faut faire glisser
    // le doigt : on garde donc le clic/maintien pour pointerType 'touch'/'pen'.
    var dragging = false;
    pair.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      dragging = true;
      if (pair.setPointerCapture) pair.setPointerCapture(e.pointerId);
      setPos(percentFromClientX(e.clientX));
    });
    pair.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') {
        setPos(percentFromClientX(e.clientX));
        return;
      }
      if (!dragging) return;
      setPos(percentFromClientX(e.clientX));
    });
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      pair.addEventListener(evt, function () { dragging = false; });
    });

    // secours tactile (certains navigateurs/versions ne remontent pas les
    // events pointer depuis un touch) : mêmes gestes en touchstart/move.
    pair.addEventListener('touchstart', function (e) {
      dragging = true;
      setPos(percentFromClientX(e.touches[0].clientX));
    }, { passive: true });
    pair.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      setPos(percentFromClientX(e.touches[0].clientX));
    }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (evt) {
      pair.addEventListener(evt, function () { dragging = false; });
    });
    pair.addEventListener('keydown', function (e) {
      var current = parseFloat(pair.style.getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') { setPos(current - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(current + 5); e.preventDefault(); }
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

  // -------------------- sous-navigation : masquée au scroll vers le bas --------------------
  // le header fixe + la sous-navigation sticky empilés grignotent une hauteur
  // importante au-dessus du contenu (ex. carrousel "Trois métiers" juste
  // après) ; masquer la sous-nav dès qu'on scrolle vers le bas ne laisse plus
  // que le header, et la faire réapparaître au premier scroll vers le haut
  // la garde accessible sans revenir tout en haut de la page.
  var subnavEl = document.querySelector('.subnav');
  if (subnavEl) {
    // capturé une seule fois, avant que l'élément ne devienne "stuck" : une
    // fois épinglé par position:sticky, offsetTop suit la position de scroll
    // au lieu de rester sa position d'origine dans le flux (comportement de
    // Chromium), donc le relire à chaque scroll casserait la comparaison.
    var subnavFlowOffsetTop = subnavEl.offsetTop;
    var subnavLastY = window.scrollY;
    var subnavTicking = false;
    function updateSubnavVisibility() {
      var currentY = window.scrollY;
      if (currentY > subnavLastY && currentY > subnavFlowOffsetTop) {
        subnavEl.classList.add('is-hidden');
      } else {
        subnavEl.classList.remove('is-hidden');
      }
      subnavLastY = currentY;
      subnavTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!subnavTicking) {
        requestAnimationFrame(updateSubnavVisibility);
        subnavTicking = true;
      }
    }, { passive: true });
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
  // 6s plutôt que 3.5s : chaque panel a un titre + un paragraphe de
  // description à lire, 3.5s ne laissait pas le temps de les lire
  // confortablement avant que ça ne défile déjà. 5-7s est la fourchette
  // généralement recommandée pour un carrousel avec du texte à lire (contre
  // 3-4s pour de simples visuels sans texte).
  //
  // Phase 3 du document de finalisation : ce carrousel ne reste actif qu'en
  // mobile (<=600px, voir styles.css) — tablette et desktop affichent
  // désormais les 3 métiers simultanément dans une grille statique, sans
  // navigation à piloter. On vérifie donc la largeur d'écran une seule fois
  // au chargement avant d'initialiser toute la logique ci-dessous plutôt que
  // de la réécrire : pas d'écouteur resize pour rebasculer dynamiquement
  // entre grille et carrousel en direct, un changement d'orientation/largeur
  // qui traverserait le seuil resterait sur le mode déterminé au chargement
  // jusqu'au prochain rechargement de la page.
  var POLES_AUTOPLAY_MS = 6000;
  var polesCarousel = document.getElementById('poles-carousel');
  var polesTrack = document.getElementById('poles-carousel-track');
  if (polesCarousel && polesTrack && window.matchMedia('(max-width: 600px)').matches) {
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

        // pause au focus clavier seulement (accessibilité : on peut
        // interagir avec les liens/flèches sans que le contenu change sous
        // le focus). Pas de pause au survol souris : demandé explicitement.
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

  // -------------------- club : carte membre, légère rotation au scroll --------------------
  var clubCard = document.getElementById('club-teaser-card');
  if (clubCard && clubSection && !prefersReducedMotion) {
    var clubCardTicking = false;
    function updateClubCardParallax() {
      var rect = clubSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        progress = Math.min(1, Math.max(0, progress));
        var rotate = -6 + progress * 4;
        clubCard.style.transform = 'translateY(' + (rect.top * -0.05) + 'px) rotate(' + rotate + 'deg)';
      }
      clubCardTicking = false;
    }
    updateClubCardParallax();
    window.addEventListener('scroll', function () {
      if (!clubCardTicking) {
        requestAnimationFrame(updateClubCardParallax);
        clubCardTicking = true;
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
