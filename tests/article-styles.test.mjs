import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Tables once shipped unstyled; pin every element marked can emit to an
// .article-content rule so new prose elements can't regress silently.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "src/styles/site.css"), "utf8");

const REQUIRED_SELECTORS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "table",
  "thead",
  "th",
  "td",
  "img",
  "del",
  'input[type="checkbox"]',
  "pre",
  "code",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("文章内容的 Markdown 元素均有 .article-content 样式", () => {
  for (const selector of REQUIRED_SELECTORS) {
    const rule = new RegExp(
      `\\.article-content ${escapeRegExp(selector)}(?=[\\s,{:\\[])`,
    );
    assert.ok(rule.test(css), `site.css 缺少 .article-content ${selector} 规则`);
  }
});
