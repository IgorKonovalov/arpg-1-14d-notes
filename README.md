# Reimplementation notes

Plain-language notes on how a classic action role-playing game works, written for people who reimplement it: how
items are rolled, how monsters are placed, how levels are laid out. An unofficial, non-commercial preservation
project. Not affiliated with or endorsed by Blizzard Entertainment. Diablo and Blizzard Entertainment are trademarks
of Blizzard Entertainment, Inc. No game files, art, text dumps or code are included.

The site is an Astro Starlight project in `site/`, published to GitHub Pages by
`.github/workflows/pages.yml`.

## Layout

| Path | Holds |
|---|---|
| `site/src/content/docs/` | The pages, as Markdown. Each cut is copied in by hand. |
| `site/src/cut.json` | The cut's date, shown in every page's footer. |
| `site/public/illustrations/` | Schematic animations drawn by our own tools: boxes and name cards, no game art. |
| `site/src/components/Footer.astro` | The footer every page carries. |
| `site/scripts/check-site-links.mjs` | The link check over the built site. |

## Build

You need Node 24. From `site/`:

```sh
npm install        # first time only; commit the package-lock.json it writes
npx playwright install chromium
npm run build
SITE_BASE=/ npm run check-links
```

Mermaid diagrams are drawn at build time with a headless Chromium, so a diagram that does not parse fails the build.
A page that renders empty fails it too. `SITE_BASE` is the repository's name between slashes (the workflow sets it);
leave it unset, or set it to `/`, for a local build.

The link check resolves every internal link and `src` under the base path, including the files in
`public/illustrations/`, and fails on an external link outside a short allowlist (this repository and the licence's
page).

## CI

The `build` job runs on every push, pull request and manual run: `npm ci`, the build, the link check. The `deploy`
job runs only from `main`. Deployments queue and never cancel. In the repository's settings, set Pages' source to
GitHub Actions.

## Licence

The text is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see `LICENSE`.
