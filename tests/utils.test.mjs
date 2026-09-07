import assert from "node:assert/strict";
import test from "node:test";
import {
  slugify,
  stripFrontMatter,
  plainText,
  readingMinutes,
} from "../scripts/utils.mjs";

test("slugify 处理英文、连字符与中文", () => {
  assert.equal(slugify("Category Test - Agent"), "category-test-agent");
  assert.equal(slugify("部署流程测试"), "部署流程测试");
  assert.equal(slugify("  Studying Hexo  "), "studying-hexo");
});

test("stripFrontMatter 去掉头部元数据", () => {
  const body = stripFrontMatter("---\ntitle: 标题\n---\n\n正文内容。");
  assert.equal(body, "正文内容。");
  assert.equal(stripFrontMatter("没有元数据。"), "没有元数据。");
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

test("readingMinutes 按中英混排估算且至少 1 分钟", () => {
  assert.equal(readingMinutes("短。"), 1);
  const longChinese = "字".repeat(900);
  assert.equal(readingMinutes(longChinese), 2);
  const longEnglish = Array.from({ length: 400 }, (_, i) => `word${i}`).join(
    " ",
  );
  assert.equal(readingMinutes(longEnglish), 2);
  // 代码块不计入阅读时长。
  assert.equal(readingMinutes("短。\n\n```\n" + "x".repeat(5000) + "\n```"), 1);
});
