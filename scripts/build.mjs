import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
const publicDir = path.join(root, "public");
const templatesDir = path.join(root, "src", "templates");
const stylesDir = path.join(root, "src", "styles");
const scriptsDir = path.join(root, "src", "scripts");
const assetsDir = path.join(publicDir, "assets");

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
const readingMinutes = (body) => {
  const plain = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*`\[\]()_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cjkCount = (plain.match(/[\u3400-\u9fff]/g) || []).length;
  const wordCount = (plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [])
    .length;
  return Math.max(1, Math.ceil(cjkCount / 450 + wordCount / 200));
};

const isExternalImage = (href) =>
  /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#)/i.test(href) &&
  !/^[a-z]:[\\/]/i.test(href);

function resolveImageSource(href, sourceFile) {
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

function renderMarkdown(body, sourceFile) {
  const renderer = new marked.Renderer();
  renderer.image = ({ href, title, text }) => {
    const src = resolveImageSource(href, sourceFile);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text || "")}"${titleAttribute}>`;
  };
  return marked.parse(body, {
    renderer,
  });
}

async function copyContentAssets(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) await copyContentAssets(sourcePath, targetPath);
    else if (!entry.name.endsWith(".md"))
      await fs.copyFile(sourcePath, targetPath);
  }
}

// Front matter is intentionally small: scalar values and [comma, separated] lists cover the site format.
function parseFrontMatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.startsWith("[") && value.endsWith("]"))
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    else value = value.replace(/^['"]|['"]$/g, "");
    data[key] = value;
  }
  return { data, body: match[2] };
}

async function readPosts() {
  const files = (await fs.readdir(contentDir)).filter((file) =>
    file.endsWith(".md"),
  );
  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(contentDir, file), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const title = data.title || file.replace(/\.md$/, "");
    const date = data.date || new Date().toISOString().slice(0, 10);
    const tags = Array.isArray(data.tags)
      ? data.tags
      : data.tags
        ? [data.tags]
        : [];
    const categories = Array.isArray(data.categories)
      ? data.categories
      : data.categories
        ? [data.categories]
        : [];
    const sourcePath = path.join(contentDir, file);
    posts.push({
      title,
      date: String(date).slice(0, 10),
      tags,
      categories,
      slug: slugify(title),
      readingMinutes: readingMinutes(body),
      html: renderMarkdown(body, sourcePath),
      excerpt: body
        .replace(/[#>*`\[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180),
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

// Templates stay readable in src/templates; this replacement keeps the generator dependency-free.
async function renderTemplate(name, data) {
  const template = await fs.readFile(path.join(templatesDir, name), "utf8");
  const rendered = template.replace(
    /\{\{([\s\S]*?)\}\}/g,
    (_, key) => data[key.trim()] ?? "",
  );
  // Optional slots can be empty; remove their indentation-only lines from generated HTML.
  return rendered.replace(/^[ \t]+$/gm, "");
}

const dateAnchor = (post) => `archives.html#date-${slugify(post.date)}`;
const tagAnchor = (tag) => `tags.html#tag-${slugify(tag)}`;
const categoryAnchor = (category) =>
  `categories.html#category-${slugify(category)}`;
const postCategories = (post) =>
  post.categories.length ? post.categories : ["未分类"];

// These helpers keep generated markup consistent across index, archive, and taxonomy pages.
const tagChips = (tags, prefix = "") =>
  tags
    .map(
      (tag) =>
        `<a class="meta-chip meta-tag" href="${prefix}${tagAnchor(tag)}">
          ${escapeHtml(tag)}
        </a>`,
    )
    .join("");
const categoryChips = (post, prefix = "") =>
  postCategories(post)
    .map(
      (category) =>
        `<a class="meta-chip meta-category" href="${prefix}${categoryAnchor(category)}">
          ${escapeHtml(category)}
        </a>`,
    )
    .join("");
const postCard = (post) => {
  const tagsMarkup = post.tags.length
    ? `<div class="meta-tags-scroll" tabindex="0" aria-label="文章标签，可使用滚轮横向浏览">
        <div class="meta-row meta-tags">${tagChips(post.tags)}</div>
      </div>`
    : "";

  return `
  <article class="post-card" data-post-url="posts/${post.slug}.html" tabindex="0">
    <div class="post-meta">
      <div class="meta-row meta-categories">${categoryChips(post)}</div>
    </div>
    <h2><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2>
    <p>${escapeHtml(post.excerpt)}${post.excerpt.length >= 180 ? "..." : ""}</p>
    <div class="post-footer">
      <div class="post-info">
        <a class="meta-chip meta-date" href="${dateAnchor(post)}">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
        </a>
        <span class="reading-time">阅读时长 · ${post.readingMinutes} 分钟</span>
      </div>
${tagsMarkup}
    </div>
  </article>`;
};

const taxonomyFilter = (label, filter, active = false) =>
  `<button class="taxonomy-filter${active ? " is-active" : ""}" type="button" data-filter="${escapeHtml(filter)}" aria-pressed="${active}">
    ${escapeHtml(label)}
  </button>`;
const taxonomyPostNode = (post, filterKeys) => `
  <a class="taxonomy-post-node" href="posts/${post.slug}.html" data-tags="${escapeHtml(filterKeys)}">
    <span class="taxonomy-post-title">${escapeHtml(post.title)}</span>
    <time class="taxonomy-post-date" datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
  </a>`;
const taxonomyBranch = ({
  id,
  label,
  count,
  filters,
  filterLabel,
  posts,
  extraClass = "",
}) => `
  <section class="taxonomy-branch${extraClass ? ` ${extraClass}` : ""}" id="${id}">
    <button class="taxonomy-node" type="button" aria-expanded="false">
      <span class="taxonomy-node-marker" aria-hidden="true">+</span>
      <span>${label}</span>
      <small>${count} 篇</small>
    </button>
    <div class="taxonomy-branch-body" aria-hidden="true">
      <div class="taxonomy-filters" aria-label="${escapeHtml(filterLabel)}">${filters}</div>
      <div class="taxonomy-post-nodes">${posts}</div>
    </div>
  </section>`;

async function main() {
  if (process.argv.includes("--clean")) {
    await fs.rm(publicDir, { recursive: true, force: true });
    return;
  }
  const posts = await readPosts();
  await fs.rm(publicDir, { recursive: true, force: true });
  await fs.mkdir(path.join(publicDir, "posts"), { recursive: true });
  await copyContentAssets(contentDir, assetsDir);
  await fs.copyFile(
    path.join(stylesDir, "site.css"),
    path.join(publicDir, "site.css"),
  );
  await fs.copyFile(
    path.join(scriptsDir, "background.js"),
    path.join(publicDir, "background.js"),
  );
  await fs.copyFile(
    path.join(scriptsDir, "interactions.js"),
    path.join(publicDir, "interactions.js"),
  );
  await fs.copyFile(
    path.join(scriptsDir, "taxonomy.js"),
    path.join(publicDir, "taxonomy.js"),
  );
  const cards = posts.map(postCard).join("\n");
  const index = await renderTemplate("index.html", {
    title: "kafsaki's blog",
    content: cards,
    count: posts.length,
  });
  await fs.writeFile(path.join(publicDir, "index.html"), index);
  for (const post of posts) {
    const categories = postCategories(post)
      .map(
        (category) =>
          `<a class="meta-chip meta-category" href="../${categoryAnchor(category)}">
            ${escapeHtml(category)}
          </a>`,
      )
      .join("");
    const tags = post.tags.length
      ? `<div class="article-tags-scroll" tabindex="0" aria-label="文章标签，可使用滚轮横向浏览">
          <div class="meta-row meta-tags">${tagChips(post.tags, "../")}</div>
        </div>`
      : "";
    const html = await renderTemplate("post.html", {
      title: escapeHtml(post.title),
      date: escapeHtml(post.date),
      dateAnchor: slugify(post.date),
      categories,
      tags,
      readingTime: `阅读时长 · ${post.readingMinutes} 分钟`,
      content: post.html,
    });
    await fs.writeFile(
      path.join(publicDir, "posts", `${post.slug}.html`),
      html,
    );
  }
  const archiveGroups = Object.groupBy
    ? Object.groupBy(posts, (post) => post.date.slice(0, 7))
    : posts.reduce(
        (groups, post) => (
          (groups[post.date.slice(0, 7)] ??= []).push(post),
          groups
        ),
        {},
      );
  const archive = Object.entries(archiveGroups)
    .map(([month, entries]) => {
      const dates = Object.groupBy
        ? Object.groupBy(entries, (post) => post.date)
        : entries.reduce(
            (groups, post) => ((groups[post.date] ??= []).push(post), groups),
            {},
          );
      const dateSections = Object.entries(dates)
        .map(
          ([date, dateEntries]) =>
            `<section class="archive-date" id="date-${slugify(date)}">
              <h3>${escapeHtml(date)}</h3>
              ${dateEntries.map(postCard).join("")}
            </section>`,
        )
        .join("");
      return `<section class="archive-month">
        <h2>${month}</h2>
        ${dateSections}
      </section>`;
    })
    .join("");
  const archiveTimelineGroups = Object.entries(archiveGroups)
    .map(([month, entries]) => {
      const dates = [...new Set(entries.map((post) => post.date))];
      const links = dates
        .map(
          (date) =>
            `<a class="archive-timeline-link" href="#date-${slugify(date)}">
              <span>${escapeHtml(date.slice(5))}</span>
              <small>${entries.filter((post) => post.date === date).length} 篇</small>
            </a>`,
        )
        .join("");
      return `<div class="archive-timeline-group">
        <span class="archive-timeline-month">${escapeHtml(month)}</span>
        ${links}
      </div>`;
    })
    .join("");
  const archiveTimeline = `<aside class="archive-timeline" aria-label="归档时间轴">
    <div class="archive-timeline-heading">
      <span class="section-kicker">TIMELINE</span>
      <span>按日期跳转</span>
    </div>
    <nav class="archive-timeline-nav">${archiveTimelineGroups}</nav>
  </aside>`;
  await fs.writeFile(
    path.join(publicDir, "archives.html"),
    await renderTemplate("page.html", {
      title: "归档",
      kicker: "CONTENT / ARCHIVES",
      lead: "按发布时间浏览文章。",
      content: archive,
      sidebar: archiveTimeline,
    }),
  );
  const tags = [...new Set(posts.flatMap((post) => post.tags))].sort();
  const untaggedPosts = posts.filter((post) => post.tags.length === 0);
  const tagEntries = tags.map((tag) => [
    tag,
    posts.filter((post) => post.tags.includes(tag)),
  ]);
  const tagBranches = tagEntries
    .map(([tag, entries]) => {
      const categoryFilters = [
        ...new Set(entries.flatMap(postCategories)),
      ].sort((a, b) => a.localeCompare(b, "zh-CN"));
      const filters = [
        taxonomyFilter("全部分类", "all", true),
        ...categoryFilters.map((category) =>
          taxonomyFilter(category, slugify(category)),
        ),
      ].join("");
      const postNodes = entries
        .map((post) =>
          taxonomyPostNode(
            post,
            postCategories(post)
              .map((category) => slugify(category))
              .join(" "),
          ),
        )
        .join("");
      return taxonomyBranch({
        id: `tag-${slugify(tag)}`,
        label: escapeHtml(tag),
        count: entries.length,
        filters,
        filterLabel: `${tag} 分类筛选`,
        posts: postNodes,
        extraClass: "tag-branch",
      });
    })
    .join("");
  const untaggedBranch = untaggedPosts.length
    ? (() => {
        const tag = "无标签";
        const entries = untaggedPosts;
        const categoryFilters = [
          ...new Set(entries.flatMap(postCategories)),
        ].sort((a, b) => a.localeCompare(b, "zh-CN"));
        const filters = [
          taxonomyFilter("全部分类", "all", true),
          ...categoryFilters.map((category) =>
            taxonomyFilter(category, slugify(category)),
          ),
        ].join("");
        const postNodes = entries
          .map((post) =>
            taxonomyPostNode(
              post,
              postCategories(post)
                .map((category) => slugify(category))
                .join(" "),
            ),
          )
          .join("");
        return taxonomyBranch({
          id: `tag-${slugify(tag)}`,
          label: escapeHtml(tag),
          count: entries.length,
          filters,
          filterLabel: `${tag} 分类筛选`,
          posts: postNodes,
          extraClass: "tag-branch",
        });
      })()
    : "";
  const untaggedMap = untaggedBranch
    ? `<section class="taxonomy-map tag-map tag-untagged-map" id="untagged-map" aria-label="无标签文章">
        <div class="taxonomy-root">
          <span class="taxonomy-root-label">NO TAG</span>
          <strong>${untaggedPosts.length} 篇文章</strong>
        </div>
        <div class="taxonomy-branches">${untaggedBranch}</div>
      </section>`
    : "";
  await fs.writeFile(
    path.join(publicDir, "tags.html"),
    await renderTemplate("tags.html", {
      count: tagEntries.length,
      postCount: posts.length,
      content: tagBranches,
      untaggedMap,
    }),
  );
  const categoryGroups = new Map();
  const uncategorizedPosts = [];
  for (const post of posts) {
    if (!post.categories.length) {
      uncategorizedPosts.push(post);
      continue;
    }
    const categories = post.categories;
    for (const category of categories) {
      if (!categoryGroups.has(category)) categoryGroups.set(category, []);
      categoryGroups.get(category).push(post);
    }
  }
  const categoryBranches = [...categoryGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([category, entries]) => {
      const categoryTags = [
        ...new Set(entries.flatMap((post) => post.tags)),
      ].sort();
      const filters = [
        taxonomyFilter("全部标签", "all", true),
        ...categoryTags.map((tag) => taxonomyFilter(tag, slugify(tag))),
      ].join("");
      const postNodes = entries
        .map((post) =>
          taxonomyPostNode(
            post,
            post.tags.map((tag) => slugify(tag)).join(" "),
          ),
        )
        .join("");
      return taxonomyBranch({
        id: `category-${slugify(category)}`,
        label: escapeHtml(category),
        count: entries.length,
        filters,
        filterLabel: `${category} 标签筛选`,
        posts: postNodes,
      });
    })
    .join("");
  const uncategorizedMap = uncategorizedPosts.length
    ? (() => {
        const category = "未分类";
        const categoryTags = [
          ...new Set(uncategorizedPosts.flatMap((post) => post.tags)),
        ].sort();
        const filters = [
          taxonomyFilter("全部标签", "all", true),
          ...categoryTags.map((tag) => taxonomyFilter(tag, slugify(tag))),
        ].join("");
        const postNodes = uncategorizedPosts
          .map((post) =>
            taxonomyPostNode(
              post,
              post.tags.map((tag) => slugify(tag)).join(" "),
            ),
          )
          .join("");
        const branch = taxonomyBranch({
          id: `category-${slugify(category)}`,
          label: category,
          count: uncategorizedPosts.length,
          filters,
          filterLabel: `${category} 标签筛选`,
          posts: postNodes,
        });
        return `<section class="taxonomy-map taxonomy-uncategorized-map" id="uncategorized-map" aria-label="未分类文章">
          <div class="taxonomy-root">
            <span class="taxonomy-root-label">UNCATEGORIZED</span>
            <strong>${uncategorizedPosts.length} 篇文章</strong>
          </div>
          <div class="taxonomy-branches">${branch}</div>
        </section>`;
      })()
    : "";
  await fs.writeFile(
    path.join(publicDir, "categories.html"),
    await renderTemplate("categories.html", {
      count: posts.length,
      categoryCount: categoryGroups.size,
      content: categoryBranches,
      uncategorizedMap,
    }),
  );
  await fs.writeFile(
    path.join(publicDir, "about.html"),
    await renderTemplate("page.html", {
      title: "关于",
      kicker: "ABOUT / KAFSAKI",
      lead: "记录技术学习、系统编程与 AI Agent 实践。",
      content: "<p>这里保存个人技术实践、问题复盘与持续构建记录。</p>",
      sidebar: "",
    }),
  );
  console.log(
    `Built ${posts.length} posts into ${path.relative(root, publicDir)}/`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
