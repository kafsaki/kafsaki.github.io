# Changelog

## [Unreleased]

### Added
- Added GitHub-style emoji shortcodes (`:rocket:`) via a curated dependency-free map in `scripts/emoji-map.mjs`; unknown names stay literal and code spans are unaffected.
- Added prose styles for article content: tables (striped, hoverable, horizontally scrollable), blockquotes, lists with accent markers, task-list checkboxes, horizontal rules, responsive images and heading hierarchy.
- Added a style-coverage test pinning every element marked can emit to an `.article-content` rule.
- Added `node:test` regression tests for the Markdown renderer (code highlighting, language labels, footnote edge cases) and wired `npm test` into the CI workflow.
- Added build-time syntax highlighting for fenced code blocks via highlight.js, with a language label header on every code block and a dark hljs palette in `site.css`.
- Added GFM footnote support to the Markdown renderer: `[^id]` references are numbered in order of first use, link to an end-of-article footnote list, and each entry links back to its references.
- Added a WebGL2 fluid pixel-dot background (`src/scripts/background.js`), ported from `apps/frontend/trae-background-demo` and extended with a persistent velocity field so the current follows the pointer.
- Added a copy step for `src/scripts/background.js` to the build.

### Changed
- Split the Markdown pipeline into `scripts/markdown.mjs` and restructured `build.mjs` into per-page builders, removing the duplicated tag/category branch construction.
- Excerpts and reading time now strip fenced code, footnote definitions and link targets, so Windows image paths no longer leak into post cards.
- Consolidated duplicated CSS rules (meta chips, article title, post footer, taxonomy nodes) without changing computed styles.
- Rewrote AGENTS.md as an agent-oriented maintenance handbook and bumped CI to Node 22.
- Corrected the `marked` dependency range to `^17.0.5` so a fresh install matches the renderer API the build uses.

### Removed
- Removed dead CSS left over from the pre-taxonomy design (`.read-more`, `.tag-section`, `.tag-list`, `.article-meta`).
- Replaced the flat page background with the animated dot field; header, cards, inputs and the article body are now translucent panels so the flow shows through.
- Moved the base background colour from `body` to `html` so the fixed background layer paints above it.

## [2.0.0] - 2026-09-04

### Added
- Added a small Node.js Markdown static-site generator.
- Added automatic generation for posts, archives, tags and about pages.
- Added a searchable post index and shared page templates.

### Changed
- Migrated post sources from `source/_posts/` to `content/`.
- Replaced Hexo and Fluid with plain templates and CSS.

### Removed
- Removed the Hexo build and theme dependency from the new site architecture.

### Migration
- Write new posts as Markdown files in `content/`.
- Run `npm run build`; deploy the generated `public/` directory.
