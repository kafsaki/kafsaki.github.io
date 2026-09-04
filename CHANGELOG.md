# Changelog

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
