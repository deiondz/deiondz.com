import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const date = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const media = z.object({
	url: z.string(),
	alternativeText: z.string().nullable().optional(),
	width: z.number().nullable().optional(),
	height: z.number().nullable().optional(),
	formats: z
		.object({ thumbnail: z.object({ url: z.string() }).optional() })
		.nullable()
		.optional(),
});
const article = z.object({
	title: z.string().min(1).max(255),
	slug,
	excerpt: z.string().nullable().optional(),
	content: z.array(z.object({ type: z.string() }).passthrough()),
	publishedAt: date,
	updatedAt: date,
	coverImage: media.nullable().optional(),
	categories: z.array(z.object({ name: z.string(), slug })).optional(),
});

export function safeUrl(value, base, image = false) {
	try {
		const url = new URL(value, base);
		const allowed = image
			? ["https:", "http:"]
			: ["https:", "http:", "mailto:"];
		return allowed.includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}

export function blockText(nodes) {
	return nodes
		.map((node) => [node.text || "", blockText(node.children || [])].join(" "))
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

function sanitizeBlock(node, base, linkBase) {
	const result = { ...node };
	if (node.children)
		result.children = node.children.map((child) =>
			sanitizeBlock(child, base, linkBase),
		);
	if (node.type === "link") result.url = safeUrl(node.url, linkBase) || "#";
	if (node.image) {
		const url = safeUrl(node.image.url, base, true);
		if (!url) throw new Error("Article contains an invalid image URL.");
		result.image = {
			...node.image,
			url,
			placeholder: imagePreview(node.image, base),
		};
	}
	return result;
}

function imagePreview(image, base) {
	const thumbnail = image.formats?.thumbnail?.url;
	return thumbnail ? safeUrl(thumbnail, base, true) || undefined : undefined;
}

export function normalizeArticles(items, base) {
	const slugs = new Set();
	return items
		.filter((item) => item.publishedAt)
		.map((item) => {
			const parsed = article.parse(item);
			if (slugs.has(parsed.slug))
				throw new Error(`Duplicate published slug: ${parsed.slug}`);
			slugs.add(parsed.slug);
			const content = parsed.content.map((block) =>
				sanitizeBlock(block, base, `https://deiondz.com/blog/${parsed.slug}/`),
			);
			const plainText = blockText(content);
			const coverImage = parsed.coverImage
				? {
						...parsed.coverImage,
						url: safeUrl(parsed.coverImage.url, base, true),
						placeholder: imagePreview(parsed.coverImage, base),
					}
				: null;
			if (coverImage && !coverImage.url)
				throw new Error("Invalid cover image URL.");
			return {
				...parsed,
				excerpt:
					parsed.excerpt?.trim() ||
					`${plainText.slice(0, 180)}${plainText.length > 180 ? "…" : ""}`,
				content,
				plainText,
				coverImage,
				categories: (parsed.categories || []).sort((a, b) =>
					a.slug.localeCompare(b.slug),
				),
				readingMinutes: Math.max(
					1,
					Math.ceil(plainText.split(/\s+/).filter(Boolean).length / 200),
				),
			};
		})
		.sort(
			(a, b) =>
				Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
				a.slug.localeCompare(b.slug),
		);
}

async function request(url, token) {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
				signal: AbortSignal.timeout(20000),
			});
			if (!response.ok)
				throw new Error(`Strapi request failed with HTTP ${response.status}.`);
			return await response.json();
		} catch (error) {
			if (attempt === 2) throw error;
			await new Promise((done) => setTimeout(done, 1000 * (attempt + 1)));
		}
	}
}

export async function syncBlog() {
	if (existsSync(".env.local")) process.loadEnvFile(".env.local");
	const base = process.env.STRAPI_URL || "https://strapi.deiondz.com";
	const token = process.env.STRAPI_READ_TOKEN;
	const offline = process.env.BLOG_OFFLINE === "1";
	if (!offline && !token)
		throw new Error(
			"Set STRAPI_READ_TOKEN in .env.local or GitHub Actions secrets.",
		);
	const items = [];
	if (!offline) {
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
			const result = await request(url, token);
			if (!Array.isArray(result.data))
				throw new Error("Strapi returned an invalid article response.");
			items.push(...result.data);
			pageCount = result.meta?.pagination?.pageCount || 0;
			if (!Number.isInteger(pageCount) || pageCount > 1000)
				throw new Error("Invalid Strapi pagination.");
			page++;
		} while (page <= pageCount);
	}
	const articles = normalizeArticles(items, base);
	const hash = createHash("sha256")
		.update(JSON.stringify(articles))
		.digest("hex");
	let deploy = true;
	if (process.env.GITHUB_EVENT_NAME === "schedule") {
		const response = await fetch(
			`https://deiondz.com/blog-version.json?check=${Date.now()}`,
			{
				signal: AbortSignal.timeout(20000),
			},
		);
		if (response.ok) deploy = (await response.json()).hash !== hash;
		else if (response.status !== 404)
			throw new Error(`Live content version returned HTTP ${response.status}.`);
	}
	mkdirSync(".blog-cache", { recursive: true });
	writeFileSync(
		".blog-cache/articles.json",
		`${JSON.stringify(articles, null, 2)}\n`,
	);
	writeFileSync("public/blog-version.json", `${JSON.stringify({ hash })}\n`);
	if (process.env.GITHUB_OUTPUT)
		appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
	console.log(
		`${articles.length} published articles synced. ${deploy ? "Build required." : "Published content is unchanged."}`,
	);
	return articles;
}

if (
	process.argv[1] &&
	fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
	syncBlog().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
