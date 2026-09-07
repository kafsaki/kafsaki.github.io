// Shared text utilities used by the VitePress data loader and the node:test
// suite. Plain ESM with no dependencies so tests can import it directly.

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");

// The content loader hands us the raw file including frontmatter; only the
// body belongs in excerpts and reading time.
const stripFrontMatter = (raw) => {
  const match = String(raw).match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/);
  return match ? String(raw).slice(match[0].length) : String(raw);
};

// Footnote definitions, including their indented continuation lines.
const stripFootnoteDefinitions = (body) => {
  const kept = [];
  let inDefinition = false;
  for (const line of body.split("\n")) {
    if (/^ {0,3}\[\^[^\]\n]+\]:/.test(line)) {
      inDefinition = true;
      continue;
    }
    if (inDefinition) {
      if (!line.trim() || /^(?: {2,}|\t)/.test(line)) continue;
      inDefinition = false;
    }
    kept.push(line);
  }
  return kept.join("\n");
};

// plainText powers reading time and excerpts: fenced code, footnotes and link
// targets would otherwise leak into card text and word counts.
const plainText = (body) =>
  stripFootnoteDefinitions(body)
    .replace(/```[\s\S]*?(?:```|$)/g, " ")
    .replace(/\[\^[^\]\n]+\]/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`\[\]()_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const readingMinutes = (body) => {
  const plain = plainText(body);
  const cjkCount = (plain.match(/[㐀-鿿]/g) || []).length;
  const wordCount = (plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [])
    .length;
  return Math.max(1, Math.ceil(cjkCount / 450 + wordCount / 200));
};

export { slugify, stripFrontMatter, plainText, readingMinutes };
