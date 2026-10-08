import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { normalizeArticles, safeUrl, syncBlog } from "./sync-blog.mjs";

const fixture = {
	title: "Rendering test",
	slug: "rendering-test",
	excerpt: "",
	content: [
		{
			type: "paragraph",
			children: [{ type: "text", text: "Readable content." }],
		},
	],
	publishedAt: "2026-10-08T12:00:00.000Z",
	updatedAt: "2026-10-08T12:00:00.000Z",
	coverImage: { url: "/uploads/cover.png", alternativeText: "Cover" },
	categories: [{ name: "Engineering", slug: "engineering" }],
};
const base = "https://strapi.deiondz.com";

test("only published articles appear in the snapshot", () => {
	const articles = normalizeArticles(
		[fixture, { ...fixture, slug: "draft", publishedAt: null }],
		base,
	);
	assert.equal(articles.length, 1);
	assert.equal(articles[0].excerpt, "Readable content.");
	assert.equal(articles[0].coverImage.url, `${base}/uploads/cover.png`);
	assert.equal(articles[0].readingMinutes, 1);
});
test("duplicate slugs and invalid dates fail the build", () => {
	assert.throws(
		() => normalizeArticles([fixture, fixture], base),
		/Duplicate published slug/,
	);
	assert.throws(() =>
		normalizeArticles([{ ...fixture, publishedAt: "invalid" }], base),
	);
});
test("unsafe protocols are removed from rich text links", () => {
	const articles = normalizeArticles(
		[
			{
				...fixture,
				content: [
					{
						type: "paragraph",
						children: [
							{
								type: "link",
								url: "javascript:alert(1)",
								children: [{ type: "text", text: "Link" }],
							},
						],
					},
				],
			},
		],
		base,
	);
	assert.equal(articles[0].content[0].children[0].url, "#");
	assert.equal(safeUrl("data:text/html,test", base), null);
	assert.equal(
		safeUrl("mailto:hello@example.com", base),
		"mailto:hello@example.com",
	);
});
test("published posts are consistently sorted newest first", () => {
	const older = {
		...fixture,
		slug: "older",
		publishedAt: "2026-01-01T00:00:00.000Z",
	};
	assert.equal(
		normalizeArticles([older, fixture], base)[0].slug,
		"rendering-test",
	);
});

test("sync paginates and skips unchanged scheduled deployments", async (context) => {
	const directory = mkdtempSync(join(tmpdir(), "portfolio-blog-test-"));
	const originalDirectory = process.cwd();
	const keys = [
		"STRAPI_URL",
		"STRAPI_READ_TOKEN",
		"BLOG_OFFLINE",
		"GITHUB_EVENT_NAME",
		"GITHUB_OUTPUT",
	];
	const originalEnvironment = Object.fromEntries(
		keys.map((key) => [key, process.env[key]]),
	);
	const posts = [fixture, { ...fixture, slug: "second-article" }];
	const hash = createHash("sha256")
		.update(JSON.stringify(normalizeArticles(posts, base)))
		.digest("hex");
	const pages = [];
	context.mock.method(globalThis, "fetch", async (input, options) => {
		const url = new URL(input);
		if (url.pathname === "/blog-version.json") return Response.json({ hash });
		assert.equal(options.headers.Authorization, "Bearer test-token");
		assert.equal(url.searchParams.get("status"), "published");
		const page = Number(url.searchParams.get("pagination[page]"));
		pages.push(page);
		return Response.json({
			data: [posts[page - 1]],
			meta: { pagination: { pageCount: 2 } },
		});
	});
	try {
		process.chdir(directory);
		mkdirSync("public");
		Object.assign(process.env, {
			STRAPI_URL: base,
			STRAPI_READ_TOKEN: "test-token",
			BLOG_OFFLINE: "",
			GITHUB_EVENT_NAME: "schedule",
			GITHUB_OUTPUT: join(directory, "outputs"),
		});
		await syncBlog();
		assert.deepEqual(pages, [1, 2]);
		assert.equal(
			JSON.parse(readFileSync(".blog-cache/articles.json", "utf8")).length,
			2,
		);
		assert.equal(readFileSync("outputs", "utf8").trim(), "deploy=false");
	} finally {
		process.chdir(originalDirectory);
		for (const key of keys) {
			if (originalEnvironment[key] === undefined) delete process.env[key];
			else process.env[key] = originalEnvironment[key];
		}
		rmSync(directory, { recursive: true, force: true });
	}
});
