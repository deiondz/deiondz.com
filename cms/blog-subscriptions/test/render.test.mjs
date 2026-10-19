import assert from "node:assert/strict";
import { test } from "node:test";
import { renderArticleEmail } from "../render.mjs";

test("full articles preserve text and formatting while removing unsafe links and embeds", () => {
	const result = renderArticleEmail(
		{
			title: "A <new> post",
			slug: "new-post",
			content: [
				{
					type: "heading",
					level: 2,
					children: [{ type: "text", text: "Heading" }],
				},
				{
					type: "paragraph",
					children: [
						{ type: "text", text: "Complete body", bold: true },
						{
							type: "link",
							url: "javascript:alert(1)",
							children: [{ type: "text", text: "unsafe" }],
						},
						{
							type: "link",
							url: "https://youtu.be/abcdefghijk",
							children: [{ type: "text", text: "Watch video" }],
						},
					],
				},
				{
					type: "image",
					image: {
						url: "/uploads/photo.jpg",
						alternativeText: "A photo",
						caption: "Caption",
					},
				},
				{
					type: "code",
					children: [{ type: "text", text: "if (a < b) {\n  run();\n}" }],
				},
				{
					type: "list",
					format: "ordered",
					children: [
						{ type: "list-item", children: [{ type: "text", text: "First" }] },
					],
				},
			],
		},
		{
			siteUrl: "https://deiondz.com",
			cmsUrl: "https://strapi.deiondz.com",
			unsubscribeUrl: "https://deiondz.com/blog/unsubscribe/?token=test",
		},
	);
	assert.match(result.htmlbody, /A &lt;new&gt; post/);
	assert.match(result.htmlbody, /<strong>Complete body<\/strong>/);
	assert.match(
		result.htmlbody,
		/https:\/\/strapi.deiondz.com\/uploads\/photo.jpg/,
	);
	assert.match(result.htmlbody, /<ol/);
	assert.doesNotMatch(result.htmlbody, /javascript:|<iframe|<script/);
	assert.match(result.textbody, /Complete body/);
	assert.match(result.textbody, /if \(a < b\) \{\n {2}run\(\);\n\}/);
	assert.match(result.textbody, /https:\/\/youtu.be\/abcdefghijk/);
	assert.match(result.textbody, /Unsubscribe: https:/);
});

test("pasted media URLs become links without nesting anchors or changing code", () => {
	const result = renderArticleEmail(
		{
			title: "Media",
			slug: "media",
			content: [
				{
					type: "paragraph",
					children: [
						{ type: "text", text: "Watch https://youtu.be/abcdefghijk?t=20." },
					],
				},
				{
					type: "paragraph",
					children: [
						{
							type: "link",
							url: "https://open.spotify.com/track/123",
							children: [
								{ type: "text", text: "https://open.spotify.com/track/123" },
							],
						},
					],
				},
				{
					type: "paragraph",
					children: [
						{ type: "text", text: "https://example.com/code", code: true },
					],
				},
			],
		},
		{
			siteUrl: "https://deiondz.com",
			cmsUrl: "https://strapi.deiondz.com",
			unsubscribeUrl: "https://deiondz.com/blog/",
		},
	);
	assert.match(result.htmlbody, /href="https:\/\/youtu.be\/abcdefghijk\?t=20"/);
	assert.equal(
		(
			result.htmlbody.match(/href="https:\/\/open.spotify.com\/track\/123"/g) ||
			[]
		).length,
		1,
	);
	assert.doesNotMatch(result.htmlbody, /href="https:\/\/example.com\/code"/);
});
