/*
 * NB : le <header>/<nav> et le <footer> de chaque page sont générés depuis une
 * source unique (partials/header.html, partials/footer.html) par
 * scripts/sync-partials.js — ne pas les éditer inline dans les fichiers HTML,
 * ils seraient écrasés au prochain sync. Voir scripts/README.md.
 */
(function () {
  'use strict';

  // -------------------- services tiers soumis à consentement (RGPD) --------------------
  // 3 services sont conditionnés au consentement Tarteaucitron (voir
  // tarteaucitron-config.js, chargé juste avant ce fichier) : chaque prochaine
  // intégration tierce (ex. pixel Meta) doit suivre le même schéma —
  // déclarer un service dans tarteaucitron-config.js, puis soit laisser
  // Tarteaucitron charger le script lui-même (cas simple), soit, comme ici,
  // garder un chargement paresseux existant et le conditionner en plus au
  // consentement (cas où la performance impose de ne charger qu'au scroll).
  //   - gtmazur       (catégorie "analytic") : Google Tag Manager, chargé
  //     par tarteaucitron-config.js lui-même, rien à faire ici.
  //   - calendly      (catégorie "other") : widget de prise de rendez-vous,
  //     voir loadCalendlyScript() plus bas — lazy-load au scroll ET
  //     consentement requis ; message de repli avec coordonnées directes si
  //     refusé, jamais de blocage total de la prise de contact.
  //   - recaptchaazur (catégorie "api") : protection anti-spam du
  //     formulaire newsletter, voir loadRecaptchaScript() plus bas —
  //     lazy-load au scroll ET consentement requis ; si refusé, le
  //     formulaire reste utilisable sans protection anti-spam (le
  //     reCAPTCHA protège Brevo, pas le visiteur, la friction ne doit pas
  //     retomber sur lui).

  // -------------------- newsletter : composant centralisé --------------------
  // Même section (kicker, titre, sous-titre, champ email, bouton d'inscription)
  // reprise strictement à l'identique sur toutes les pages, id du champ email
  // compris : rien ne varie plus par page. Plutôt que de dupliquer ce bloc
  // dans chaque fichier HTML, il est défini une seule fois ici et injecté en
  // fin de <main>. L'id fixe ne pose pas de risque de collision : chaque page
  // est un document séparé, l'unicité d'un id s'apprécie par document, pas
  // site-wide. Posé en tout premier dans ce script (qui s'exécute en
  // synchrone, <script> placé juste avant </body>) pour que le nœud existe
  // déjà dans le DOM avant que le reste du fichier n'interroge [data-reveal]
  // (animation d'apparition) et .newsletter-form (suivi de conversion) plus
  // bas. Exclue des pages portant data-no-newsletter sur <body>
  // (mentions-legales.html : page légale, hors périmètre d'un formulaire
  // d'inscription marketing).
  // Le formulaire poste réellement vers Brevo (action + name="EMAIL" + les 3
  // champs cachés requis par leur snippet officiel), mais reprend le design
  // du site plutôt que le widget Brevo tel quel (fond clair, police
  // Helvetica) : les deux ne s'accordaient pas avec le thème sombre du site,
  // et le kicker/titre/sous-titre étaient déjà couverts par cette section.
  var newsletterHost = document.querySelector('main');
  if (newsletterHost && !document.body.hasAttribute('data-no-newsletter')) {
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
        '<form class="newsletter-form" method="POST" action="https://3aa7ac24.sibforms.com/serve/MUIFAMUemiI1KZUBjmvXV06kgkeCZDJRv9qryRZ8PR3CmR-iD5xrd8o35L8FACPxq7r3yseyPesH6GRNHbO-brqu2LY_7vMIhrXJ1_RSOuKkFlg1ZAa3Ko3s9QULVp3CaotHzCBjCtDvGzOTRfMJNgr8_aodZuYPkbc7Hp-5v5dX9ub2ggmpBfrIirZXC3pnzGYgR9ozDWca_AGtMw==">' +
          '<div class="form-group">' +
            '<label for="newsletter-email">Email</label>' +
            '<input type="email" id="newsletter-email" name="EMAIL" placeholder="vous@exemple.com" required>' +
          '</div>' +
          '<div class="newsletter-recaptcha">' +
            '<div class="g-recaptcha" data-sitekey="6LctEmAtAAAAAAyqHQac1WjeTzmL29ApoevQYm0Q"></div>' +
          '</div>' +
          '<button type="submit" class="btn btn--outline-gold">S\'inscrire</button>' +
          '<input type="text" name="email_address_check" value="" style="display:none" tabindex="-1" autocomplete="off">' +
          '<input type="hidden" name="locale" value="fr">' +
          '<input type="hidden" name="html_type" value="simple">' +
        '</form>' +
      '</div>';
    newsletterHost.appendChild(newsletterSection);

    // reCAPTCHA (protection anti-spam Brevo) : même logique de chargement
    // paresseux que le widget Calendly plus bas dans ce fichier — le script
    // Google (recaptcha/api.js) ne se charge que lorsque la section
    // newsletter approche du viewport, pour ne pas payer son coût sur
    // chaque page alors qu'une partie des visiteurs ne scrolle jamais
    // jusqu'en bas. Conditionné en plus au consentement RGPD (catégorie
    // "recaptchaazur", voir tarteaucitron-config.js) : si refusé, on ne
    // charge simplement pas le script et le formulaire reste utilisable
    // sans protection anti-spam — le reCAPTCHA protège Brevo contre le
    // spam, pas le visiteur, la friction n'a pas à retomber sur lui.
    var recaptchaScriptLoaded = false;
    var recaptchaInViewport = false;
    function hasRecaptchaConsent() {
      return typeof tarteaucitron !== 'undefined' && tarteaucitron.state && tarteaucitron.state.recaptchaazur === true;
    }
    function loadRecaptchaScript() {
      if (recaptchaScriptLoaded || !recaptchaInViewport || !hasRecaptchaConsent()) return;
      // garde supplémentaire au niveau du DOM, voir le commentaire équivalent
      // dans loadCalendlyScript() : l'évènement de consentement et
      // l'IntersectionObserver peuvent chacun redéclencher cette fonction.
      if (document.querySelector('script[src="https://www.google.com/recaptcha/api.js"]')) {
        recaptchaScriptLoaded = true;
        return;
      }
      recaptchaScriptLoaded = true;
      var script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    document.addEventListener('recaptchaazur_allowed', loadRecaptchaScript);
    if ('IntersectionObserver' in window) {
      var recaptchaObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            recaptchaInViewport = true;
            loadRecaptchaScript();
            recaptchaObserver.disconnect();
          }
        });
      }, { rootMargin: '600px 0px' });
      recaptchaObserver.observe(newsletterSection);
    } else {
      recaptchaInViewport = true;
      loadRecaptchaScript();
    }
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
  // Conditionné en plus au consentement RGPD (catégorie "calendly", voir
  // tarteaucitron-config.js) : si refusé, chaque widget est remplacé par un
  // message de repli + les coordonnées directes (téléphone/WhatsApp), pour
  // ne jamais bloquer complètement la prise de contact.
  var calendlyWidgets = document.querySelectorAll('.calendly-inline-widget');
  if (calendlyWidgets.length) {
    var calendlyScriptLoaded = false;
    var calendlyInViewport = false;
    var calendlyConsentPolls = 0;
    // état du consentement Calendly : true = accepté, false = refusé,
    // undefined = pas encore décidé (bannière encore ouverte).
    function calendlyConsentState() {
      if (typeof tarteaucitron === 'undefined' || !tarteaucitron.state) return undefined;
      return tarteaucitron.state.calendly;
    }
    function showCalendlyFallback() {
      calendlyWidgets.forEach(function (el) {
        if (el.hasAttribute('data-tac-fallback-shown')) return;
        el.setAttribute('data-tac-fallback-shown', '1');
        el.style.display = 'none';
        var fallback = document.createElement('div');
        fallback.className = 'calendly-consent-fallback';
        fallback.innerHTML =
          '<p>La prise de rendez-vous en ligne nécessite l’acceptation des cookies tiers Calendly.</p>' +
          '<div class="btn-group">' +
            '<button type="button" class="btn btn--outline-gold tac-manage-cookies">Gérer mes cookies</button>' +
            '<a href="tel:+33442862517" class="btn btn--primary">+33 4 42 86 25 17</a>' +
            '<a href="https://wa.me/message/52FBS44XYKP5H1" class="btn btn--whatsapp">WhatsApp</a>' +
          '</div>';
        el.insertAdjacentElement('afterend', fallback);
      });
    }
    function hideCalendlyFallback() {
      document.querySelectorAll('.calendly-consent-fallback').forEach(function (el) { el.remove(); });
      calendlyWidgets.forEach(function (el) {
        el.style.display = '';
        el.removeAttribute('data-tac-fallback-shown');
      });
    }
    function loadCalendlyScript() {
      if (!calendlyInViewport) return;
      var consent = calendlyConsentState();
      if (consent === false) {
        // refus explicite -> message de repli + coordonnées directes
        showCalendlyFallback();
        return;
      }
      if (consent !== true) {
        // décision inconnue à cet instant. Deux cas indistinguables ici :
        //  - tarteaucitron n'a pas encore fini de lire le cookie (init async) :
        //    on re-teste quelques fois, le temps qu'un éventuel choix déjà
        //    stocké soit appliqué (un REFUS stocké ne ré-émet AUCUN événement,
        //    contrairement à une acceptation, d'où ce poll borné) ;
        //  - le visiteur n'a tout simplement pas encore répondu à la bannière :
        //    on attend alors son clic (événements calendly_allowed/_disallowed).
        // Surtout : ne PAS afficher le repli tant que la décision est en attente,
        // sinon le message "acceptez les cookies" remplace le calendrier avant
        // même que le visiteur ait répondu (visible sur Contact, widget haut
        // dans la page donc dans le viewport dès le chargement).
        if (calendlyConsentPolls < 15) { // ~3 s max (15 × 200 ms), couvre l'init
          calendlyConsentPolls++;
          setTimeout(loadCalendlyScript, 200);
        }
        return;
      }
      if (calendlyScriptLoaded) return;
      // consentement accordé -> charger le widget. Garde anti double-injection :
      // calendly_allowed et l'IntersectionObserver peuvent déclencher cette
      // fonction à quelques instants d'écart.
      if (document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
        calendlyScriptLoaded = true;
        hideCalendlyFallback();
        return;
      }
      calendlyScriptLoaded = true;
      hideCalendlyFallback();
      var script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    }
    document.addEventListener('calendly_allowed', loadCalendlyScript);
    document.addEventListener('calendly_disallowed', function () {
      if (calendlyInViewport) showCalendlyFallback();
    });
    if ('IntersectionObserver' in window) {
      var calendlyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            calendlyInViewport = true;
            loadCalendlyScript();
            calendlyObserver.disconnect();
          }
        });
      }, { rootMargin: '600px 0px' });
      calendlyWidgets.forEach(function (el) { calendlyObserver.observe(el); });
    } else {
      // repli pour les navigateurs très anciens sans IntersectionObserver
      calendlyInViewport = true;
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

  // -------------------- parallax : un seul listener scroll partagé (performance) --------------------
  // Les effets de parallax (hero, pôles, fond Club, carte Club) s'enregistrent
  // dans parallaxUpdaters ; un unique listener scroll passif + un unique rAF les
  // met tous à jour ensemble (pattern "ticking" mutualisé), au lieu de 4 couples
  // listener/rAF concurrents. Chaque effet ne s'enregistre que s'il est présent
  // sur la page ET si prefers-reduced-motion n'est pas actif (le respect de
  // cette préférence reste géré individuellement à chaque enregistrement plus bas).
  var parallaxUpdaters = [];
  var parallaxTicking = false;
  function runParallaxUpdaters() {
    for (var i = 0; i < parallaxUpdaters.length; i++) parallaxUpdaters[i]();
    parallaxTicking = false;
  }
  function onParallaxScroll() {
    if (!parallaxTicking) {
      parallaxTicking = true;
      requestAnimationFrame(runParallaxUpdaters);
    }
  }
  window.addEventListener('scroll', onParallaxScroll, { passive: true });

  if (hero) {
    requestAnimationFrame(function () { hero.classList.add('is-loaded'); });

    if (heroImg && !prefersReducedMotion) {
      parallaxUpdaters.push(function () {
        var offset = window.scrollY;
        if (offset < hero.offsetHeight) {
          heroImg.style.transform = 'translateY(' + (offset * 0.4) + 'px)';
        }
      });
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
      function updatePoleParallax() {
        poles.forEach(function (p, i) {
          var bg = poleBgs[i];
          if (!bg) return;
          var rect = p.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            bg.style.transform = 'translateY(' + (rect.top * -0.1) + 'px)';
          }
        });
      }
      updatePoleParallax();
      parallaxUpdaters.push(updatePoleParallax);
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

  // -------------------- bouton WhatsApp flottant : masqué tant que le hero ou le footer sont visibles --------------------
  // Masqué sur le hero : évite le chevauchement avec le CTA "Appeler / WhatsApp"
  // du hero et la barre de réassurance juste en dessous, surtout marqué sur les
  // petits viewports (hauteur courte). Masqué sur le footer : le bouton fixe
  // chevauchait sinon la ligne de bas de page (mentions légales, crédit) une
  // fois cette dernière resserrée — le footer affiche déjà son propre bouton
  // WhatsApp juste au-dessus, la version flottante y est redondante.
  var whatsappFloat = document.querySelector('.whatsapp-float');
  var siteFooterEl = document.querySelector('.site-footer');
  if (whatsappFloat && (hero || siteFooterEl)) {
    var heroIntersecting = false;
    var footerIntersecting = false;
    function updateWhatsappFloatVisibility() {
      whatsappFloat.classList.toggle('is-hidden', heroIntersecting || footerIntersecting);
    }
    if (hero) {
      var whatsappHeroObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          heroIntersecting = entry.isIntersecting;
          updateWhatsappFloatVisibility();
        });
      });
      whatsappHeroObserver.observe(hero);
    }
    if (siteFooterEl) {
      var whatsappFooterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          footerIntersecting = entry.isIntersecting;
          updateWhatsappFloatVisibility();
        });
      });
      whatsappFooterObserver.observe(siteFooterEl);
    }
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
    function updateClubParallax() {
      var rect = clubSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        clubBg.style.transform = 'translateY(' + (rect.top * -0.15) + 'px)';
      }
    }
    updateClubParallax();
    parallaxUpdaters.push(updateClubParallax);
  }

  // -------------------- club : carte membre, légère rotation au scroll --------------------
  var clubCard = document.getElementById('club-teaser-card');
  if (clubCard && clubSection && !prefersReducedMotion) {
    function updateClubCardParallax() {
      var rect = clubSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        progress = Math.min(1, Math.max(0, progress));
        var rotate = -6 + progress * 4;
        clubCard.style.transform = 'translateY(' + (rect.top * -0.05) + 'px) rotate(' + rotate + 'deg)';
      }
    }
    updateClubCardParallax();
    parallaxUpdaters.push(updateClubCardParallax);
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
