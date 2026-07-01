# feuerjus.github.io — Agent Guide

## Architecture

Vanilla static SPA — **no build system, no package.json, no framework, no modules**.

- `index.html` — shell with tab nav + `<main id="tab-content">`
- `script.js` — all JS in global scope (SPA router, tool logic, theme, PWA)
- `style.css` — all CSS via custom properties for light/dark theming
- `tabName.html` — tab content fetched async by `loadTab(tabName)` and injected into `#tab-content`
- `sw.js` — precaches all HTML/CSS/JS on install, cache-first fetch strategy

## Adding/editing a tool in `tools.html`

Every `.tile` **must** have:
1. `data-tag="..."` attribute (e.g. `data-tag="it"`, `data-tag="hiking"`)
2. a `.tile-tag` badge as first child: `<span class="tile-tag">[IT]</span>`
3. The tag buttons in `.tag-filters` must include a matching button with `data-tag="<name>"`

Filtering logic in `script.js`: `filterTools()` checks both `currentTag` and search term. The tag filter buttons and search input both call this function.

## Adding JS for a new tool in `script.js`

After the tab HTML is injected, `setupTab('tools')` fires. Add your wiring function call there. Existing wiring: `setupCalculator()`, `setupSubnetCalculator()`, `setupFileHasher()`, `setupToolSearch()`, `setupToolFilters()`.

## Design consistency

- Terminal aesthetic: amber monochrome palette via CSS custom properties (`--amber`, `--amber-dim`, `--text-dim`, etc.)
- Label prefixes (hardcoded in `::before`):
  - Section titles: `## `
  - Tile titles: `> `
  - Form labels: `$ `
  - Table headers: `# `
  - Site title wraps in `┌─[...]`, subtitle in `└─▪`
- **Modals/popups** (e.g. PWA install modal): use `.pwa-modal-overlay` (fixed overlay + backdrop blur) + `.pwa-modal` (surface bg, border, radius-lg, shadow). Follow the `.pwa-modal-*` class naming convention.
- Text is `lowercase` throughout.
- Responsive breakpoint: `640px` (stacks section-header vertically, single-column grid, wraps filter/search).
- Theme: `data-theme="dark"|"light"` on `<html>`, persisted in localStorage, default from `prefers-color-scheme`.

## PWA

- `manifest.json` and `sw.js` handle install + offline support
- Install button + modal logic in `script.js` (lines 331-441)
- If adding new static files, add them to `sw.js` `PRECACHE` array

## Commands

No build/dev commands exist. Open `index.html` in a browser or serve with any static file server (e.g. `python3 -m http.server 8000`).
