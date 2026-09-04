# kafsaki.github.io v2

轻量级 Markdown 静态站点生成器，不依赖 Hexo 或主题系统。

## 开发

```bash
npm install
npm run build
npx serve public
```

文章放在 `content/*.md`。运行 `npm run build` 后，脚本会自动生成首页、文章页、归档、标签页和关于页到 `public/`。

发布时请将 `public/` 一并提交到 `main` 分支。GitHub Pages 只上传仓库中的静态文件，不会在云端重新安装依赖或构建，因此部署速度更快。

```bash
npm install
npm run build
git add content public src
git commit -m "content: publish new article"
git push origin main
```
