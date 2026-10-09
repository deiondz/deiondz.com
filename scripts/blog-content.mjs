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
