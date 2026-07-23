#!/usr/bin/env node
'use strict';

/*
 * sync-partials.js — synchronise le header et le footer (identiques à la classe
 * .is-active près et au préfixe de chemin près) sur toutes les pages du site.
 *
 * POURQUOI : le <header> et le <footer> étaient dupliqués mot pour mot dans
 * 10 fichiers HTML (~460 lignes), source d'erreurs à chaque modification (c'est
 * ce qui avait laissé la page Care désynchronisée par le passé). Le site est
 * statique et servi tel quel par GitHub Pages (dossier site/), sans étape de
 * build : garder le HTML inline reste préférable pour le SEO (contenu présent
 * dans le HTML servi) et évite toute latence/FOUC d'un chargement fetch côté
 * client. Ce script tient donc lieu d'unique source de vérité : on édite
 * partials/header.html et partials/footer.html, puis on régénère les 10 pages.
 *
 * USAGE : node scripts/sync-partials.js   (à lancer avant chaque commit qui
 *         touche le header ou le footer — voir scripts/README.md)
 *
 * Les templates (partials/) portent des jetons remplacés par page :
 *   {{BASE}}              → './' (pages racine) ou '../' (pages du blog)
 *   {{BLOG_HREF}}         → lien vers le blog, relatif à l'emplacement de la page
 *   {{FOOTER_BOTTOM_LINK}}→ lien de bas de footer (Mentions légales, ou
 *                            "Retour à l'accueil" sur la page mentions-legales)
 * et la classe .is-active est ajoutée au lien de nav de la page courante.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const PARTIALS = path.join(ROOT, 'partials');

const headerTpl = fs.readFileSync(path.join(PARTIALS, 'header.html'), 'utf8').replace(/\s+$/, '');
const footerTpl = fs.readFileSync(path.join(PARTIALS, 'footer.html'), 'utf8').replace(/\s+$/, '');

// active : texte visible du lien de nav à marquer .is-active (null = aucun,
//          ex. l'accueil dont le logo pointe déjà vers lui, et mentions-legales)
// bottom : 'legal' (lien "Mentions légales") ou 'home' ("Retour à l'accueil",
//          utilisé sur la page mentions-legales pour ne pas s'auto-référencer)
const pages = [
  { file: 'index.html',                 base: './',  active: null,              bottom: 'legal' },
  { file: 'Import.html',                base: './',  active: 'Import',           bottom: 'legal' },
  { file: 'Prestige-Rent.html',         base: './',  active: 'Prestige Rent',    bottom: 'legal' },
  { file: 'Detailing-Studio.html',      base: './',  active: 'Detailing Studio', bottom: 'legal' },
  { file: 'Club.html',                  base: './',  active: 'Club',             bottom: 'legal' },
  { file: 'La-Vision.html',             base: './',  active: 'La Vision',        bottom: 'legal' },
  { file: 'Contact.html',               base: './',  active: 'Contact',          bottom: 'legal' },
  { file: 'mentions-legales.html',      base: './',  active: null,              bottom: 'home' },
  { file: 'blog/index.html',            base: '../', active: 'Blog',             bottom: 'legal' },
  { file: 'blog/article-template.html', base: '../', active: 'Blog',             bottom: 'legal' },
];

function buildHeader(page) {
  const blogHref = page.base === '../' ? './index.html' : './blog/index.html';
  let html = headerTpl
    .replace(/\{\{BLOG_HREF\}\}/g, blogHref)
    .replace(/\{\{BASE\}\}/g, page.base);
  if (page.active) {
    // n'affecte que le lien de nav desktop (les liens du menu mobile n'ont pas
    // la classe .site-header__link, ils ne matchent donc pas)
    const needle = `class="site-header__link">${page.active}</a>`;
    if (!html.includes(needle)) {
      throw new Error(`[${page.file}] lien de nav actif introuvable : "${page.active}"`);
    }
    html = html.replace(needle, `class="site-header__link is-active">${page.active}</a>`);
  }
  return html;
}

function buildFooter(page) {
  const bottomLink = page.bottom === 'home'
    ? `<a href="${page.base}index.html">Retour à l'accueil</a>`
    : `<a href="${page.base}mentions-legales.html">Mentions légales</a>`;
  return footerTpl
    .replace(/\{\{BASE\}\}/g, page.base)
    .replace(/\{\{FOOTER_BOTTOM_LINK\}\}/g, bottomLink);
}

// Régions remplacées : du commentaire repère jusqu'à la balise fermante incluse.
const HEADER_RE = /<!-- HEADER -->\r?\n[\s\S]*?<\/header>/;
const FOOTER_RE = /<!-- FOOTER -->\r?\n[\s\S]*?<\/footer>/;

let changed = 0;
let failed = false;
for (const page of pages) {
  const filePath = path.join(SITE, page.file);
  const src = fs.readFileSync(filePath, 'utf8');

  if (!HEADER_RE.test(src)) throw new Error(`[${page.file}] bloc "<!-- HEADER --> … </header>" introuvable`);
  if (!FOOTER_RE.test(src)) throw new Error(`[${page.file}] bloc "<!-- FOOTER --> … </footer>" introuvable`);

  const out = src
    .replace(HEADER_RE, `<!-- HEADER -->\n${buildHeader(page)}`)
    .replace(FOOTER_RE, `<!-- FOOTER -->\n${buildFooter(page)}`);

  if (out !== src) {
    fs.writeFileSync(filePath, out);
    changed++;
    console.log(`✓ ${page.file}`);
  } else {
    console.log(`= ${page.file} (déjà à jour)`);
  }
}

console.log(`\n${changed} fichier(s) mis à jour sur ${pages.length}.`);
process.exit(failed ? 1 : 0);
