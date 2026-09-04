import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const publicDir = path.join(root, 'public');
const templatesDir = path.join(root, 'src', 'templates');
const stylesDir = path.join(root, 'src', 'styles');

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slugify = value => String(value).toLowerCase().trim().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');

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
    posts.push({ title, date: String(date).slice(0, 10), tags, categories, slug: slugify(title), html: marked.parse(body), excerpt: body.replace(/[#>*`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180) });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

async function renderTemplate(name, data) {
  const template = await fs.readFile(path.join(templatesDir, name), 'utf8');
  return template.replace(/\{\{([\s\S]*?)\}\}/g, (_, key) => data[key.trim()] ?? '');
}

const postCard = post => `<article class="post-card"><div class="post-meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>${post.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div><h2><a href="posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.excerpt)}${post.excerpt.length >= 180 ? '...' : ''}</p><a class="read-more" href="posts/${post.slug}.html">阅读全文 <span aria-hidden="true">→</span></a></article>`;

async function main() {
  if (process.argv.includes('--clean')) { await fs.rm(publicDir, { recursive: true, force: true }); return; }
  const posts = await readPosts();
  await fs.rm(publicDir, { recursive: true, force: true });
  await fs.mkdir(path.join(publicDir, 'posts'), { recursive: true });
  await fs.copyFile(path.join(stylesDir, 'site.css'), path.join(publicDir, 'site.css'));
  const cards = posts.map(postCard).join('\n');
  const index = await renderTemplate('index.html', { title: "kafsaki's blog", content: cards, count: posts.length });
  await fs.writeFile(path.join(publicDir, 'index.html'), index);
  for (const post of posts) {
    const html = await renderTemplate('post.html', { title: escapeHtml(post.title), date: escapeHtml(post.date), tags: post.tags.map(escapeHtml).join(', '), content: post.html });
    await fs.writeFile(path.join(publicDir, 'posts', `${post.slug}.html`), html);
  }
  const archiveGroups = Object.groupBy ? Object.groupBy(posts, post => post.date.slice(0, 7)) : posts.reduce((groups, post) => ((groups[post.date.slice(0, 7)] ??= []).push(post), groups), {});
  const archive = Object.entries(archiveGroups).map(([month, entries]) => `<section><h2>${month}</h2>${entries.map(postCard).join('')}</section>`).join('');
  await fs.writeFile(path.join(publicDir, 'archives.html'), await renderTemplate('page.html', { title: '归档', content: archive }));
  const tags = [...new Set(posts.flatMap(post => post.tags))].sort();
  const tagSections = tags.map(tag => `<section id="${slugify(tag)}"><h2>${escapeHtml(tag)}</h2>${posts.filter(post => post.tags.includes(tag)).map(postCard).join('')}</section>`).join('');
  await fs.writeFile(path.join(publicDir, 'tags.html'), await renderTemplate('page.html', { title: '标签', content: tagSections }));
  await fs.writeFile(path.join(publicDir, 'about.html'), await renderTemplate('page.html', { title: '关于', content: '<p>记录技术学习、系统编程与 AI Agent 实践。</p>' }));
  console.log(`Built ${posts.length} posts into ${path.relative(root, publicDir)}/`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
