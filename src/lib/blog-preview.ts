import "server-only";
import { cookies, draftMode } from "next/headers";
import { cache } from "react";
import { getArticles } from "~/lib/blog";
import { loadPreviewArticle } from "~/lib/strapi";

export const getBlogPageArticles = cache(async () => {
	if (!(await draftMode()).isEnabled) return getArticles();
	const documentId = (await cookies()).get("blog-preview-document")?.value;
	if (!documentId) return getArticles();
	const article = await loadPreviewArticle(documentId);
	const published = await getArticles();
	return article
		? [article, ...published.filter((item) => item.slug !== article.slug)]
		: published;
});
