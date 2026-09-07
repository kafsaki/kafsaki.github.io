import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createMarkdownRenderer } from "../scripts/markdown.mjs";
import { plainText } from "../scripts/build.mjs";

// The renderer resolves local images relative to content/, so point the
// fake source file there; the file itself never needs to exist.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const renderMarkdown = createMarkdownRenderer(path.join(root, "content"));
const sourceFile = path.join(root, "content", "fixture.md");
const render = (body) => renderMarkdown(body, sourceFile);

test("代码块显示语言标签并进行语法高亮", () => {
  const html = render("```javascript\nconst a = 1;\n```");
  assert.match(html, /<span class="code-block-lang">javascript<\/span>/);
  assert.match(html, /<code class="hljs language-javascript">/);
  assert.match(html, /<span class="hljs-keyword">const<\/span>/);
});

test("语言别名按注册语言高亮", () => {
  const html = render("```js\nconst a = 1;\n```");
  assert.match(html, /class="hljs language-js"/);
  assert.match(html, /hljs-keyword/);
});

test("无语言代码块显示 text 且内容转义不高亮", () => {
  const html = render("```\n<div>raw</div>\n```");
  assert.match(html, /<span class="code-block-lang">text<\/span>/);
  assert.ok(html.includes("&lt;div&gt;raw&lt;/div&gt;"));
  assert.ok(!html.includes("hljs-keyword"));
});

test("脚注按首次引用顺序编号并生成文末列表", () => {
  const html = render("乙脚注[^b]，甲脚注[^a]。\n\n[^a]: 先定义。\n[^b]: 后定义。");
  assert.match(html, /id="fnref-b"><a href="#fn-b">1<\/a>/);
  assert.match(html, /id="fnref-a"><a href="#fn-a">2<\/a>/);
  assert.match(html, /<section class="footnotes" role="doc-endnotes"/);
  assert.match(html, /<li id="fn-b" class="footnote-item">后定义。<a/);
  assert.match(html, /<li id="fn-a" class="footnote-item">先定义。<a/);
  assert.ok(
    html.indexOf('<li id="fn-b"') < html.indexOf('<li id="fn-a"'),
    "文末列表应按引用顺序排列",
  );
});

test("同一脚注重复引用共享编号并各自生成回链", () => {
  const html = render("一[^x]二[^x]。\n\n[^x]: 内容。");
  assert.match(html, /id="fnref-x"><a href="#fn-x">1<\/a>/);
  assert.match(html, /id="fnref-x-2"><a href="#fn-x">1<\/a>/);
  assert.equal(html.match(/class="footnote-backref"/g).length, 2);
  assert.ok(html.includes('href="#fnref-x"'));
  assert.ok(html.includes('href="#fnref-x-2"'));
});

test("未定义的脚注引用保持字面文本", () => {
  const html = render("引用[^missing]。");
  assert.ok(html.includes("[^missing]"));
  assert.ok(!html.includes("footnote-ref"));
});

test("行内代码和代码块中的脚注语法不被转换", () => {
  const html = render(
    "`[^a]` 和代码块：\n\n```\n[^b]\n```\n\n[^a]: 定义。",
  );
  assert.ok(html.includes("<code>[^a]</code>"));
  assert.ok(!html.includes('id="fnref-b"'));
  // 唯一的引用在代码里，因此没有有效引用，不应生成脚注区。
  assert.ok(!html.includes('class="footnotes"'));
});

test("缩进续行并入脚注定义并解析行内格式", () => {
  const html = render("脚注[^m]。\n\n[^m]: 第一行。\n  第二行带**粗体**。");
  assert.match(
    html,
    /<li id="fn-m" class="footnote-item">第一行。\s*第二行带<strong>粗体<\/strong>。/,
  );
});

test("紧贴段落（无空行）的定义仍被识别", () => {
  const html = render("正文段落[^t]。\n[^t]: 定义内容。");
  assert.match(html, /id="fnref-t"/);
  assert.match(html, /<li id="fn-t" class="footnote-item">定义内容。<a/);
});

test("未被引用的定义不出现在输出中", () => {
  const html = render("正文。\n\n[^orphan]: 没人引用。");
  assert.ok(!html.includes("footnotes"));
  assert.ok(!html.includes("没人引用"));
});

test("content 内的相对图片路径转换为 assets 路径", () => {
  const html = render("![图](./typora_images/pic.png)");
  assert.ok(html.includes('src="../assets/typora_images/pic.png"'));
  assert.ok(html.includes('alt="图"'));
});

test("plainText 剥离代码块、脚注和链接地址", () => {
  const text = plainText(
    "前言[链接文字](https://example.com)。\n\n```js\nconst a = 1;\n```\n\n带脚注[^1]。\n\n[^1]: 定义内容。\n  续行也不应出现。",
  );
  assert.ok(text.includes("前言链接文字。"));
  assert.ok(text.includes("带脚注 。"));
  assert.ok(!text.includes("const a"));
  assert.ok(!text.includes("example.com"));
  assert.ok(!text.includes("定义内容"));
  assert.ok(!text.includes("续行"));
  assert.ok(!text.includes("[^1]"));
});
