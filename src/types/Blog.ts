// One article from content/blog/. slug: the file name without .md, used in
// /blog/:slug. date: when it was published, as YYYY-MM-DD. body: the Markdown
// after the frontmatter.
type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  body: string;
};

type BlogMarkdownProps = { body: string };

export type { BlogPost, BlogMarkdownProps };
