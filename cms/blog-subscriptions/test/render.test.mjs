import assert from "node:assert/strict";
import { test } from "node:test";
import { renderArticleEmail } from "../render.mjs";

const options = {
	siteUrl: "https://deiondz.com",
	cmsUrl: "https://strapi.deiondz.com",
	unsubscribeUrl: "https://deiondz.com/blog/unsubscribe/?token=test",
};
const paragraph = (text) => ({
	type: "paragraph",
	children: [{ type: "text", text }],
});

test("post emails contain the title, escaped excerpt and website link without the full article", () => {
	const result = renderArticleEmail(
		{
			title: "A <new> post",
			slug: "new-post",
			excerpt: "A short <preview> & introduction.",
			coverImage: { url: "/uploads/cover.jpg" },
			content: [
				paragraph("Full article body stays on the website."),
				{ type: "image", image: { url: "/uploads/photo.jpg" } },
				{ type: "code", children: [{ type: "text", text: "run();" }] },
				paragraph("https://youtu.be/abcdefghijk"),
			],
		},
		options,
	);
	assert.match(result.htmlbody, /A &lt;new&gt; post/);
	assert.match(result.htmlbody, /A short &lt;preview&gt; &amp; introduction\./);
	assert.match(
		result.htmlbody,
		/href="https:\/\/deiondz.com\/blog\/new-post\/"/,
	);
	assert.match(result.htmlbody, /Read the full post/);
	assert.match(result.textbody, /A short <preview> & introduction\./);
	assert.match(result.textbody, /https:\/\/deiondz.com\/blog\/new-post\//);
	assert.match(result.textbody, /Unsubscribe: https:/);
	assert.match(result.htmlbody, /unsubscribe\/\?token=test/);
	for (const body of [result.htmlbody, result.textbody]) {
		assert.doesNotMatch(body, /Full article body|uploads\/|run\(\)|youtu\.be/);
	}
});

test("missing or blank excerpts fall back to a short plain-text preview", () => {
	for (const excerpt of [undefined, " \n\t "]) {
		const result = renderArticleEmail(
			{
				title: "Fallback",
				slug: "fallback",
				excerpt,
				content: [
					paragraph("  First\n paragraph with <safe> text. "),
					paragraph("More words to preview. ".repeat(30)),
					paragraph("Article ending must stay on the website."),
				],
			},
			options,
		);
		const preview = result.textbody.split("\n\n")[2];
		assert.ok(
			preview.startsWith("First paragraph with <safe> text. More words"),
		);
		assert.ok(preview.length <= 181);
		assert.ok(preview.endsWith("…"));
		assert.match(result.htmlbody, /First paragraph with &lt;safe&gt; text/);
		assert.doesNotMatch(result.textbody, /Article ending/);
		assert.doesNotMatch(result.htmlbody, /Article ending/);
	}
});

test("empty articles still link to the website without rendering missing content", () => {
	const result = renderArticleEmail({ title: "Empty", slug: "empty" }, options);
	assert.match(result.textbody, /https:\/\/deiondz.com\/blog\/empty\//);
	assert.doesNotMatch(result.htmlbody, /undefined|null/);
});
