# kafsaki.github.io 项目规则

这是一个基于 Node.js 和 `marked` 的轻量 Markdown 静态站点生成器。源码和文章位于仓库中，GitHub Pages 直接发布已生成的 `public/`。

## 目录职责

- `content/*.md`：文章源文件。
- `content/` 下的非 Markdown 文件：文章引用的本地资源，例如 `typora_images/`。
- `scripts/build.mjs`：Markdown 解析、图片路径转换、资源复制和页面生成逻辑。
- `src/templates/`、`src/styles/`、`src/scripts/`：页面模板、样式和浏览器脚本。
- `public/`：提交到 Git 的构建产物，也是 GitHub Pages 的发布目录。不要手动编辑其中的 HTML、CSS 或 JavaScript。
- `.github/workflows/ci.yml`：Pull Request 构建验证。
- `.github/workflows/pages.yml`：推送 `main` 后上传 `public/` 并部署 GitHub Pages。

## 常用流程

先用 `git status --short` 确认工作区，再按变更范围读取文件。仅修改文章时，不必重复检查完整 Git 历史、全部源码或工作流；修改构建器、模板、资源处理或部署配置时，再读取对应文件并扩大验证范围。保留用户已有的无关改动，不做历史重写。

新增或修改文章时：

```bash
npm run build
git diff --check
git add content public
git commit -m "content: publish new article"
git push origin main
```

修改构建器、模板、样式、脚本或工作流时，除上述检查外，再运行 `node --check scripts/build.mjs`，并检查对应的生成差异。只有涉及依赖时才需要重新安装依赖；常规文章更新不需要修改 `package.json`。

`npm run clean` 会删除整个 `public/`，只在明确需要清理构建产物时使用。当前 `npm run dev` 只是把 `--watch` 参数传给构建脚本，脚本尚未实现监听，因此实际只执行一次构建；项目没有单独的开发服务器。

## 文章约定

Front matter 可以省略。省略时，标题使用文件名，日期使用构建当天日期，标签和分类为空。正式文章应填写稳定的 `title`、`date` 和 `tags`；`categories` 字段保留供未来分类页面使用。

推荐格式：

```yaml
---
title: 文章标题
date: 2026-09-06
tags: [tag-a, tag-b]
categories: [category]
---
```

文章标题会生成 slug，并决定 `public/posts/<slug>.html` 的文件名和链接。修改标题会改变 URL；除非有意变更地址，否则不要随意修改已发布文章的标题。

Typora 本地图片可以使用 `./typora_images/file.png` 或 Windows 绝对路径。构建器会将 `content/` 下的非 Markdown 文件复制到 `public/assets/`，并把文章页中的引用转换为 `../assets/...`。图片必须位于 `content/` 目录内，仓库外的本地路径不会被复制。

## Git 约定

提交身份统一使用：

```text
kafsaki <kafsaki.moe@outlook.com>
```

提交前只需确认 `git config --local --get user.name` 和 `git config --local --get user.email`；不要为普通提交重复检查全局配置或完整历史。生成的 `public/` 必须和源码变更一起提交，避免远程部署发布旧页面。
