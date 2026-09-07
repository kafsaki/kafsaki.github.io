# kafsaki.github.io

这是 kafsaki 的个人技术博客，使用轻量级 Markdown 静态站点生成器构建，不依赖 Hexo 或主题系统。

项目特点：

- 使用 Markdown 管理文章，自动生成首页、文章页、归档页、标签页、分类页和关于页。
- 代码块在构建时完成语法高亮并显示语言标签；支持 GFM 脚注（`[^id]`）。
- 自动处理文章中的本地图片资源，兼容 Typora 常见的图片引用方式。
- 生成纯静态 HTML、CSS 和 JavaScript，页面加载简单直接，适合部署到 GitHub Pages。
- 首页提供文章卡片交互和搜索；标签页与分类页以思维导图形式浏览并支持交叉筛选。
- 使用 WebGL2 渲染跟随鼠标流动的点阵背景，并在不支持 WebGL2 的环境下提供兼容效果。

## 编写博客

在 `content/` 目录新建 Markdown 文件，例如 `content/my-first-post.md`。推荐在正文前添加 front matter，填写标题、发布日期、标签和分类：

```yaml
---
title: 我的第一篇文章
date: 2026-09-06
tags: [blog, note]
categories: [随笔]
---

这里开始编写 Markdown 正文。
```

`title` 同时决定文章显示标题和页面地址，例如上述文章会生成 `posts/my-first-post.html`。修改已发布文章的标题会改变其地址。`tags` 和 `categories` 会显示在文章卡片中，并分别链接到标签页和分类页。

front matter 可以省略。此时网站会使用 Markdown 文件名作为标题，使用本次构建当天作为日期，并将标签和分类设为空。省略元数据适合临时测试；正式文章建议填写固定的标题、日期和标签，避免每次重新构建时日期变化。

Typora 插入的本地图片可放在 `content/typora_images/`，并在文章中使用 `./typora_images/图片文件名.png` 引用。构建时会自动复制图片并转换为网站可访问的地址。

## 发布到网站

在项目根目录完成文章后，运行：

```bash
npm run build
git diff --check
git add content public
git commit -m "content: publish new article"
git push origin main
```

`npm run build` 会重新生成 `public/` 中的页面和资源。`git push origin main` 推送后，GitHub Pages 会在 `public/` 有变更时自动部署新版本。推送前请确保 `content/` 和 `public/` 都已加入提交。

## 本地开发

修改构建脚本、模板或样式后，先运行回归测试再构建：

```bash
npm test
npm run build
```

`npm test` 使用 Node 内置测试运行器，覆盖代码高亮、脚注和图片路径等渲染逻辑，无需额外依赖。
