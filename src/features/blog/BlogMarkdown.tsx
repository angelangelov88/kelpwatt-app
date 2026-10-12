import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { Link } from "react-router";
import type { BlogMarkdownProps } from "../../types/Blog";

const LINK = "text-violet-400 hover:underline";

// Articles link to our pages by their full address, so the links still work
// when an article is copied to Medium or elsewhere.
const SITE_ORIGIN = "https://kelpwatt.angelov.uk";

// The in-app path for a link to one of our pages, or null for another site.
const toAppPath = (href: string) => {
  if (href.startsWith("/")) return href;
  if (href === SITE_ORIGIN) return "/";
  if (href.startsWith(`${SITE_ORIGIN}/`)) return href.slice(SITE_ORIGIN.length);
  return null;
};

// Our classes for each tag, in place of a typography plugin. Links to our own
// pages stay in the app, even on localhost or a preview; others open in a new
// tab.
const COMPONENTS: Components = {
  h2: ({ children }) => (
    <h2 className="mt-4 text-lg font-semibold text-strong">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 text-base font-semibold text-strong">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 flex flex-col gap-1.5 [li_&]:mt-1.5">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 flex flex-col gap-1.5 [li_&]:mt-1.5">
      {children}
    </ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-100">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-800 px-1 py-0.5 text-[0.9em]">
      {children}
    </code>
  ),
  a: ({ href = "", children }) => {
    const path = toAppPath(href);
    return path === null ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
        {children}
      </a>
    ) : (
      <Link to={path} className={LINK}>
        {children}
      </Link>
    );
  },
};

// An article's Markdown as React elements. Raw HTML in the Markdown is left
// out, and unsafe link addresses are dropped.
const BlogMarkdown = ({ body }: BlogMarkdownProps) => (
  <div className="flex flex-col gap-4">
    <Markdown components={COMPONENTS}>{body}</Markdown>
  </div>
);

export default BlogMarkdown;
