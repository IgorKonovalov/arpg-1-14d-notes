import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeMermaid from 'rehype-mermaid';
import rehypeWidgets from './src/rehype-widgets.mjs';

// The repository's name as spelled, in slashes. GitHub serves a project site under it, so the
// workflow sets SITE_BASE once and gives it to the build and to the link check. A local build
// serves from the root.
const BASE = process.env.SITE_BASE ?? '/';
const REPO = BASE.replace(/\//g, '');
const ACCOUNT = 'IgorKonovalov';
const REPO_URL = REPO ? `https://github.com/${ACCOUNT}/${REPO}` : `https://github.com/${ACCOUNT}`;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, 'src', 'content', 'docs');

// The cut's date, and optionally the sidebar's group labels and order, both written by the
// export builder: { "date": "YYYY-MM-DD", "groups": [{ "slug": "...", "label": "..." }] }.
const CUT = JSON.parse(readFileSync(path.join(HERE, 'src', 'cut.json'), 'utf8'));

// Sidebar: a group per top-level folder of the content, in the cut's order; pages by their
// sidebar.order. The top-level pages other than the front page come first (Phase 6 review: they had no
// sidebar entry; the front page is the site title's link).
function sidebar() {
  const dirs = readdirSync(DOCS).filter((f) => statSync(path.join(DOCS, f)).isDirectory());
  const known = new Map((CUT.groups ?? []).map((g, i) => [g.slug, { label: g.label, i }]));
  dirs.sort((a, b) => (known.get(a)?.i ?? 1e6) - (known.get(b)?.i ?? 1e6) || a.localeCompare(b));
  const title = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
  // The top-level pages other than the front page (the site title links home), by their sidebar.order.
  const order = (f) => Number(/^\s*order:\s*(\d+)/m.exec(readFileSync(path.join(DOCS, f), 'utf8'))?.[1] ?? 1e6);
  const tops = readdirSync(DOCS)
    .filter((f) => f.endsWith('.md') && f !== 'index.md' && statSync(path.join(DOCS, f)).isFile())
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
    .map((f) => ({ slug: f.slice(0, -3) }));
  return [...tops, ...dirs.map((d) => ({ label: known.get(d)?.label ?? title(d), items: [{ autogenerate: { directory: d } }] }))];
}

// A page that rendered to an empty body fails the build. Astro stores an entry whose rehype chain
// threw (a Mermaid fence that does not parse) without its HTML, and the page builds with a title
// and nothing under it; this hook is what makes that failure visible. The test is the content
// container closing on itself: the footer and the pagination sit inside <main> after it, so any
// test over the text up to </main> never sees an empty body. A page without the container (a
// template that has none) is skipped.
function failOnEmptyPages() {
  const MARKER = '<div class="sl-markdown-content">';
  return {
    name: 'fail-on-empty-pages',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir);
        const walk = (d) =>
          readdirSync(d, { withFileTypes: true }).flatMap((e) =>
            e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
          );
        const empty = [];
        for (const f of walk(root)) {
          if (!f.endsWith('.html') || f.includes(`${path.sep}illustrations${path.sep}`)) continue;
          if (path.basename(f) === '404.html') continue;
          const html = readFileSync(f, 'utf8');
          if (!html.includes(MARKER)) continue;
          if (/<div class="sl-markdown-content">\s*<\/div>/.test(html)) empty.push(path.relative(root, f));
        }
        if (empty.length) throw new Error(`pages with an empty body: ${empty.join(', ')}`);
      },
    },
  };
}

// The builder writes an illustration's GIF, and a widget's fallback picture, as a root-absolute image target,
// /illustrations/<id>/<file> or /widgets/<id>/fallback.png (it cannot know the base). This step prefixes the base to
// every <img> source of those shapes.
function rehypeIllustrationBase() {
  const prefix = BASE.replace(/\/$/, '');
  const walk = (n) => {
    if (n.type === 'element' && n.tagName === 'img' && typeof n.properties?.src === 'string' &&
        /^\/(illustrations|widgets)\//.test(n.properties.src)) {
      n.properties.src = prefix + n.properties.src;
    }
    for (const c of n.children ?? []) walk(c);
  };
  return (tree) => walk(tree);
}

// The page policy for scripted widgets: the browser itself refuses any request a page script might make,
// any frame, plug-in, form target and <base>. Everything not named is refused (default-src 'none'). Scripts come only
// from this site; the inline ones are Starlight's own (theme switch, mobile menu). Search still works: Pagefind runs in
// a Web Worker from this site (worker-src 'self'), and a worker's requests and its WebAssembly follow the worker's own
// policy, not this page's (checked in a browser; never set worker-src 'none').
const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; worker-src 'self'; manifest-src 'self'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";

export default defineConfig({
  site: 'https://igorkonovalov.github.io',
  base: BASE,
  markdown: {
    // img-svg draws each fence to an SVG at build time; a fence that does not parse fails the build.
    rehypePlugins: [
      [rehypeMermaid, { strategy: 'img-svg', dark: true }],
      rehypeIllustrationBase,
      [rehypeWidgets, { base: BASE, publicDir: path.join(HERE, 'public') }],
    ],
  },
  integrations: [
    starlight({
      title: 'Reimplementation notes',
      description: 'Plain-language notes on how the game works, written for reimplementers.',
      customCss: ['./src/styles/site.css'],
      components: { Footer: './src/components/Footer.astro' },
      head: [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP } }],
      social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
      sidebar: sidebar(),
    }),
    failOnEmptyPages(),
  ],
});
