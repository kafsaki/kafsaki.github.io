# kafsaki.github.io

kafsaki 的个人技术博客，基于 **VitePress（Vue 3）** 构建的纯静态站点，部署在 GitHub Pages。

项目特点：

- 使用 Markdown 管理文章，自动生成首页、文章页、归档页、标签页、分类页和关于页。
- 代码块语法高亮（Shiki），显示语言标签与复制按钮；支持 GFM 脚注（`[^id]`）和 emoji 短代码（`:rocket:`）。
- 首页提供文章卡片和搜索（按 `/` 聚焦）；标签页与分类页以思维导图形式浏览并支持交叉筛选。
- 使用 WebGL2 渲染跟随鼠标流动的点阵背景，并在不支持 WebGL2 的环境下自动降级。

## 写文章

在 `posts/` 下新建 `<名称>.md`。**文件名就是 URL**（`posts/foo.md` → `posts/foo.html`），已发布文章不要改文件名：

```yaml
---
title: 文章标题
date: 2026-09-07
tags: [tag-a, tag-b]
categories: [分类]
---

正文从这一行开始。
```

图片放入 `public/assets/`（例如 `public/assets/typora_images/`），正文中用 `/assets/...` 引用。

## 本地开发

```bash
npm install
npm run dev      # 开发服务器，热更新
npm test         # 工具函数回归测试
npm run build    # 构建到 .vitepress/dist/（含死链检查）
npm run preview  # 预览构建产物
```

## 发布

推送 `main` 分支即可：GitHub Actions 自动构建并部署到 GitHub Pages，构建产物不需要提交。
