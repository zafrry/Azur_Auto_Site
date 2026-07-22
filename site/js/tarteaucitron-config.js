/* -------------------------------------------------------------------------
   Tarteaucitron.js : configuration + déclaration des 3 services soumis à
   consentement sur ce site (voir aussi le commentaire en tête de main.js
   qui documente la liste et sert de modèle pour toute prochaine intégration
   tierce) :
     1. gtmazur       (catégorie "analytic" / mesure d'audience) — reprend
        tel quel le snippet Google Tag Manager existant (GTM-XXXXXXX),
        simplement encapsulé dans un service Tarteaucitron plutôt que chargé
        en dur : un seul GTM, conditionné, pas un second ajouté.
     2. calendly       (catégorie "other" / contenus tiers) — pas de
        connecteur natif Tarteaucitron pour Calendly, déclaré en service
        personnalisé. Son "js" ne fait rien directement : le chargement réel
        de widget.js reste piloté par main.js (lazy-load existant au scroll),
        qui vérifie ce consentement avant d'agir. Ce service sert seulement
        à faire apparaître "Calendly" comme catégorie choisissable dans le
        panneau, et à émettre l'évènement "calendly_allowed" que main.js
        écoute.
     3. recaptchaazur  (catégorie "api", même catégorie que le connecteur
        natif "recaptcha" de Tarteaucitron — non réutilisé tel quel car il
        charge le script immédiatement au consentement, alors que main.js a
        déjà son propre lazy-load au scroll qu'on veut conserver). Même
        principe que Calendly : "js" ne fait rien, main.js écoute
        "recaptchaazur_allowed".
   ---------------------------------------------------------------------- */
(function () {
  'use strict';

  if (typeof tarteaucitron === 'undefined') { return; }

  // Les pages du blog sont un niveau plus profond (site/blog/...) : les
  // liens vers mentions-legales.html doivent donc remonter d'un cran.
  var pathPrefix = location.pathname.indexOf('/blog/') !== -1 ? '../' : './';

  tarteaucitron.init({
    "privacyUrl": pathPrefix + "mentions-legales.html#cookies",
    "hashtag": "#tarteaucitron",
    "cookieName": "tarteaucitron",
    "orientation": "middle",
    "showAlertSmall": false,
    "cookieslist": true,
    "adblocker": false,
    "DenyAllCta": true,
    "AcceptAllCta": true,
    "highPrivacy": true,
    "alwaysNeedConsent": false,
    "handleBrowserDNTRequest": false,
    "removeCredit": true,
    "moreInfoLink": true,
    "useExternalCss": false,
    "readmoreLink": pathPrefix + "mentions-legales.html#cookies",
    "mandatory": true,
    "mandatoryCta": true,
    "groupServices": false,
    "bodyPosition": "bottom"
  });

  tarteaucitron.services.gtmazur = {
    "key": "gtmazur",
    "type": "analytic",
    "name": "Google Tag Manager",
    "uri": "https://policies.google.com/privacy",
    "needConsent": true,
    "cookies": ["_ga", "_gat", "_gid"],
    "js": function () {
      "use strict";
      (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
      })(window, document, 'script', 'dataLayer', 'GTM-XXXXXXX');
    }
  };

  tarteaucitron.services.calendly = {
    "key": "calendly",
    "type": "other",
    "name": "Calendly (prise de rendez-vous)",
    "uri": "https://calendly.com/privacy",
    "needConsent": true,
    "cookies": [],
    "js": function () { /* voir commentaire en tête de fichier : géré par main.js */ }
  };

  tarteaucitron.services.recaptchaazur = {
    "key": "recaptchaazur",
    "type": "api",
    "name": "reCAPTCHA (formulaire newsletter)",
    "uri": "https://policies.google.com/privacy",
    "needConsent": true,
    "cookies": ["nid"],
    "js": function () { /* voir commentaire en tête de fichier : géré par main.js */ }
  };

  tarteaucitron.job = tarteaucitron.job || [];
  tarteaucitron.job.push('gtmazur');
  tarteaucitron.job.push('calendly');
  tarteaucitron.job.push('recaptchaazur');

  // Lien "Gérer mes cookies" du footer (toutes pages) : rouvre le panneau
  // de préférences à tout moment, sans attendre un futur passage du
  // bandeau initial. Délégué sur document (plutôt que lié élément par
  // élément) car main.js insère aussi ce même bouton dynamiquement dans le
  // message de repli du widget Calendly, après ce script.
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('.tac-manage-cookies') : null;
    if (!trigger) return;
    e.preventDefault();
    tarteaucitron.userInterface.openPanel();
  });
})();
