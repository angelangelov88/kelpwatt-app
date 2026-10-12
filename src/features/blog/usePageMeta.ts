import { useEffect } from "react";

// Sets the browser tab title and the search description for a page, and puts
// back the app's own when the page closes.
const usePageMeta = (title: string, description: string) => {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousTitle = document.title;
    const previousDescription = meta?.content;
    document.title = `${title} · Kelpwatt`;
    if (meta) meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined)
        meta.content = previousDescription;
    };
  }, [title, description]);
};

export default usePageMeta;
