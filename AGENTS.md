# AGENTS.md

面向 agent 的仓库维护手册。先读「硬规则」，再按任务类型走「工作流」。

## 项目速览

- kafsaki 的个人博客：**VitePress（Vue 3）静态站点**，文章在 `posts/*.md`，构建产物 `.vitepress/dist/` 不入库。
- 推送 `main` 后 GitHub Actions 自动构建并部署到 GitHub Pages（`pages.yml`）；PR 由 `ci.yml` 跑 `npm test` + 构建。
- 运行环境：Node ≥ 20（CI 用 22）。

## 硬规则

1. **产物不入库**：`.vitepress/dist/`、`.vitepress/cache/`、`node_modules/` 永不提交。`public/` 只放静态资产（原样复制到 dist 根），不是构建产物目录。
2. **文件名即 URL**：`posts/<name>.md` → `/posts/<name>.html`。不改已发布文章的文件名；`pages/` 下的页面文件改名前必须先改 `rewrites`。
3. 提交身份固定为 `kafsaki <kafsaki.moe@outlook.com>`；仓库已做 local 配置，只验证不修改。
4. 保留用户的无关改动，不重写 Git 历史。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本地开发服务器（热更新） |
| `npm run build` | 构建到 `.vitepress/dist/`（含死链检查） |
| `npm run preview` | 预览构建产物 |
| `npm test` | `tests/*.test.mjs`（node:test，无额外依赖） |

## 结构与职责

| 路径 | 职责 |
| --- | --- |
| `posts/*.md` | 文章。front matter：`title/date/tags/categories`；title 缺省用文件名，date 缺省显示为空 |
| `pages/*.md` | 站点页面（首页 `layout: home`；归档/标签/分类/关于，带 `kicker/lead`，宽版式加 `wide: true`）。**URL 由 config.mts 的 `rewrites` 固定为根路径**，移动或新增页面文件必须同步该表 |
| `public/assets/` | 静态资产（如 `typora_images/`），文章用 `/assets/...` 引用 |
| `.vitepress/config.mts` | 站点配置：语言、Shiki（css-variables 主题）、markdown-it-footnote/emoji 插件 |
| `.vitepress/data/posts.data.ts` | 文章数据加载器：归一化字段 + 摘要（前 180 字符）+ 阅读时长 |
| `.vitepress/theme/Layout.vue` | 三种外壳：home / 文章页（`posts/` 路径）/ 普通页面 |
| `.vitepress/theme/components/` | HomePage、PostCard、ArchivesPage、TaxonomyMap(+Branch)、ArticleMeta、BgPixels |
| `.vitepress/theme/bg/engine.js` | WebGL 点阵背景引擎；`initBackground(canvas)` 返回清理函数 |
| `.vitepress/theme/custom.css` | 全站样式；语法着色由 `--shiki-token-*` 变量控制 |
| `scripts/utils.mjs` | slugify / stripFrontMatter / plainText / readingMinutes（loader 与测试共用） |
| `tests/*.test.mjs` | 工具函数回归测试 |

## 渲染与交互要点

- 代码块：Shiki 高亮，VitePress 默认输出语言标签与复制按钮；配色在 custom.css 的 `--shiki-token-*`，改 config 的 `markdown.theme` 必须同步改 CSS。
- 脚注与 emoji 由 markdown-it 插件处理；脚注 CSS 适配其输出类名（`.footnotes`、`.footnote-ref`、`.footnote-backref`、隐藏的 `hr.footnotes-sep`）。
- `TaxonomyMap` 用 `mode="tags"|"categories"` 复用同一组件；展开/筛选状态在组件内；hash 深链接（`#tag-x` / `#category-x`）自动展开定位。
- 卡片点击跳转、标签横向滚动、`/` 聚焦搜索均为组件内 Vue 事件，无全局 DOM 脚本。

## 工作流

### 只改文章

```bash
git add posts public
git commit -m "content: ..."
git push origin main
```

本地可 `npm run dev` 预览；不需要跑测试。

### 改主题、组件、配置、工具或工作流

```bash
npm test
npm run build   # 必须通过；死链检查会暴露问题链接
git status --short
```

全部变更一次提交。依赖变更才修改 `package.json`，并 `npm install` 刷新 lock。

### 删 CSS 类或改选择器

类名可能被组件动态绑定（`is-open` / `is-active` / `is-highlighted` / `is-muted` / `copied`）或由 VitePress/插件输出（`language-*`、`lang`、`copy`、`.footnotes`）。删除前必须在 `.vitepress/`、`posts/` 全局确认无引用。

## 提交前检查

1. `git diff --check` 通过。
2. 涉及构建逻辑时 `npm test` 全绿、`npm run build` 成功。
3. CHANGELOG 的 `[Unreleased]` 已按 Added / Changed / Removed 记录（纯文章发布不记）。
