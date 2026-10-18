import assert from "node:assert/strict";
import { test } from "node:test";
import type { BlocksContent } from "@strapi/blocks-react-renderer";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleBody } from "../src/components/article-body";
import { getMediaEmbed, linkifyMediaUrls } from "../src/lib/media-embeds";

test("YouTube watch, share, Shorts, live and embed links become players", () => {
	for (const url of [
		"https://www.youtube.com/watch?v=M7lc1UVf-VE&si=share",
		"https://youtu.be/M7lc1UVf-VE",
		"https://m.youtube.com/shorts/M7lc1UVf-VE",
		"https://youtube.com/live/M7lc1UVf-VE",
		"https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
	]) {
		assert.equal(
			getMediaEmbed(url)?.src,
			"https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
		);
	}
	assert.match(
		getMediaEmbed("https://youtu.be/M7lc1UVf-VE?t=1h2m3s")?.src || "",
		/start=3723$/,
	);
});

test("Spotify music and podcast URLs support localized and embed paths", () => {
	for (const type of [
		"track",
		"album",
		"playlist",
		"artist",
		"episode",
		"show",
	]) {
		for (const prefix of ["", "intl-en/", "embed/"]) {
			const embed = getMediaEmbed(
				`https://open.spotify.com/${prefix}${type}/0Lr4kGOYn9l83EjuK6cZFQ?si=share`,
			);
			assert.equal(
				embed?.src,
				`https://open.spotify.com/embed/${type}/0Lr4kGOYn9l83EjuK6cZFQ`,
			);
		}
	}
});

test("unrelated, malformed and spoofed links never become players", () => {
	for (const url of [
		"https://example.com/watch?v=M7lc1UVf-VE",
		"https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
		"https://youtube.com/watch?v=invalid",
		"https://open.spotify.com/track/invalid",
		"https://open.spotify.com/user/0Lr4kGOYn9l83EjuK6cZFQ",
		"javascript:alert(1)",
	])
		assert.equal(getMediaEmbed(url), null);
});

test("mixed rich text, raw URLs and nested list items render without losing text or code", () => {
	const content: BlocksContent = [
		{
			type: "paragraph",
			children: [
				{
					type: "text",
					text: "Before https://youtu.be/M7lc1UVf-VE. After",
					bold: true,
				},
			],
		},
		{
			type: "paragraph",
			children: [
				{
					type: "link",
					url: "https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ",
					children: [{ type: "text", text: "My song" }],
				},
			],
		},
		{
			type: "list",
			format: "unordered",
			children: [
				{
					type: "list-item",
					children: [{ type: "text", text: "https://youtu.be/M7lc1UVf-VE" }],
				},
			],
		},
		{
			type: "code",
			children: [{ type: "text", text: "https://youtu.be/M7lc1UVf-VE" }],
		},
		{
			type: "paragraph",
			children: [
				{ type: "text", text: "https://youtu.be/M7lc1UVf-VE", code: true },
			],
		},
	];
	const original = structuredClone(content);
	const transformed = linkifyMediaUrls(content);
	assert.deepEqual(content, original);
	assert.deepEqual(transformed[3], content[3]);
	assert.deepEqual(transformed[4], content[4]);
	const html = renderToStaticMarkup(createElement(ArticleBody, { content }));
	assert.equal((html.match(/<iframe/g) || []).length, 3);
	assert.match(html, /Before/);
	assert.match(html, /\. After/);
	assert.match(html, /My song/);
	assert.match(html, /height="152"/);
});
