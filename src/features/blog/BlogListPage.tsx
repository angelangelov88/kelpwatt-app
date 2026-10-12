import { Link } from "react-router";
import { BLOG_POSTS, findPost, formatPostDate } from "./blogPosts";
import usePageMeta from "./usePageMeta";

const START_HERE = findPost("getting-started");

// Every article, newest first. Open to everyone, signed in or not.
const BlogListPage = () => {
  usePageMeta(
    "Blog",
    "Guides to Kelpwatt: charging and exporting your Growatt battery, and using it with Intelligent Octopus.",
  );

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8 text-sm text-gray-300 leading-relaxed">
      <div>
        <h1 className="text-xl font-semibold text-strong">Blog</h1>
        <p className="mt-1 text-gray-500">
          Guides to getting the most from your Growatt battery and your Octopus
          tariff with Kelpwatt.
        </p>
        {START_HERE && (
          <p className="mt-3">
            New to Kelpwatt? Start with{" "}
            <Link
              to={`/blog/${START_HERE.slug}`}
              className="text-violet-400 hover:underline"
            >
              Getting started
            </Link>
            .
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-4">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <article className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
              <h2 className="text-base font-semibold text-strong">
                <Link to={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              </p>
              <p className="mt-2 text-gray-400">{post.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default BlogListPage;
