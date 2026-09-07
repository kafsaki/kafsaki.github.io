import path from "node:path";
import { Marked } from "marked";
import hljs from "highlight.js/lib/common";

// Markdown-to-HTML rendering pipeline: syntax highlighting, GFM footnotes and
// local image resolution. Pure string processing — no filesystem access, so
// tests can exercise it directly. Site assembly lives in build.mjs.

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

const isExternalImage = (href) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#)/i.test(href) &&
  !/^[a-z]:[\\/]/i.test(href);

function resolveImageSource(href, sourceFile, contentDir) {
  const rawHref = String(href || "").trim();
  if (!rawHref || isExternalImage(rawHref)) return rawHref;

  const normalizedHref = rawHref.replace(/\\/g, "/");
  const sourceRoot = path.resolve(contentDir);
  const sourceDir = path.dirname(sourceFile);
  const absoluteSource = /^[a-z]:\//i.test(normalizedHref)
    ? path.win32.normalize(normalizedHref)
    : path.resolve(sourceDir, normalizedHref);
  const relativeAsset = path.relative(sourceRoot, absoluteSource);
  if (
    !relativeAsset ||
    relativeAsset.startsWith("..") ||
    path.isAbsolute(relativeAsset)
  )
    return rawHref;

  const assetUrl = `../assets/${relativeAsset.split(path.sep).join("/")}`;
  return encodeURI(assetUrl);
}

// Code blocks are highlighted at build time so pages ship static markup.
// Every block gets a header with its language label; unlabeled fences show "text".
function renderCodeBlock({ text, lang }) {
  const language = (lang || "").trim().split(/\s+/)[0].toLowerCase();
  const supported = language && hljs.getLanguage(language);
  let code;
  try {
    code = supported
      ? hljs.highlight(text, { language }).value
      : escapeHtml(text);
  } catch {
    code = escapeHtml(text);
  }
  return `<figure class="code-block">
  <figcaption class="code-block-header">
    <span class="code-block-lang">${escapeHtml(language || "text")}</span>
  </figcaption>
  <pre><code class="hljs${supported ? ` language-${language}` : ""}">${code}</code></pre>
</figure>`;
}

// Footnote ids become HTML anchors; keep them safe for href and CSS use.
const footnoteAnchor = (id) =>
  String(id)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "note";

// GFM footnotes, kept local so the generator needs no extra plugins:
// definitions are collected while lexing, references are numbered in order
// of first use, and the list is appended after the article body.
function createFootnoteSupport(state) {
  const footnoteDef = {
    name: "footnoteDef",
    level: "block",
    start(src) {
      return src.match(/^ {0,3}\[\^[^\]\n]+\]:/m)?.index;
    },
    tokenizer(src) {
      const match = /^ {0,3}\[\^([^\]\n]+)\]:[ \t]*(.*?)(?:\n|$)/.exec(src);
      if (!match) return;
      let raw = match[0];
      const lines = [match[2]];
      let rest = src.slice(raw.length);
      let blanks = "";
      // Continuation lines indented like list items belong to the definition.
      while (rest) {
        const eol = rest.indexOf("\n");
        const line = eol === -1 ? rest : rest.slice(0, eol + 1);
        if (!line.trim()) {
          blanks += line;
          rest = rest.slice(line.length);
          continue;
        }
        if (!/^(?: {2,}|\t)/.test(line)) break;
        raw += blanks + line;
        lines.push(
          (blanks ? "\n" : "") + line.replace(/^(?: {1,4}|\t)/, "").trimEnd(),
        );
        blanks = "";
        rest = rest.slice(line.length);
      }
      const anchor = footnoteAnchor(match[1]);
      if (!state.defs.has(anchor))
        state.defs.set(anchor, lines.join("\n").trim());
      return { type: "footnoteDef", raw };
    },
    renderer() {
      return "";
    },
  };
  const footnoteRef = {
    name: "footnoteRef",
    level: "inline",
    start(src) {
      return src.match(/\[\^/)?.index;
    },
    tokenizer(src) {
      const match = /^\[\^([^\]\n]+)\]/.exec(src);
      if (!match) return;
      return { type: "footnoteRef", raw: match[0], id: match[1].trim() };
    },
    renderer(token) {
      const anchor = footnoteAnchor(token.id);
      if (!state.defs.has(anchor)) return escapeHtml(token.raw);
      let index = state.order.indexOf(anchor);
      if (index === -1) {
        state.order.push(anchor);
        index = state.order.length - 1;
      }
      const count = (state.refs.get(anchor) || 0) + 1;
      state.refs.set(anchor, count);
      const refId =
        count === 1 ? `fnref-${anchor}` : `fnref-${anchor}-${count}`;
      return `<sup class="footnote-ref" id="${refId}"><a href="#fn-${anchor}">${index + 1}</a></sup>`;
    },
  };
  return [footnoteDef, footnoteRef];
}

function renderFootnotes(state, md) {
  if (!state.order.length) return "";
  const items = [...state.order]
    .map((anchor, index) => {
      const content = md.parseInline(state.defs.get(anchor) ?? "");
      const total = state.refs.get(anchor) || 1;
      const backlinks = Array.from({ length: total }, (_, k) => {
        const target =
          k === 0 ? `fnref-${anchor}` : `fnref-${anchor}-${k + 1}`;
        return `<a href="#${target}" class="footnote-backref" aria-label="返回正文中第 ${index + 1} 条脚注的引用位置">↩</a>`;
      }).join("");
      return `<li id="fn-${anchor}" class="footnote-item">${content}${backlinks}</li>`;
    })
    .join("\n");
  return `<section class="footnotes" role="doc-endnotes" aria-label="脚注">
<ol class="footnotes-list">
${items}
</ol>
</section>`;
}

// Local images resolve relative to the article and must stay inside
// contentDir; anything outside is left untouched.
function createMarkdownRenderer(contentDir) {
  return function renderMarkdown(body, sourceFile) {
    const md = new Marked();
    const state = { defs: new Map(), order: [], refs: new Map() };
    md.use(
      {
        renderer: {
          image({ href, title, text }) {
            const src = resolveImageSource(href, sourceFile, contentDir);
            const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
            return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text || "")}"${titleAttribute}>`;
          },
          code: renderCodeBlock,
        },
      },
      { extensions: createFootnoteSupport(state) },
    );
    // A definition directly below a paragraph line would be swallowed by the
    // paragraph tokenizer, so give it the blank line Markdown expects.
    const normalized = body
      .replace(/\r\n?/g, "\n")
      .replace(/([^\n])\n( {0,3}\[\^[^\]\n]+\]:)/g, "$1\n\n$2");
    return md.parse(normalized) + renderFootnotes(state, md);
  };
}

export { createMarkdownRenderer, escapeHtml };
