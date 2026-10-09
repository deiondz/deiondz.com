import type { MetadataRoute } from "next";
import { articleUrl, getArticles } from "~/lib/blog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const articles = await getArticles();
	const latestUpdate = articles.reduce<string | undefined>(
		(latest, article) =>
			!latest || Date.parse(article.updatedAt) > Date.parse(latest)
				? article.updatedAt
				: latest,
		undefined,
	);
	return [
		{ url: "https://deiondz.com/" },
		{ url: "https://deiondz.com/blog/", lastModified: latestUpdate },
		{ url: "https://deiondz.com/blog/feed/", lastModified: latestUpdate },
		...articles.map((article) => ({
			url: articleUrl(article.slug),
			lastModified: article.updatedAt,
			images: Array.from(
				new Set([
					...(article.coverImage ? [article.coverImage.url] : []),
					...article.content.flatMap((block) =>
						block.type === "image" ? [block.image.url] : [],
					),
				]),
			),
		})),
	];
}
