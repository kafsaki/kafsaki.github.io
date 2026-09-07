import { createContentLoader } from "vitepress";
import {
  slugify,
  stripFrontMatter,
  plainText,
  readingMinutes,
} from "../../scripts/utils.mjs";

export interface Post {
  title: string;
  date: string;
  tags: string[];
  categories: string[];
  url: string;
  excerpt: string;
  readingMinutes: number;
}

declare const data: Post[];
export { data };

// gray-matter hands dates back as Date objects; normalize to YYYY-MM-DD.
const toDateString = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
};

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

export default createContentLoader("posts/*.md", {
  includeSrc: true,
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, src }) => {
        const body = stripFrontMatter(src ?? "");
        const title = frontmatter.title
          ? String(frontmatter.title)
          : decodeURIComponent(url.split("/").pop()!.replace(/\.html$/, ""));
        return {
          title,
          date: toDateString(frontmatter.date),
          tags: asStringList(frontmatter.tags),
          categories: asStringList(frontmatter.categories),
          url,
          excerpt: plainText(body).slice(0, 180),
          readingMinutes: readingMinutes(body),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});

export { slugify };
