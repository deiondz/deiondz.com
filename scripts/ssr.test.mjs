import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { setTimeout as pause } from "node:timers/promises";

test("SSR picks up publishing, edits and unpublishing without a rebuild", {
	timeout: 160_000,
}, async () => {
	const original = {
		title: "SSR original article",
		slug: "ssr-original",
		excerpt: "Original excerpt",
		publishedAt: "2026-10-01T00:00:00Z",
		updatedAt: "2026-10-01T00:00:00Z",
		content: [
			{
				type: "paragraph",
				children: [{ type: "text", text: "Original body" }],
			},
		],
		categories: [],
	};
	let articles = [
		original,
		{
			...original,
			title: "Private draft",
			slug: "private-draft",
			publishedAt: null,
		},
	];
	const cms = createServer((request, response) => {
		assert.equal(request.headers.authorization, "Bearer test-read-token");
		assert.equal(
			new URL(request.url, "http://cms").searchParams.get("status"),
			"published",
		);
		response.setHeader("Content-Type", "application/json");
		response.end(
			JSON.stringify({
				data: articles,
				meta: { pagination: { pageCount: 1 } },
			}),
		);
	});
	cms.listen(0, "127.0.0.1");
	await once(cms, "listening");
	const probe = createServer();
	probe.listen(0, "127.0.0.1");
	await once(probe, "listening");
	const port = probe.address().port;
	await new Promise((resolve) => probe.close(resolve));
	const child = spawn(
		process.execPath,
		[
			"node_modules/next/dist/bin/next",
			"start",
			"--hostname",
			"127.0.0.1",
			"--port",
			String(port),
		],
		{
			env: {
				...process.env,
				STRAPI_URL: `http://127.0.0.1:${cms.address().port}`,
				STRAPI_READ_TOKEN: "test-read-token",
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	let logs = "";
	child.stdout.on("data", (chunk) => {
		logs += chunk;
	});
	child.stderr.on("data", (chunk) => {
		logs += chunk;
	});
	const base = `http://127.0.0.1:${port}`;
	async function text(path, status = 200) {
		const response = await fetch(base + path);
		assert.equal(response.status, status, `${path}: ${logs}`);
		return response.text();
	}
	try {
		let ready = false;
		for (let attempt = 0; attempt < 100; attempt++) {
			try {
				if ((await fetch(base)).ok) {
					ready = true;
					break;
				}
			} catch {}
			await pause(100);
		}
		assert.ok(ready, logs);
		assert.match(await text("/blog/"), /SSR original article/);
		assert.doesNotMatch(await text("/blog/"), /Private draft|test-read-token/);
		await text("/blog/ssr-new-post/", 404);
		articles = [
			{ ...original, title: "New post from Strapi", slug: "ssr-new-post" },
			{ ...original, title: "Edited original article" },
		];
		await pause(61_000);
		assert.match(await text("/blog/"), /New post from Strapi/);
		assert.match(await text("/blog/ssr-new-post/"), /Original body/);
		assert.match(await text("/blog/ssr-original/"), /Edited original article/);
		assert.match(await text("/blog/feed/"), /New post from Strapi/);
		assert.match(await text("/blog/feed.xml"), /New post from Strapi/);
		assert.match(await text("/sitemap.xml"), /ssr-new-post/);
		articles = [];
		await pause(61_000);
		await text("/blog/ssr-new-post/", 404);
		assert.doesNotMatch(await text("/blog/"), /New post from Strapi/);
		assert.doesNotMatch(await text("/blog/feed.xml"), /ssr-new-post/);
		assert.doesNotMatch(await text("/sitemap.xml"), /ssr-new-post/);
	} finally {
		child.kill();
		await once(child, "exit");
		await new Promise((resolve) => cms.close(resolve));
	}
});
