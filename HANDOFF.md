# 项目交接文档

> 本文件用于将会话上下文迁移到新电脑 / 新对话使用。新会话请先阅读本文档，再继续开发。

## 1. 项目概况

- **项目类型**：个人技术博客，基于 [Hexo](https://hexo.io/) + [Fluid 主题](https://hexo.fluid-dev.com/)。
- **线上地址**：https://kafsaki.github.io/
- **本地路径**：`F:\DEV\REPO\kafsaki.github.io`（Windows）
- **运行方式**（本机）：
  - 本地预览：`npx hexo server`
  - 生成 + 部署：`npx hexo clean && npx hexo deploy`

## 2. Git 仓库与分支结构

远程仓库使用 **SSH 协议**（HTTPS 的 443 端口在本机无法连接，务必保持 SSH）：

```
origin  git@github.com:kafsaki/kafsaki.github.io.git
```

- **`source` 分支**：源码（Hexo 源文件、主题配置、自定义 JS/CSS），当前实际使用的分支。
- **`main` 分支**：GitHub Pages 部署产物，由 `hexo deploy` 自动生成并推送，**不要手动改**。
- 另有多个 `dependabot/*` 远端分支，忽略即可。

**部署配置**（`_config.yml` 第 106-109 行）已改为 SSH：

```yaml
deploy:
  type: git
  repo: git@github.com:kafsaki/kafsaki.github.io.git
  branch: main
```

> 坑：改回 HTTPS 会导致 `hexo deploy` 报 `Failed to connect to github.com:443`。保持 SSH 地址。

## 3. 环境注意事项

- **Node.js 与 PATH**：Node 已安装，但 TRAE 沙盒的 PATH 与 Windows 系统 PATH 不一致，可能找不到 node/hexo。若 shell 报命令不存在，需用 Windows 系统 PATH 替换沙盒 PATH，或直接使用 `npx` 前缀调用（`npx hexo ...`）。
- **依赖**：`node_modules` 已安装到位，无需重新 `npm install`（除非换了机器，则需 `npm install`）。

## 4. 自定义文件清单（本项目核心改动）

| 路径 | 作用 |
| --- | --- |
| `source/js/ascii-bg.js` | ASCII 字符画背景渲染器（首页/文章页），含字符雨揭示动画、背景色设置 |
| `source/js/settingbar.js` | 设置面板逻辑：齿轮图标、透明度滑条、localStorage 持久化、定位 |
| `source/css/board-glass.css` | Board 玻璃态样式（透明 + backdrop-filter 模糊 + 阴影） |
| `source/css/settingbar.css` | 设置面板样式（毛玻璃、竖屏居中） |
| `tools/img2ascii.js` | **开发者工具**：将图片转换为字符画 JSON，仅开发者手动调用 |
| `source/data/ascii/*.json` | 字符画数据（`bluecoffee.json` / `purple.json` / `DarkRoom.json`） |
| `source/img/*` | 原始背景图（`bluecoffee.png` / `purple.jpg` / `DarkRoom.jpg`），**不提交 git** |

### 自定义资源如何被引入

在 `_config.fluid.yml` 中注册：

```yaml
custom_js:
  - /js/ascii-bg.js
  - /js/settingbar.js
custom_css:
  - /css/board-glass.css
  - /css/settingbar.css
```

## 5. 已实现的核心功能

### 5.1 ASCII 字符画背景
- 使用 `img2ascii.js` 把大体积背景图转成字符画 JSON，替代原图片加载。
- 路由 → 字符画映射（`ascii-bg.js` 的 `PATH_MAP`）：
  - `/` → `bluecoffee`
  - `/YYYY/MM/DD/`（文章详情）→ `purple`
  - `/archives/`、`/categories/`、`/tags/`、`/about/` → `DarkRoom`
- 字符数据从 `/data/ascii/{name}.json` 用 `fetch` 加载。
- **字符雨揭示动画**（只播一次）：每列随机初始长度 + 随机速度，从上到下逐列渲染，最新字符白色渐变为原色，全部渲染完成后停止。
- **背景色**：banner 背景 = 字符画主色 `dominantColor`；网页 body 背景 = `dominantColor` 各 RGB 通道 × 0.7（对应 Fluid 主题 `.mask` 的 `rgba(0,0,0,0.3)` 遮罩暗化），保持视觉一致。
- 关键 CSS 变量：`--ascii-body-bg`（由 JS 在 `documentElement` 上设置，`settingbar.css` 中 body 优先使用该变量）。
- **cover 自适应**：`fontSize = Math.max(fsByWidth, fsByHeight)`，保证横屏/竖屏都填满 banner。

### 5.2 Board 玻璃态
- `#board` 透明 + `backdrop-filter: blur(12px) saturate(1.2)` + 柔和阴影。
- 日间 `rgba(255,255,255,0.72)`，夜间 `rgba(37,45,56,0.72)`。
- 颜色只响应站点色方案切换（`data-user-color-scheme`），**不响应 `@media (prefers-color-scheme: dark)`**。

### 5.3 Settingbar 设置面板
- 齿轮图标位于右上角 color-toggle 图标右边。
- 点击齿轮弹出面板，两个滑条：
  - `navbar_alpha`（navbar / 设置框透明度），默认 `0.5`
  - `board_alpha`（board 透明度），默认 `0.5`
- 设置通过 `localStorage`（前缀 `settingbar_`）持久化。
- 横屏：面板通过 `requestAnimationFrame` 持续追踪 navbar 底部定位。
- 竖屏（`≤991.98px`）：面板 `position: fixed + top/left 50% + translate(-50%,-50%)` 水平垂直居中，JS 定位在竖屏下跳过。

## 6. 工程约定与硬性约束（务必遵守）

1. **命名通用化**：设置面板一律用通用名 `settingbar`，**不要**用 `stylesetting` 等专一功能名，便于未来扩展其他设置项。
2. **navbar 透明度范围**：`0% - 100%`（不是 10-100）。
3. **默认夜间模式**：`_config.fluid.yml` 里 `dark_mode.default: dark`。
4. **settingbar 面板与菜单图标颜色不跟随系统夜间模式**，只响应站点色切换（`data-user-color-scheme`）。
5. **图标垂直对齐**：navbar 图标用 `vertical-align: -0.125em`。
6. **竖屏面板**：`position: fixed + top:50% + left:50% + transform: translate(-50%,-50%)` 实现水平垂直居中。
7. **不删除 `source/img` 内的图片**：这些是背景图源文件，仅供开发使用，不被 git 追踪。

## 7. Git 忽略规则

`.gitignore` 中：

```
source/img/*
!source/img/.gitkeep
```

即：`img` 目录下的图片不提交，保留 `.gitkeep` 占位（内含提醒文字，说明该目录存放背景图）。

## 8. 近期提交记录（source 分支，旧 → 新）

```
5e63890 fix: settingbar vertical screen centered, deploy repo use SSH   ← 当前 HEAD
06f733b feat: add settingbar with gear icon, navbar/board transparency sliders, default dark mode
ba4153a chore: 保留img文件夹，添加.gitkeep提醒开发者用途
29181e3 chore: 从git追踪中移除img图片文件
0ec565b feat: ASCII字符画背景渲染, Board玻璃态效果, 更新日志
```

## 9. 已知未解决问题（用户已决定放弃）

**移动端（手机系统为暗色模式时）白天/黑夜切换失效**：
- 现象：手机设为浅色模式时，站点白天/黑夜切换正常；手机为暗色模式时，界面一直显示黑/深灰，切换按钮失效。
- 为修复该问题曾提交两次 `fix`（`fda886c`、`7ee1d5f`），但均未解决，用户已要求**回退**这两次提交（已 `git reset --hard HEAD~2` 并强制推送）。
- **用户明确表示不再解决该问题**，后续对话请勿主动重提。

## 10. 新会话常见操作备忘

```bash
# 验证 SSH 连接（首次/排查连接问题时）
ssh -T git@github.com      # 成功会输出 "Hi kafsaki! You've successfully authenticated"

# 部署网站（生成并推送 main 分支）
npx hexo clean && npx hexo deploy

# 推送源码到 source 分支
git add -A && git commit -m "描述" && git push origin source

# 本地预览（可选，端口默认 4000）
npx hexo server
```

> 部署后 GitHub Pages 需几分钟生效，线上查看请用 `Ctrl+Shift+R` 强制刷新。