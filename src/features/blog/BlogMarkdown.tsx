import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { Link } from "react-router";
import type { BlogMarkdownProps } from "../../types/Blog";

const LINK = "text-violet-400 hover:underline";

// Our classes for each tag, in place of a typography plugin. Links to our own
// pages stay in the app; others open in a new tab.
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
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link to={href} className={LINK}>
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
        {children}
      </a>
    ),
};

// An article's Markdown as React elements. Raw HTML in the Markdown is left
// out, and unsafe link addresses are dropped.
const BlogMarkdown = ({ body }: BlogMarkdownProps) => (
  <div className="flex flex-col gap-4">
    <Markdown components={COMPONENTS}>{body}</Markdown>
  </div>
);

export default BlogMarkdown;
