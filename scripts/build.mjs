import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const publicDir = path.join(root, 'public');
const templatesDir = path.join(root, 'src', 'templates');
const stylesDir = path.join(root, 'src', 'styles');
const scriptsDir = path.join(root, 'src', 'scripts');
const assetsDir = path.join(publicDir, 'assets');

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slugify = value => String(value).toLowerCase().trim().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');

const isExternalImage = href => /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#)/i.test(href) && !/^[a-z]:[\\/]/i.test(href);

function resolveImageSource(href, sourceFile) {
  const rawHref = String(href || '').trim();
  if (!rawHref || isExternalImage(rawHref)) return rawHref;

  const normalizedHref = rawHref.replace(/\\/g, '/');
  const sourceRoot = path.resolve(contentDir);
  const sourceDir = path.dirname(sourceFile);
  const absoluteSource = /^[a-z]:\//i.test(normalizedHref)
    ? path.win32.normalize(normalizedHref)
    : path.resolve(sourceDir, normalizedHref);
  const relativeAsset = path.relative(sourceRoot, absoluteSource);
  if (!relativeAsset || relativeAsset.startsWith('..') || path.isAbsolute(relativeAsset)) return rawHref;

  const assetUrl = `../assets/${relativeAsset.split(path.sep).join('/')}`;
  return encodeURI(assetUrl);
}

function renderMarkdown(body, sourceFile) {
  const renderer = new marked.Renderer();
  renderer.image = ({ href, title, text }) => {
    const src = resolveImageSource(href, sourceFile);
    const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(text || '')}"${titleAttribute}>`;
  };
  return marked.parse(body, {
    renderer
  });
}

async function copyContentAssets(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  for (const entry of await fs.readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) await copyContentAssets(sourcePath, targetPath);
    else if (!entry.name.endsWith('.md')) await fs.copyFile(sourcePath, targetPath);
  }
}

function parseFrontMatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1).split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    else value = value.replace(/^['"]|['"]$/g, '');
    data[key] = value;
  }
  return { data, body: match[2] };
}

async function readPosts() {
  const files = (await fs.readdir(contentDir)).filter(file => file.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
    const { data, body } = parseFrontMatter(raw);
    const title = data.title || file.replace(/\.md$/, '');
    const date = data.date || new Date().toISOString().slice(0, 10);
    const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
    const categories = Array.isArray(data.categories) ? data.categories : data.categories ? [data.categories] : [];
    const sourcePath = path.join(contentDir, file);
    posts.push({ title, date: String(date).slice(0, 10), tags, categories, slug: slugify(title), html: renderMarkdown(body, sourcePath), excerpt: body.replace(/[#>*`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180) });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

async function renderTemplate(name, data) {
  const template = await fs.readFile(path.join(templatesDir, name), 'utf8');
  return template.replace(/\{\{([\s\S]*?)\}\}/g, (_, key) => data[key.trim()] ?? '');
}

const dateAnchor = post => `archives.html#date-${slugify(post.date)}`;
const tagAnchor = tag => `tags.html#tag-${slugify(tag)}`;
const postCard = post => `<article class="post-card" data-post-url="posts/${post.slug}.html" tabindex="0"><div class="post-meta"><a class="meta-chip meta-date" href="${dateAnchor(post)}"><time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time></a>${post.tags.map(tag => `<a class="meta-chip meta-tag" href="${tagAnchor(tag)}">${escapeHtml(tag)}</a>`).join('')}</div><h2><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.excerpt)}${post.excerpt.length >= 180 ? '...' : ''}</p><a class="read-more" href="posts/${post.slug}.html">阅读全文 <span aria-hidden="true">→</span></a></article>`;

async function main() {
  if (process.argv.includes('--clean')) { await fs.rm(publicDir, { recursive: true, force: true }); return; }
  const posts = await readPosts();
  await fs.rm(publicDir, { recursive: true, force: true });
  await fs.mkdir(path.join(publicDir, 'posts'), { recursive: true });
  await copyContentAssets(contentDir, assetsDir);
  await fs.copyFile(path.join(stylesDir, 'site.css'), path.join(publicDir, 'site.css'));
  await fs.copyFile(path.join(scriptsDir, 'background.js'), path.join(publicDir, 'background.js'));
  await fs.copyFile(path.join(scriptsDir, 'interactions.js'), path.join(publicDir, 'interactions.js'));
  const cards = posts.map(postCard).join('\n');
  const index = await renderTemplate('index.html', { title: "kafsaki's blog", content: cards, count: posts.length });
  await fs.writeFile(path.join(publicDir, 'index.html'), index);
  for (const post of posts) {
    const html = await renderTemplate('post.html', { title: escapeHtml(post.title), date: escapeHtml(post.date), tags: post.tags.map(escapeHtml).join(', '), content: post.html });
    await fs.writeFile(path.join(publicDir, 'posts', `${post.slug}.html`), html);
  }
  const archiveGroups = Object.groupBy ? Object.groupBy(posts, post => post.date.slice(0, 7)) : posts.reduce((groups, post) => ((groups[post.date.slice(0, 7)] ??= []).push(post), groups), {});
  const archive = Object.entries(archiveGroups).map(([month, entries]) => {
    const dates = Object.groupBy ? Object.groupBy(entries, post => post.date) : entries.reduce((groups, post) => ((groups[post.date] ??= []).push(post), groups), {});
    const dateSections = Object.entries(dates).map(([date, dateEntries]) => `<section class="archive-date" id="date-${slugify(date)}"><h3>${escapeHtml(date)}</h3>${dateEntries.map(postCard).join('')}</section>`).join('');
    return `<section class="archive-month"><h2>${month}</h2>${dateSections}</section>`;
  }).join('');
  await fs.writeFile(path.join(publicDir, 'archives.html'), await renderTemplate('page.html', { title: '归档', content: archive }));
  const tags = [...new Set(posts.flatMap(post => post.tags))].sort();
  const tagSections = tags.map(tag => `<section class="tag-section" id="tag-${slugify(tag)}"><h2>${escapeHtml(tag)}</h2>${posts.filter(post => post.tags.includes(tag)).map(postCard).join('')}</section>`).join('');
  await fs.writeFile(path.join(publicDir, 'tags.html'), await renderTemplate('page.html', { title: '标签', content: tagSections }));
  await fs.writeFile(path.join(publicDir, 'about.html'), await renderTemplate('page.html', { title: '关于', content: '<p>记录技术学习、系统编程与 AI Agent 实践。</p>' }));
  console.log(`Built ${posts.length} posts into ${path.relative(root, publicDir)}/`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
