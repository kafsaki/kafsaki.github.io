# kafsaki.github.io v2

轻量级 Markdown 静态站点生成器，不依赖 Hexo 或主题系统。

## 开发

```bash
npm install
npm run build
npx serve public
```

文章放在 `content/*.md`。运行 `npm run build` 后，脚本会自动生成首页、文章页、归档、标签页和关于页到 `public/`。`src/styles/site.css` 与 `src/scripts/background.js` 会被原样拷贝到 `public/`。

## 背景动画

`src/scripts/background.js` 用 WebGL2 渲染流动点阵背景，每帧三个 pass：

1. **flow** — 持续存在的速度场，自我对流并缓慢衰减；鼠标移动会沿轨迹注入动量，所以水流会跟着光标走，光标停下后余流继续扩散。
2. **field** — 三个八度的 fBm 噪声场，采样坐标被速度场扭曲。
3. **dots** — 固定的像素格子，从上游位置采样噪声场，于是稀疏点阵看起来在顺流移动。

点阵颜色取自 CSS 变量 `--accent` 与 `--text`，改主题色时背景会自动跟随。没有 WebGL2 时退化为纯色背景；`prefers-reduced-motion: reduce` 时只渲染一帧静态画面。

发布时请将 `public/` 一并提交到 `main` 分支。GitHub Pages 只上传仓库中的静态文件，不会在云端重新安装依赖或构建，因此部署速度更快。

```bash
npm install
npm run build
git add content public src
git commit -m "content: publish new article"
git push origin main
```
