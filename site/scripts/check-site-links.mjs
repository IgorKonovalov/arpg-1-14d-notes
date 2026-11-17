#!/usr/bin/env node
// Link check over the built site (dist/), Node standard library only.
// Every internal link and src resolves to a file under the base path, public/illustrations/
// files included (they are copied into dist/). An external link outside the allowlist fails.
// Usage: SITE_BASE=/name/ node scripts/check-site-links.mjs [dist]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const base = (process.env.SITE_BASE ?? '/').replace(/\/?$/, '/');
const repo = base.replace(/\//g, '');
const ACCOUNT = 'IgorKonovalov';
const ALLOWED = [
  repo ? `https://github.com/${ACCOUNT}/${repo}` : `https://github.com/${ACCOUNT}`,
  'https://creativecommons.org/licenses/by/4.0/',
];
// The site's own host. Starlight writes each page's canonical link (and the sitemap's) as an
// absolute URL on it; such a link is checked as an internal one, under the base.
const SELF = 'https://igorkonovalov.github.io';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );
if (!existsSync(dist)) {
  console.error(`check-site-links: no such directory ${dist}`);
  process.exit(2);
}
const files = walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));
if (pages.length === 0) {
  console.error('check-site-links: no HTML under dist');
  process.exit(2);
}

const resolves = (rel) => {
  const p = path.join(dist, rel);
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(path.join(p, 'index.html'));
};

const bad = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const here = path.relative(dist, page).split(path.sep).join('/');
  for (const m of html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)) {
    const raw = m[1].replace(/&amp;/g, '&');
    if (raw === '' || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('mailto:')) continue;
    checked++;
    const self = raw.startsWith(`${SELF}/`) ? raw.slice(SELF.length) : null;
    // Starlight's 404 page names /404/ as its canonical URL, but the page is 404.html; Pages serves it
    // for any missing path, so its own-host links are not navigation and are not checked.
    if (here === '404.html' && self !== null) continue;
    if (self === null && /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw)) {
      const url = raw.replace(/[?#].*$/, '');
      if (!ALLOWED.some((a) => url === a || url === `${a}/` || url.startsWith(`${a}/`))) {
        bad.push(`${here}: external link outside the allowlist: ${raw}`);
      }
      continue;
    }
    const target = (self ?? raw).replace(/[?#].*$/, '');
    let rel;
    if (target.startsWith('/')) {
      if (!target.startsWith(base)) {
        bad.push(`${here}: absolute link outside the base ${base}: ${raw}`);
        continue;
      }
      rel = decodeURIComponent(target.slice(base.length));
    } else {
      rel = decodeURIComponent(path.posix.join(path.posix.dirname(here), target));
    }
    if (path.posix.normalize(rel).startsWith('..')) {
      bad.push(`${here}: link above the site root: ${raw}`);
      continue;
    }
    if (!resolves(rel)) bad.push(`${here}: broken link: ${raw}`);
  }
}

// Every illustration folder must hold its step-through page.
const illDir = path.join(dist, 'illustrations');
if (existsSync(illDir)) {
  for (const d of readdirSync(illDir, { withFileTypes: true })) {
    if (d.isDirectory() && !existsSync(path.join(illDir, d.name, 'index.html'))) {
      bad.push(`illustrations/${d.name}/: no index.html`);
    }
  }
}

if (bad.length) {
  console.error(bad.join('\n'));
  console.error(`check-site-links: ${bad.length} problem(s) in ${checked} links`);
  process.exit(1);
}
console.log(`check-site-links: ${checked} links in ${pages.length} pages, all resolve under ${base}`);
