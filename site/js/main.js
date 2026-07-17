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

  // -------------------- "Trois métiers" : section épinglée, entrée gauche -> droite --------------------
  // La section reste épinglée (position: sticky sur .poles-scroll-wrap) tant
  // que le "rail" vertical (.poles-scroll-track) n'est pas entièrement
  // parcouru. Impossible de la traverser sans voir les 3 panels, quel que
  // soit le moyen de scroll (molette, trackpad, clavier, barre de
  // défilement, tactile) puisque tout passe par le scroll normal de la page
  // plutôt que par un ruban scrollable indépendant. Le rail n'ajoute qu'un
  // petit pas de scroll par panel (POLE_STEP_PX, pas 100vh par panel) : un
  // seul mouvement de molette/trackpad suffit à franchir le seuil et faire
  // entrer le panel suivant depuis la gauche, en douceur et lentement.
  var POLE_STEP_PX = 140;
  var polesTrack = document.getElementById('poles-scroll-track');
  var polesScroll = document.getElementById('poles-scroll');
  if (polesTrack && polesScroll) {
    var poleDots = Array.prototype.slice.call(document.querySelectorAll('.poles-scroll-dot'));
    var polePanels = Array.prototype.slice.call(polesScroll.querySelectorAll('.pole'));

    function setActiveDot(index) {
      poleDots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
        dot.setAttribute('aria-current', String(i === index));
      });
    }

    if (!prefersReducedMotion && polePanels.length > 1) {
      var polesStepTotal = (polePanels.length - 1) * POLE_STEP_PX;
      polesTrack.style.height = 'calc(100vh + ' + polesStepTotal + 'px)';

      function getTrackScrollableDistance() {
        return polesTrack.offsetHeight - window.innerHeight;
      }

      // -1 : rien n'est encore entré en scène, les 3 panels attendent
      // hors-champ à gauche. Devient 0/1/2 une fois la section réellement
      // plein écran (voir updatePolesTransform), jamais avant — c'est ce qui
      // fait que le premier panel "entre" au lieu d'être déjà là au chargement.
      var currentPoleIndex = -1;
      var polesEverEngaged = false;

      function applyPoleIndex(index) {
        polePanels.forEach(function (p, i) {
          p.style.transform = 'translateX(' + (i < index ? 100 : (i > index ? -100 : 0)) + '%)';
        });
        if (index >= 0) setActiveDot(index);
      }
      applyPoleIndex(currentPoleIndex);

      function updatePolesTransform() {
        var scrollableDistance = getTrackScrollableDistance();
        if (scrollableDistance <= 0) return;
        var trackRect = polesTrack.getBoundingClientRect();

        if (!polesEverEngaged) {
          // ne se déclenche qu'au moment précis où la section devient
          // réellement plein écran (le rail se colle en haut du viewport) ;
          // marge de 1px car getBoundingClientRect() peut renvoyer une
          // valeur sous-pixel (ex. 0.17 au lieu de 0 pile)
          if (trackRect.top <= 1) {
            polesEverEngaged = true;
            var scrolledAtEntry = Math.min(Math.max(-trackRect.top, 0), scrollableDistance);
            // L'inertie d'un scroll normal dépasse fréquemment de peu le point
            // d'entrée avant que ce handler ne s'exécute (rAF) : sans garde,
            // ça arrondissait à l'index 1 et faisait sauter la première
            // slide. On force donc le panel 0 pour un léger dépassement.
            // Mais un très grand saut arrivé en un seul événement (ancre,
            // barre de scroll tirée directement loin dans le rail) n'aura
            // pas d'autre événement de scroll pour se corriger ensuite :
            // dans ce cas on respecte la position réellement atteinte plutôt
            // que de rester bloqué sur le panel 0 pour toujours.
            currentPoleIndex = scrolledAtEntry <= POLE_STEP_PX * 1.5
              ? 0
              : Math.min(polePanels.length - 1, Math.round(scrolledAtEntry / POLE_STEP_PX));
            applyPoleIndex(currentPoleIndex);
            // Si le geste qui vient de figer la section a encore de l'inertie
            // (molette/trackpad), ses prochains événements wheel seraient
            // sinon immédiatement traités comme un pas à part entière (plus
            // rien ne les bloque puisque currentPoleIndex n'est plus -1) et
            // feraient sauter à la slide suivante dans la foulée. On
            // applique donc le même verrou que pour un pas normal dès l'entrée.
            polesLockedUntil = Date.now() + POLES_LOCK_MS;
          }
          return;
        }

        // pas fixe par panel (POLE_STEP_PX) plutôt qu'une proportion du
        // scroll total : chaque transition demande le même petit effort de
        // scroll, la dernière n'est pas plus longue à atteindre que la première.
        // round (pas floor) : après un saut programmatique exact vers une
        // frontière de pas, une imprécision sous-pixel (ex. 139.83 au lieu
        // de 140) ne doit pas faire retomber sur l'index précédent.
        var scrolledSoFar = Math.min(Math.max(-trackRect.top, 0), scrollableDistance);
        var index = Math.min(polePanels.length - 1, Math.round(scrolledSoFar / POLE_STEP_PX));
        if (index !== currentPoleIndex) {
          currentPoleIndex = index;
          applyPoleIndex(index);
        }
      }

      var polesTicking = false;
      updatePolesTransform();
      window.addEventListener('scroll', function () {
        if (!polesTicking) {
          requestAnimationFrame(function () {
            updatePolesTransform();
            polesTicking = false;
          });
          polesTicking = true;
        }
      }, { passive: true });
      window.addEventListener('resize', updatePolesTransform, { passive: true });

      // Le scroll natif (molette/trackpad) avance en continu avec le scrollY :
      // un flick de trackpad avec inertie parcourt largement plus que
      // POLE_STEP_PX en un seul geste, ce qui faisait sauter plusieurs
      // panels d'un coup (voire sortir du rail direction "Sélection du
      // moment" sans jamais s'arrêter sur le dernier panel) et cassait la
      // transition douce (elle repartait de zéro à chaque frame de scroll).
      // Tant que le rail est engagé, on intercepte la molette : un seul
      // geste = un seul pas, animé par la transition CSS de chaque panel
      // (scrollTo instantané en interne, pas de scroll animé natif en plus,
      // pour ne pas cumuler deux animations différentes l'une sur l'autre).
      // Un flick de trackpad avec inertie envoie des dizaines d'événements
      // wheel étalés sur 1 à 2 secondes, avec des écarts irréguliers entre
      // événements (l'inertie ralentit progressivement, les derniers
      // événements peuvent être espacés de bien plus de 200ms alors que le
      // doigt n'a pourtant jamais quitté le trackpad). Une détection basée
      // sur "une pause de X ms = nouveau geste" s'est donc révélée trop
      // fragile : un simple ralentissement de l'inertie en cours de route
      // pouvait être pris pour un geste tout neuf et laisser passer un pas
      // supplémentaire (voire une sortie du rail), rendant le scroll
      // hypersensible malgré la protection.
      // On verrouille donc simplement TOUT événement wheel pendant une durée
      // fixe POLES_LOCK_MS après chaque pas — largement supérieure à la durée
      // de la transition (1.2s) et à l'inertie réelle d'un flick de trackpad
      // — plutôt que de deviner où s'arrête le geste. Un seul pas (avancer
      // d'un panel OU sortir du rail, jamais les deux) est autorisé par
      // fenêtre de verrouillage.
      var POLES_LOCK_MS = 2200;
      var polesLockedUntil = 0;
      polesTrack.addEventListener('wheel', function (e) {
        if (currentPoleIndex < 0) return; // pas encore plein écran : scroll normal
        var trackRect = polesTrack.getBoundingClientRect();
        if (trackRect.bottom <= 0 || trackRect.top >= window.innerHeight) return; // rail pas engagé
        var scrollableDistance = getTrackScrollableDistance();
        if (scrollableDistance <= 0) return;

        if (Date.now() < polesLockedUntil) {
          e.preventDefault(); // reste figé tant que la fenêtre de verrouillage n'est pas écoulée
          return;
        }

        var scrolledSoFar = Math.min(Math.max(-trackRect.top, 0), scrollableDistance);
        var scrollingDown = e.deltaY > 0;
        // marge de 2px : les mesures de getBoundingClientRect() peuvent être
        // sous-pixel (ex. 279.83 au lieu de 280), une comparaison stricte
        // >=/<= pouvait ne jamais reconnaître qu'on était réellement à la
        // frontière et bloquer indéfiniment la sortie du rail
        var atStart = scrolledSoFar <= 2;
        var atEnd = scrolledSoFar >= scrollableDistance - 2;
        if ((scrollingDown && atEnd) || (!scrollingDown && atStart)) return; // laisse sortir du rail normalement
        var nextIndex = Math.min(polePanels.length - 1, Math.max(0, currentPoleIndex + (scrollingDown ? 1 : -1)));
        // filet de sécurité : si le pas calculé ne change rien, ne jamais
        // verrouiller le scroll dans un cycle sans issue — on laisse sortir
        // normalement plutôt que de bloquer la page.
        if (nextIndex === currentPoleIndex) return;
        e.preventDefault();
        polesLockedUntil = Date.now() + POLES_LOCK_MS;
        var trackTop = trackRect.top + window.scrollY;
        window.scrollTo({ top: trackTop + nextIndex * POLE_STEP_PX, behavior: 'auto' });
      }, { passive: false });

      poleDots.forEach(function (dot, i) {
        dot.addEventListener('click', function () {
          var scrollableDistance = getTrackScrollableDistance();
          if (scrollableDistance <= 0) return;
          var targetProgress = i / (polePanels.length - 1);
          var trackTop = polesTrack.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: trackTop + targetProgress * scrollableDistance, behavior: 'smooth' });
        });
      });
    } else {
      // prefers-reduced-motion : panels empilés verticalement (voir CSS), les
      // points de navigation défilent simplement jusqu'au panel visé
      poleDots.forEach(function (dot, i) {
        dot.addEventListener('click', function () {
          var target = polePanels[i];
          if (target) target.scrollIntoView({ behavior: 'auto' });
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

    var hoverTargets = 'a, button, .btn, .fleet__card, .why__item, .poles-scroll-dot';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hovering');
    });
  }
})();
