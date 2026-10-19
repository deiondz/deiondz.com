import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createService, UIDS } from "../service.mjs";
import { loadFixture } from "../test-fixture.mjs";

let fixture, strapi, service, sent, time, delivery;
const query = (name) => strapi.db.query(UIDS[name]);
const article = (suffix = "post") => ({
	documentId: `document-${suffix}`,
	title: "Full article",
	excerpt: "A short preview of the new post.",
	slug: suffix,
	publishedAt: new Date(time).toISOString(),
	content: [
		{
			type: "paragraph",
			children: [{ type: "text", text: "Entire article body" }],
		},
	],
});
before(async () => {
	fixture = await loadFixture();
	strapi = fixture.strapi;
});
after(async () => {
	await fixture?.close();
});
beforeEach(async () => {
	for (const name of ["job", "publication", "subscriber", "limit"])
		await query(name).deleteMany({ where: {} });
	sent = [];
	time = Date.now();
	delivery = async (payload) => {
		sent.push(payload);
		return { request_id: `accepted-${sent.length}` };
	};
	service = createService(strapi, {
		settings: {
			enabled: true,
			signingSecret: "local-test-signing-secret-at-least-32-characters",
			internalSecret: "local-internal-secret",
			webhookSecret: "local-webhook-secret",
			siteUrl: "https://deiondz.com",
			cmsUrl: "https://strapi.deiondz.com",
			from: "blog@deiondz.com",
			replyTo: "deiondsouza12@gmail.com",
			intervalMs: 0,
		},
		now: () => time,
		send: (payload) => delivery(payload),
		visible: async () => true,
	});
});
async function signup(email = "reader@example.com", ip = "127.0.0.1") {
	await service.subscribe(email, ip);
	await service.tick();
	return new URL(
		sent.at(-1).textbody.match(/https:\/\/[^\s]+/)[0],
	).searchParams.get("token");
}
async function active(email) {
	const token = await signup(email);
	await service.confirm(token);
	return query("subscriber").findOne({
		where: { email: email || "reader@example.com" },
	});
}

test("signup requires confirmation; duplicate requests neither activate nor resend", async () => {
	const token = await signup();
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"pending",
	);
	await service.subscribe("READER@example.com", "127.0.0.1");
	await service.tick();
	assert.equal(sent.length, 1);
	await service.confirm(token);
	await service.confirm(token);
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"active",
	);
	await service.subscribe("reader@example.com", "127.0.0.1");
	await service.tick();
	assert.equal(sent.length, 1);
});
test("expired confirmation is rejected; a new signup gets a usable replacement", async () => {
	const token = await signup();
	time += 24 * 60 * 60 * 1000 + 1;
	await assert.rejects(service.confirm(token), { status: 400 });
	const replacement = await signup();
	assert.notEqual(token, replacement);
	await service.confirm(replacement);
});
test("unsubscribing cancels queued posts and resubscribing requires fresh confirmation", async () => {
	await active();
	await service.recordPublication(article());
	await service.tick();
	const token = new URL(
		sent.at(-1).textbody.match(/Unsubscribe: (https:\/\/[^\s]+)/)[1],
	).searchParams.get("token");
	await service.unsubscribe(token);
	await service.recordPublication(article("next"));
	await service.tick();
	assert.equal(sent.length, 2);
	const replacement = await signup();
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"pending",
	);
	await service.confirm(replacement);
	await assert.rejects(service.unsubscribe(token), { status: 400 });
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"active",
	);
});
test("IP rate limits persist across service instances", async () => {
	for (let index = 0; index < 5; index++)
		await service.subscribe(`reader${index}@example.com`, "rate-test");
	service = createService(strapi, service.options);
	await assert.rejects(service.subscribe("six@example.com", "rate-test"), {
		status: 429,
	});
	assert.equal(await query("subscriber").count({ where: {} }), 5);
});
test("subscriber collections have no public routes and custom actions require the dedicated secret", async () => {
	await strapi.server.mount();
	const server = strapi.server.httpServer;
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		for (const name of [
			"blog-subscribers",
			"blog-deliveries",
			"blog-publications",
			"blog-rate-limits",
		])
			assert.equal((await fetch(`${base}/api/${name}`)).status, 404);
		assert.equal(
			(
				await fetch(`${base}/api/blog-subscriptions/subscribe`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ email: "reader@example.com" }),
				})
			).status,
			401,
		);
		assert.equal(
			(
				await fetch(`${base}/api/blog-subscriptions/webhook`, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						authorization: "Bearer wrong",
					},
					body: "{}",
				})
			).status,
			401,
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});
test("first publication snapshots content and recipients; edits and republication do not resend", async () => {
	await active();
	await service.recordPublication(article());
	await service.recordPublication({
		...article(),
		title: "Edited",
		slug: "new-slug",
	});
	await active("late@example.com");
	await service.tick();
	const posts = sent.filter((mail) => mail.subject === "Full article");
	assert.equal(posts.length, 1);
	assert.match(posts[0].textbody, /A short preview of the new post\./);
	assert.doesNotMatch(posts[0].textbody, /Entire article body/);
	assert.equal(posts[0].to[0].email_address.address, "reader@example.com");
	assert.equal(posts[0].track_opens, false);
	assert.equal(posts[0].track_clicks, false);
	assert.ok(posts[0].mime_headers["List-Unsubscribe-Post"]);
});
test("transaction rollback removes publication and jobs together", async () => {
	await active();
	await assert.rejects(
		strapi.db.transaction(async () => {
			await service.recordPublication(article());
			throw new Error("rollback");
		}),
	);
	assert.equal(await query("publication").count({ where: {} }), 0);
	assert.equal(await query("job").count({ where: { kind: "article" } }), 0);
});
test("unpublished posts are cancelled; invisible public articles wait", async () => {
	await active();
	await service.recordPublication(article());
	service = createService(strapi, {
		...service.options,
		visible: async () => false,
	});
	await service.tick();
	assert.equal(sent.length, 1);
	await service.cancelPublication("document-post");
	await service.tick();
	assert.equal(
		(await query("job").findOne({ where: { kind: "article" } })).state,
		"cancelled",
	);
});
test("rate-limit rejection retries; network ambiguity never blindly resends", async () => {
	await active();
	await service.recordPublication(article());
	delivery = async () => {
		const error = new Error("rate limit");
		error.status = 429;
		throw error;
	};
	await service.tick();
	assert.equal(
		(await query("job").findOne({ where: { kind: "article" } })).state,
		"pending",
	);
	time += 60_000;
	delivery = async () => {
		throw new Error("socket closed after request");
	};
	await service.tick();
	assert.equal(
		(await query("job").findOne({ where: { kind: "article" } })).state,
		"uncertain",
	);
	delivery = async (payload) => {
		sent.push(payload);
		return { request_id: "late" };
	};
	await service.tick();
	assert.equal(sent.length, 1);
});
test("interrupted sends become uncertain after restart", async () => {
	await active();
	await service.recordPublication(article());
	const job = await query("job").findOne({ where: { kind: "article" } });
	await query("job").update({
		where: { id: job.id },
		data: { state: "sending" },
	});
	await service.recover();
	await service.tick();
	assert.equal(
		(await query("job").findOne({ where: { id: job.id } })).state,
		"uncertain",
	);
	assert.equal(sent.length, 1);
});
test("repeated and out-of-order webhooks cannot undo complaint suppression", async () => {
	await active();
	await service.recordPublication(article());
	await service.tick();
	const reference = sent.at(-1).client_reference;
	const event = (name) => ({
		event_name: [name],
		event_message: [
			{
				email_info: { client_reference: reference },
				event_data: [
					{ details: [{ bounced_recipient: "reader@example.com" }] },
				],
			},
		],
	});
	await service.webhook(event("hardbounce"));
	await service.webhook(event("hardbounce"));
	await service.webhook(event("delivered"));
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"suppressed",
	);
	assert.equal(
		(await query("job").findOne({ where: { kind: "article" } })).state,
		"failed",
	);
});
test("actual Strapi publication middleware runs only on first publish and cancels on unpublish", async () => {
	await active();
	strapi.blogSubscriptions = service;
	const documents = strapi.documents("api::article.article");
	const draft = await documents.create({
		data: {
			title: "Middleware post",
			slug: `middleware-${Date.now()}`,
			content: article().content,
		},
	});
	assert.equal(await query("publication").count({ where: {} }), 0);
	await documents.publish({ documentId: draft.documentId });
	assert.equal(
		await query("publication").count({
			where: { articleDocumentId: draft.documentId },
		}),
		1,
	);
	await documents.update({
		documentId: draft.documentId,
		data: { title: "Edited middleware" },
	});
	await documents.publish({ documentId: draft.documentId });
	assert.equal(await query("job").count({ where: { kind: "article" } }), 1);
	await documents.unpublish({ documentId: draft.documentId });
	assert.equal(
		(await query("job").findOne({ where: { kind: "article" } })).state,
		"cancelled",
	);
});
test("confirmation emails the owner once; owner bounces never suppress the reader", async () => {
	service.options.settings.notifyTo = "owner@example.com";
	const token = await signup();
	assert.equal(
		await query("job").count({ where: { kind: "notification" } }),
		0,
	);
	await service.confirm(token);
	await service.confirm(token);
	await service.tick();
	const notices = sent.filter(
		(mail) => mail.to[0].email_address.address === "owner@example.com",
	);
	assert.equal(notices.length, 1);
	assert.match(notices[0].subject, /reader@example\.com/);
	assert.match(notices[0].textbody, /1 active subscriber\./);
	await service.webhook({
		event_name: ["hardbounce"],
		event_message: [
			{ email_info: { client_reference: notices[0].client_reference } },
		],
	});
	assert.equal(
		(
			await query("subscriber").findOne({
				where: { email: "reader@example.com" },
			})
		).state,
		"active",
	);
});

test("turning owner notices off cancels queued notices and allows new confirmations", async () => {
	service.options.settings.notifyTo = "owner@example.com";
	const token = await signup();
	await service.confirm(token);
	service.options.settings.notifyTo = "";
	await service.tick();
	assert.equal(sent.length, 1);
	assert.equal(
		(await query("job").findOne({ where: { kind: "notification" } })).state,
		"cancelled",
	);
	await active("another@example.com");
	assert.equal(
		await query("job").count({ where: { kind: "notification" } }),
		1,
	);
});
