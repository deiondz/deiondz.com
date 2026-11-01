import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { reactionRequest } from "./reaction-proxy.mjs";

const SITE = "https://deiondz.com/api/blog-reactions/";
const post = (body, headers = {}) =>
	new Request(SITE, {
		method: "POST",
		headers: {
			origin: "https://deiondz.com",
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});

async function withUpstream(reply, run) {
	const received = [];
	const server = createServer(async (request, response) => {
		let body = "";
		for await (const chunk of request) body += chunk;
		const entry = {
			url: request.url,
			authorization: request.headers.authorization,
			body: JSON.parse(body),
		};
		received.push(entry);
		const [status, payload] = reply(entry);
		response.statusCode = status;
		response.setHeader("Content-Type", "application/json");
		response.end(JSON.stringify(payload));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	try {
		await run(
			{
				siteUrl: "https://deiondz.com",
				secret: "server-secret",
				cmsUrl: `http://127.0.0.1:${server.address().port}`,
				production: true,
			},
			received,
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}
const counts = { like: 0, love: 1, fire: 0, idea: 0, party: 0 };

test("reaction proxy rejects foreign origins, bad slugs and unknown reactions", async () => {
	const config = {
		siteUrl: "https://deiondz.com",
		secret: "server-secret",
		cmsUrl: "http://127.0.0.1:1",
		production: true,
	};
	assert.equal(
		(
			await reactionRequest(
				post({ slug: "post", reaction: "love" }, { origin: "https://attacker.example" }),
				config,
			)
		).status,
		403,
	);
	assert.equal(
		(await reactionRequest(post({ slug: "../admin", reaction: "love" }), config))
			.status,
		400,
	);
	assert.equal(
		(await reactionRequest(post({ slug: "post", reaction: "angry" }), config))
			.status,
		400,
	);
	assert.equal(
		(await reactionRequest(new Request(`${SITE}?slug=Bad Slug`), config)).status,
		400,
	);
	assert.equal(
		(await reactionRequest(new Request(SITE, { method: "PUT" }), config)).status,
		405,
	);
});

test("first reaction issues an HttpOnly reader cookie and keeps the secret server-side", async () => {
	await withUpstream(
		() => [200, { counts, mine: "love", subscriber: undefined }],
		async (config, received) => {
			const result = await reactionRequest(
				post({ slug: "post", reaction: "love" }, { "x-real-ip": "203.0.113.9" }),
				config,
			);
			assert.equal(result.status, 200);
			assert.deepEqual(await result.json(), { counts, mine: "love" });
			assert.equal(received[0].url, "/api/blog-subscriptions/react");
			assert.equal(received[0].authorization, "Bearer server-secret");
			assert.equal(received[0].body.ip, "203.0.113.9");
			assert.match(received[0].body.reader, /^[A-Za-z0-9_-]{43}$/);
			const cookie = result.headers.get("set-cookie");
			assert.match(cookie, new RegExp(`blog_reader=${received[0].body.reader}`));
			assert.match(cookie, /HttpOnly/);
			assert.match(cookie, /Secure/);
			assert.match(cookie, /Path=\/api\/blog-reactions/);
			assert.equal(result.headers.get("cache-control"), "no-store");
		},
	);
});

test("reading counts forwards cookies but never creates one", async () => {
	await withUpstream(
		() => [200, { counts, mine: null }],
		async (config, received) => {
			const anonymous = await reactionRequest(
				new Request(`${SITE}?slug=post`),
				config,
			);
			assert.equal(anonymous.headers.get("set-cookie"), null);
			assert.equal(received[0].url, "/api/blog-subscriptions/reactions");
			assert.equal(received[0].body.reader, undefined);
			await reactionRequest(
				new Request(`${SITE}?slug=post`, {
					headers: { cookie: `blog_reader=${"r".repeat(43)}` },
				}),
				config,
			);
			assert.equal(received[1].body.reader, "r".repeat(43));
		},
	);
});

test("email tokens become a subscriber cookie, and rejected tokens clear it", async () => {
	await withUpstream(
		({ body }) => [
			200,
			{ counts, mine: "love", subscriber: body.subscriberToken === "valid" },
		],
		async (config, received) => {
			const accepted = await reactionRequest(
				post(
					{ slug: "post", reaction: "love", token: "valid" },
					{ cookie: `blog_reader=${"r".repeat(43)}` },
				),
				config,
			);
			assert.equal(received[0].body.subscriberToken, "valid");
			assert.match(accepted.headers.get("set-cookie"), /blog_subscriber=valid/);
			const rejected = await reactionRequest(
				new Request(`${SITE}?slug=post`, {
					headers: { cookie: "blog_subscriber=stale" },
				}),
				config,
			);
			assert.equal(received[1].body.subscriberToken, "stale");
			assert.match(
				rejected.headers.get("set-cookie"),
				/blog_subscriber=; Path=\/api\/blog-reactions; Max-Age=0/,
			);
		},
	);
});

test("upstream errors pass through safe messages only", async () => {
	await withUpstream(
		() => [429, { message: "Too many reactions. Please try again later." }],
		async (config) => {
			const result = await reactionRequest(
				post({ slug: "post", reaction: "love" }),
				config,
			);
			assert.equal(result.status, 429);
			assert.deepEqual(await result.json(), {
				message: "Too many reactions. Please try again later.",
			});
		},
	);
	await withUpstream(
		() => [500, { message: "stack trace" }],
		async (config) => {
			const result = await reactionRequest(
				post({ slug: "post", reaction: "love" }),
				config,
			);
			assert.equal(result.status, 503);
			assert.doesNotMatch(await result.text(), /stack trace/);
		},
	);
});
