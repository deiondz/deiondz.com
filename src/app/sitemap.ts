import type { MetadataRoute } from "next";
import { articleUrl, getArticles } from "~/lib/blog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: "https://deiondz.com/" },
		{ url: "https://deiondz.com/blog/" },
		...getArticles().map((article) => ({
			url: articleUrl(article.slug),
			lastModified: article.updatedAt,
		})),
	];
}
