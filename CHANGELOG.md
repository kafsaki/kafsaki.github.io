# 更新日志

## 2026-08-12

### 新增功能

#### 1. 图片转ASCII字符画工具
- 新增 `tools/img2ascii.js`，将图片转换为彩色字符画 JSON 数据
- 保留原始图片比例，自动计算行列数
- 提取图片主色调用于背景色

#### 2. ASCII 字符画背景渲染
- 新增 `source/js/ascii-bg.js`，根据页面路径自动匹配对应字符画
- 支持多页面不同背景：首页(bluecoffee)、文章详情(purple)、归档/分类/标签/关于(DarkRoom)
- **逐列揭示动画**：每列从顶部开始，以随机速度逐字向下渲染，直至全部揭示完成
- **cover 模式**：始终填满 banner 区域，横屏按宽度撑满、竖屏按高度撑满
- 根据字符画主色调自动设置页面背景色，与 banner 遮罩叠加后视觉一致
- 响应式适配，浏览器窗口变化时自动重绘

#### 3. Board 玻璃态效果
- 新增 `source/css/board-glass.css`
- 为 #board 添加 `backdrop-filter: blur(12px)` 实现毛玻璃效果
- 同时适配日间模式和夜间模式
- 支持系统 prefers-color-scheme 和手动切换

#### 4. 项目配置优化
- `.gitignore` 添加 `source/img/`，防止原始图片上传到 GitHub
- `_config.fluid.yml` 注册自定义 CSS 和 JS 资源