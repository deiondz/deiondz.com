import { articleUrl, getArticles } from "~/lib/blog";

export const dynamic = "force-dynamic";
const escapeXml = (value: string) =>
	value.replace(
		/[<>&"']/g,
		(character) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[character] || character,
	);

export async function GET() {
	const articles = await getArticles();
	const items = articles
		.map(
			(article) =>
				`<item><title>${escapeXml(article.title)}</title><link>${articleUrl(article.slug)}</link><guid isPermaLink="true">${articleUrl(article.slug)}</guid><description>${escapeXml(article.excerpt)}</description><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>${article.categories.map((category) => `<category>${escapeXml(category.name)}</category>`).join("")}</item>`,
		)
		.join("");
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Deion D'Souza — Blog</title><link>https://deiondz.com/blog/</link><description>Articles and notes by Deion D'Souza.</description><language>en</language><atom:link href="https://deiondz.com/blog/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
		{
			headers: {
				"Content-Type": "application/rss+xml; charset=utf-8",
				"Content-Disposition": "inline",
			},
		},
	);
}
