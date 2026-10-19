import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { subscriptionRequest } from "./subscription-proxy.mjs";

test("subscription proxy rejects foreign origins, malformed emails, oversized bodies, and unknown actions", async () => {
	const config = {
		siteUrl: "https://deiondz.com",
		secret: "server-secret",
		cmsUrl: "https://strapi.deiondz.com",
		production: true,
	};
	const request = (body, origin = "https://deiondz.com") =>
		new Request("https://deiondz.com/api/blog-subscriptions/subscribe/", {
			method: "POST",
			headers: { origin, "content-type": "application/json" },
			body,
		});
	assert.equal(
		(
			await subscriptionRequest(
				request('{"email":"reader@example.com"}', "https://attacker.example"),
				"subscribe",
				config,
			)
		).status,
		403,
	);
	assert.equal(
		(
			await subscriptionRequest(
				request('{"email":"invalid"}'),
				"subscribe",
				config,
			)
		).status,
		400,
	);
	assert.equal(
		(await subscriptionRequest(request("x".repeat(5000)), "subscribe", config))
			.status,
		413,
	);
	assert.equal(
		(await subscriptionRequest(request("{}"), "webhook", config)).status,
		404,
	);
});
test("proxy keeps its secret server-side and accepts token-authenticated one-click unsubscribe", async () => {
	let received;
	const server = createServer(async (request, response) => {
		let body = "";
		for await (const chunk of request) body += chunk;
		received = {
			url: request.url,
			authorization: request.headers.authorization,
			body: JSON.parse(body),
		};
		response.setHeader("Content-Type", "application/json");
		response.end(JSON.stringify({ message: "You’re unsubscribed." }));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	try {
		const config = {
			siteUrl: "https://deiondz.com",
			secret: "server-secret",
			cmsUrl: `http://127.0.0.1:${server.address().port}`,
			production: true,
		};
		const result = await subscriptionRequest(
			new Request(
				"https://deiondz.com/api/blog-subscriptions/unsubscribe/?token=opaque",
				{
					method: "POST",
					headers: { "content-type": "application/x-www-form-urlencoded" },
					body: "List-Unsubscribe=One-Click",
				},
			),
			"unsubscribe",
			config,
		);
		assert.equal(result.status, 200);
		assert.equal(received.url, "/api/blog-subscriptions/unsubscribe");
		assert.equal(received.authorization, "Bearer server-secret");
		assert.equal(received.body.token, "opaque");
		assert.equal(result.headers.get("cache-control"), "no-store");
		assert.doesNotMatch(await result.text(), /server-secret/);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

test("development accepts the loopback browser origin when Next normalizes the request host", async () => {
	const request = new Request(
		"http://localhost:3000/api/blog-subscriptions/confirm/",
		{
			method: "POST",
			headers: {
				origin: "http://127.0.0.1:3000",
				"content-type": "application/json",
			},
			body: JSON.stringify({ token: "test-token" }),
		},
	);
	const result = await subscriptionRequest(request, "confirm", {
		siteUrl: "https://deiondz.com",
		cmsUrl: "https://strapi.deiondz.com",
		production: false,
	});
	assert.equal(result.status, 503);
});
