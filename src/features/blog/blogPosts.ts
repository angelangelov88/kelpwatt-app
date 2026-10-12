import { z } from "zod";
import type { BlogPost } from "../../types/Blog";

// The articles in content/blog/, built into the blog's own chunk. Each starts
// with a frontmatter block:
//
//   ---
//   title: "Quotes around a value are optional"
//   description: One sentence for the list page and search results.
//   date: 2026-10-12
//   ---
//
// A file that breaks these rules throws when the blog loads, so it shows up
// straight away in dev rather than as a missing post.

const FILES = import.meta.glob<string>("/content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

// Lowercase words joined by hyphens: no dots, so the SPA rewrite in
// vercel.json still serves the page.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

const frontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.iso.date(),
});

// "key: value" lines. Splits at the first colon, so values can contain more.
const readFields = (block: string) =>
  Object.fromEntries(
    block
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const colon = line.indexOf(":");
        const value = line.slice(colon + 1).trim();
        return [line.slice(0, colon).trim(), value.replace(/^"(.*)"$/, "$1")];
      }),
  );

const parsePost = (path: string, raw: string): BlogPost => {
  const slug = path.slice(path.lastIndexOf("/") + 1, -".md".length);
  if (!SLUG.test(slug))
    throw new Error(
      `${path}: name it with lowercase words joined by hyphens, like getting-started.md`,
    );
  const match = FRONTMATTER.exec(raw);
  if (!match) throw new Error(`${path}: it must start with a --- block`);
  const fields = frontmatterSchema.safeParse(readFields(match[1]));
  if (!fields.success)
    throw new Error(`${path}: ${z.prettifyError(fields.error)}`);
  return { slug, ...fields.data, body: match[2].trim() };
};

// Newest first. Dates are YYYY-MM-DD, so they sort as text.
const BLOG_POSTS = Object.entries(FILES)
  .map(([path, raw]) => parsePost(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date));

const findPost = (slug: string) =>
  BLOG_POSTS.find((post) => post.slug === slug) ?? null;

// "2026-10-12" → "12 October 2026". Read as UTC, so it's the same day
// wherever the reader is.
const formatPostDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export { BLOG_POSTS, findPost, formatPostDate };
