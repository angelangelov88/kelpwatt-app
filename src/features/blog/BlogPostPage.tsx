import { Link, useParams } from "react-router";
import useAuth from "../auth/useAuth";
import BlogMarkdown from "./BlogMarkdown";
import { findPost, formatPostDate } from "./blogPosts";
import usePageMeta from "./usePageMeta";

const MAIN =
  "w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6 text-sm sm:text-base text-gray-300 leading-relaxed";
const LINK = "text-violet-400 hover:underline";
const BUTTON =
  "self-start px-4 py-2 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400";

// One article. Open to everyone; the box at the end offers sign up, or the
// dashboard to someone signed in (past the authenticator step, if they use
// one).
const BlogPostPage = () => {
  const { slug = "" } = useParams();
  const { status } = useAuth();
  const isSignedIn = status === "signedIn";
  const post = findPost(slug);
  usePageMeta(post?.title ?? "Post not found", post?.description ?? "");

  if (!post)
    return (
      <main className={MAIN}>
        <h1 className="text-xl font-semibold text-strong">Post not found</h1>
        <p>
          There&apos;s no post at this address.{" "}
          <Link to="/blog" className={LINK}>
            See all posts
          </Link>
          .
        </p>
      </main>
    );

  return (
    <main className={MAIN}>
      <Link to="/blog" className={`self-start text-sm ${LINK}`}>
        ← All posts
      </Link>
      <article className="flex flex-col gap-4">
        <header>
          <h1 className="text-xl sm:text-2xl font-semibold text-strong">
            {post.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </p>
        </header>
        <BlogMarkdown body={post.body} />
      </article>
      <aside
        aria-labelledby="blog-try-heading"
        className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex flex-col gap-3"
      >
        <h2
          id="blog-try-heading"
          className="text-base font-semibold text-strong"
        >
          {isSignedIn ? "Try it on your battery" : "Try Kelpwatt"}
        </h2>
        <p className="text-sm text-gray-400">
          {isSignedIn
            ? "Everything in this guide is on your dashboard and in Settings."
            : "Free, and works with just your Growatt account. Add Octopus whenever you like."}
        </p>
        <Link to={isSignedIn ? "/" : "/signup"} className={BUTTON}>
          {isSignedIn ? "Open your dashboard" : "Create an account"}
        </Link>
      </aside>
    </main>
  );
};

export default BlogPostPage;
