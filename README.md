# kafsaki.github.io v2

轻量级 Markdown 静态站点生成器，不依赖 Hexo 或主题系统。

## 开发

```bash
npm install
npm run build
npx serve public
```

文章放在 `content/*.md`。运行 `npm run build` 后，脚本会自动生成首页、文章页、归档、标签页和关于页到 `public/`。
