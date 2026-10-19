import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { createSender } from "../transport.mjs";

test("SDK sends to the exact configured endpoint and preserves explicit HTTP rejections", async () => {
	let status = 200,
		body,
		headers,
		route;
	const server = createServer(async (request, response) => {
		route = request.url;
		headers = request.headers;
		let raw = "";
		for await (const chunk of request) raw += chunk;
		body = JSON.parse(raw);
		response.writeHead(status, { "content-type": "application/json" });
		response.end(
			JSON.stringify(
				status === 200
					? { request_id: "provider-id" }
					: {
							error: {
								code: "TEST_ERROR",
								details: [{ message: "Test provider rejection" }],
							},
						},
			),
		);
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	try {
		const send = createSender({
			url: `http://127.0.0.1:${server.address().port}/v1.1/email`,
			token: "local-test-token",
		});
		const payload = {
			from: { address: "blog@deiondz.com" },
			to: [{ email_address: { address: "reader@example.com" } }],
			subject: "Post",
			htmlbody: "<p>Entire post</p>",
		};
		assert.equal((await send(payload)).request_id, "provider-id");
		assert.equal(route, "/v1.1/email");
		assert.equal(headers.authorization, "local-test-token");
		assert.equal(body.htmlbody, "<p>Entire post</p>");
		status = 429;
		await assert.rejects(send(payload), {
			status: 429,
			providerCode: "TEST_ERROR",
		});
		status = 401;
		await assert.rejects(send(payload), { status: 401 });
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
