# Changelog

## [Unreleased]

### Changed
- Moved the site page markdown files into `pages/`; URLs stay at the root via VitePress `rewrites`.

## [3.0.0] - 2026-09-07

### Added
- Rebuilt the site on VitePress (Vue 3): SPA navigation, a local dev server with hot reload (`npm run dev`), and content-loaded data for archive and taxonomy pages.
- Added a WebGL2 fluid pixel-dot background that follows the pointer, degrading gracefully without WebGL2.
- Code blocks are highlighted by Shiki with a language label and a hover copy button; the token palette lives in `--shiki-token-*` CSS variables.
- GFM footnotes (`[^id]`) and GitHub-style emoji shortcodes (`:rocket:`) via markdown-it plugins.
- Prose styles for article content: tables (striped, hoverable, horizontally scrollable), blockquotes, lists with accent markers, task-list checkboxes, horizontal rules, responsive images and heading hierarchy.
- `node:test` suites for the shared text utilities and the renderer, wired into the CI workflow.

### Changed
- Posts moved from `content/` to `posts/` with file names matching their URL slugs; all existing article and page URLs are unchanged.
- Images now live in `public/assets/` and are referenced as `/assets/...`; the custom Typora path rewriting was removed.
- Deployment switched from committing `public/` to a CI build: pushes to `main` run `npm run build` and deploy `.vitepress/dist/` to GitHub Pages.
- The tag/category taxonomy maps, post cards, search and the WebGL pixel background were re-implemented as Vue components, preserving their look and behavior.
- Excerpts and reading time strip fenced code, footnote definitions and link targets, so Windows image paths no longer leak into post cards.

### Removed
- Removed the hand-written Node.js static generator (`scripts/build.mjs`, `scripts/markdown.mjs`, `scripts/emoji-map.mjs`), the `{{ }}` templates, global DOM scripts and the committed `public/` build output.
- Removed the direct `highlight.js` dependency in favor of Shiki via VitePress, and the curated emoji map in favor of markdown-it-emoji.

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
