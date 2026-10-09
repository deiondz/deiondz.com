import "server-only";
import type { Article } from "~/lib/blog";
import { normalizeArticles } from "../../scripts/blog-content.mjs";

const cacheMilliseconds = 60_000;
let cached: { articles: Article[]; expires: number } | undefined;
let pending: Promise<Article[]> | undefined;

export async function loadPreviewArticle(
	documentId: string,
): Promise<Article | null> {
	if (!/^[a-zA-Z0-9]+$/.test(documentId)) return null;
	const base = process.env.STRAPI_URL || "https://strapi.deiondz.com";
	const token = process.env.STRAPI_READ_TOKEN;
	if (!token) throw new Error("STRAPI_READ_TOKEN is required on the server.");
	const url = new URL(`/api/articles/${documentId}`, base);
	url.searchParams.set("status", "draft");
	url.searchParams.set("populate[coverImage]", "true");
	url.searchParams.set("populate[categories]", "true");
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
		cache: "no-store",
		signal: AbortSignal.timeout(10_000),
	});
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`Strapi returned HTTP ${response.status}.`);
	const { data } = await response.json();
	if (!data) return null;
	// Drafts have no publication date; use their edit date for the preview only.
	return (
		normalizeArticles(
			[{ ...data, publishedAt: data.publishedAt || data.updatedAt }],
			base,
		)[0] || null
	);
}

async function fetchPublishedArticles(): Promise<Article[]> {
	const base = process.env.STRAPI_URL || "https://strapi.deiondz.com";
	const token = process.env.STRAPI_READ_TOKEN;
	if (!token) throw new Error("STRAPI_READ_TOKEN is required on the server.");
	const items: unknown[] = [];
	let page = 1;
	let pageCount = 1;
	do {
		const url = new URL("/api/articles", base);
		url.searchParams.set("status", "published");
		url.searchParams.set("populate[coverImage]", "true");
		url.searchParams.set("populate[categories]", "true");
		url.searchParams.set("pagination[pageSize]", "100");
		url.searchParams.set("pagination[page]", String(page));
		url.searchParams.set("sort[0]", "publishedAt:desc");
		url.searchParams.set("sort[1]", "slug:asc");
		const response = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
			cache: "no-store",
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok)
			throw new Error(`Strapi returned HTTP ${response.status}.`);
		const result = await response.json();
		if (!Array.isArray(result.data))
			throw new Error("Invalid Strapi response.");
		items.push(...result.data);
		pageCount = result.meta?.pagination?.pageCount || 0;
		if (!Number.isInteger(pageCount) || pageCount < 0 || pageCount > 1000)
			throw new Error("Invalid Strapi pagination.");
		page++;
	} while (page <= pageCount);
	return normalizeArticles(items, base);
}

export function loadPublishedArticles(): Promise<Article[]> {
	if (cached && cached.expires > Date.now())
		return Promise.resolve(cached.articles);
	if (!pending) {
		pending = fetchPublishedArticles()
			.then((articles) => {
				cached = { articles, expires: Date.now() + cacheMilliseconds };
				return articles;
			})
			.finally(() => {
				pending = undefined;
			});
	}
	return pending;
}
