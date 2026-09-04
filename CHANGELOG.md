# Changelog

## [Unreleased]

### Added
- Added a WebGL2 fluid pixel-dot background (`src/scripts/background.js`), ported from `apps/frontend/trae-background-demo` and extended with a persistent velocity field so the current follows the pointer.
- Added a copy step for `src/scripts/background.js` to the build.

### Changed
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
