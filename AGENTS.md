# AGENTS.md

面向 agent 的仓库维护手册。先读「硬规则」，再按任务类型走「工作流」。

## 项目速览

- kafsaki 的个人博客：Node.js 脚本把 `content/*.md` 构建为纯静态站点，输出到 `public/`。
- 依赖仅 `marked`（Markdown 解析）与 `highlight.js`（构建时代码高亮）；测试使用 Node 内置 `node:test`，无其他工具链。
- 运行环境：Node ≥ 20（CI 用 22）。推送 `main` 且 `public/` 有变更时，GitHub Pages 自动部署。

## 硬规则

1. **绝不手改 `public/`**：它是构建产物兼发布目录，只能由 `npm run build` 生成。
2. **`public/` 必须与源码同一次提交**：只推源码会让线上发布旧页面。
3. **不改已发布文章的 `title`**：title 决定 slug 与 URL（`public/posts/<slug>.html`）。
4. 提交身份固定为 `kafsaki <kafsaki.moe@outlook.com>`；仓库已做 local 配置，只验证不修改。
5. 保留用户的无关改动，不重写 Git 历史。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 全量重建 `public/`（先删后建，幂等） |
| `npm test` | 运行 `tests/*.test.mjs` 渲染回归测试 |
| `node --check scripts/*.mjs` | 最快语法反馈 |

## 结构与职责

| 路径 | 职责 |
| --- | --- |
| `content/*.md` | 文章。front matter：`title/date/tags/categories`，可省略（title=文件名，date=构建当天） |
| `content/` 下其他文件 | 文章资源（如 `typora_images/`），构建时复制到 `public/assets/` 并把文章内引用改写为 `../assets/...` |
| `scripts/build.mjs` | 站点组装：读文章，生成首页/文章页/归档/标签/分类/关于页。入口有守卫，可被测试安全 import |
| `scripts/markdown.mjs` | Markdown→HTML 渲染管线：hljs 高亮、GFM 脚注、本地图片解析。纯函数无 IO |
| `src/templates/*.html` | 页面骨架，`{{ key }}` 占位符由 build.mjs 替换 |
| `src/styles/site.css` | 全站唯一样式表，原样复制 |
| `src/scripts/*.js` | 浏览器脚本，原样复制 |
| `tests/*.test.mjs` | 渲染层回归测试（高亮、语言标签、脚注边界、图片路径、plainText） |
| `.github/workflows/` | `ci.yml`：PR 时 `npm test` + `npm run build`；`pages.yml`：推送后部署 `public/` |

## 渲染管线要点（改 markdown.mjs 前必读）

- 使用 marked 17 对象式 renderer API；`createMarkdownRenderer(contentDir)` 返回 `renderMarkdown(body, sourceFile)`。
- 代码块一律输出 `<figure class="code-block">`，头部显示语言标签；无语言显示 `text`；hljs 失败回退为纯转义文本。
- 脚注 `[^id]` 为本地自定义扩展：lex 阶段收集定义，编号按**首次引用顺序**；未定义引用原样输出；同一脚注重复引用生成 `fnref-N-k` 并各自回链；文末输出 `<section class="footnotes">`。
- emoji 短代码 `:name:` 由行内扩展查 `scripts/emoji-map.mjs`（内置精选表，无依赖）；未知名称保持字面；扩充时直接往表里加条目。
- **陷阱**：marked 的段落 tokenizer 会吞掉没有空行分隔的脚注定义行，当前由 parse 前的预处理补空行解决。改动 tokenizer 前先读懂这段预处理。
- 图片只处理 `content/` 内的引用（含 Typora 的 Windows 绝对路径），目录外路径原样保留。

## 工作流

### 只改文章

```bash
npm run build
git add content public
git commit -m "content: ..."
git push origin main
```

不需要跑测试，也不需要读构建源码。

### 改构建器、模板、样式、浏览器脚本、测试或工作流

```bash
node --check scripts/build.mjs scripts/markdown.mjs
npm test
npm run build
git status --short public/   # 差异必须全部是本次改动的预期结果
```

源码、`public/`、CHANGELOG 在同一次提交。只有依赖变更才修改 `package.json`，并 `npm install` 刷新 lock。

### 删 CSS 类或改选择器

类名可能被 JS 动态切换（`is-open` / `is-active` / `is-highlighted` / `is-muted`）或由 build.mjs 在生成 HTML 时输出。删除前必须在 `src/`、`public/`、`scripts/*.mjs` 中全局确认无引用。

## 提交前检查

1. `git diff --check` 通过。
2. 涉及构建逻辑时 `npm test` 全绿。
3. `public/` 与源码同步，差异均为预期。
4. CHANGELOG 的 `[Unreleased]` 已按 Added / Changed / Removed 记录（纯文章发布不记）。
