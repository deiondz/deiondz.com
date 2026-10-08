import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import { cache } from "react";

export type Article = {
	title: string;
	slug: string;
	excerpt: string;
	content: BlocksContent;
	publishedAt: string;
	updatedAt: string;
	coverImage: {
		url: string;
		placeholder?: string;
		alternativeText?: string | null;
		width?: number | null;
		height?: number | null;
	} | null;
	categories: { name: string; slug: string }[];
	readingMinutes: number;
	plainText: string;
};

export const getArticles = cache((): Article[] => {
	return JSON.parse(
		readFileSync(join(process.cwd(), ".blog-cache/articles.json"), "utf8"),
	);
});

export function articleUrl(slug: string) {
	return `https://deiondz.com/blog/${slug}/`;
}

export function formatDate(date: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Asia/Kolkata",
	}).format(new Date(date));
}
