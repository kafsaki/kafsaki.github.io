import { defineConfig } from "vitepress";
import footnote from "markdown-it-footnote";
import { full as emoji } from "markdown-it-emoji";

export default defineConfig({
  lang: "zh-CN",
  title: "kafsaki's blog",
  description: "记录技术学习、系统编程与 AI Agent 实践。",
  // Repo docs are not site pages.
  srcExclude: ["README.md", "AGENTS.md", "CHANGELOG.md"],
  // Site pages live in pages/ for a tidy root, but keep root-level URLs.
  rewrites: {
    "pages/index.md": "index.md",
    "pages/archives.md": "archives.md",
    "pages/tags.md": "tags.md",
    "pages/categories.md": "categories.md",
    "pages/about.md": "about.md",
  },
  // github-dark ships in VitePress's bundled Shiki; custom.css neutralizes
  // the inline pre background so the site's own panel color shows through.
  markdown: {
    theme: "github-dark",
    config(md) {
      md.use(footnote);
      md.use(emoji);
    },
  },
});
