import {
	renderArticleEmail,
	renderConfirmation,
	renderSubscriberNotice,
} from "./render.mjs";
import { hash, makeToken, normalizeEmail, readToken } from "./security.mjs";

export const UIDS = {
	subscriber: "api::blog-subscriber.blog-subscriber",
	publication: "api::blog-publication.blog-publication",
	job: "api::blog-delivery.blog-delivery",
	limit: "api::blog-rate-limit.blog-rate-limit",
};
export function problem(status, message) {
	return Object.assign(new Error(message), { status });
}
const signupMessage =
	"Check your inbox to confirm your subscription. If you’re already subscribed, you’re all set.";
const date = (milliseconds) => new Date(milliseconds).toISOString();

export function createService(strapi, options) {
	const { settings, send, visible, now = Date.now } = options;
	const db = (name) => strapi.db.query(UIDS[name]);
	let running = false,
		timer,
		wakeTimer;
	const subscriberToken = (purpose, subscriber) =>
		makeToken(
			purpose,
			{
				id: subscriber.id,
				version: subscriber.version,
				expires:
					purpose === "confirm" ? Date.parse(subscriber.tokenExpiresAt) : 0,
			},
			settings.signingSecret,
		);
	const link = (action, token) =>
		`${settings.siteUrl}/blog/${action}/?token=${encodeURIComponent(token)}`;
	async function subscribe(value, ip) {
		if (!settings.enabled)
			throw problem(
				503,
				"Email subscriptions aren’t available yet. Please try again later.",
			);
		const email = normalizeEmail(value);
		if (!email) throw problem(400, "Enter a valid email address.");
		const timestamp = now();
		await strapi.db.transaction(async () => {
			// No raw IP addresses are retained. Limits survive application restarts.
			const bucket = hash(
				`${settings.signingSecret}:ip:${ip}:${Math.floor(timestamp / 3_600_000)}`,
			);
			const limit = await db("limit").findOne({ where: { bucket } });
			if (limit?.requests >= 5)
				throw problem(429, "Too many requests. Please try again in an hour.");
			if (limit)
				await db("limit").update({
					where: { id: limit.id },
					data: { requests: limit.requests + 1 },
				});
			else
				await db("limit").create({
					data: { bucket, requests: 1, expiresAt: date(timestamp + 3_600_000) },
				});
			let subscriber = await db("subscriber").findOne({ where: { email } });
			if (subscriber?.state === "active" || subscriber?.state === "suppressed")
				return;
			if (
				subscriber?.state === "pending" &&
				timestamp - Date.parse(subscriber.requestedAt) < 600_000
			)
				return;
			const data = {
				email,
				state: "pending",
				version: (subscriber?.version || 0) + 1,
				requestedAt: date(timestamp),
				tokenExpiresAt: date(timestamp + 86_400_000),
				confirmedAt: null,
			};
			subscriber = subscriber
				? await db("subscriber").update({ where: { id: subscriber.id }, data })
				: await db("subscriber").create({ data });
			await db("subscriber").update({
				where: { id: subscriber.id },
				data: { tokenHash: hash(subscriberToken("confirm", subscriber)) },
			});
			await db("job").create({
				data: {
					deliveryKey: `confirm:${subscriber.id}:${subscriber.version}`,
					kind: "confirmation",
					state: "pending",
					subscriberId: subscriber.id,
					subscriberVersion: subscriber.version,
					nextAttemptAt: date(timestamp),
				},
			});
		});
		wake();
		return { message: signupMessage };
	}
	async function confirm(token) {
		const decoded = readToken(token, "confirm", settings.signingSecret, now());
		if (!decoded)
			throw problem(
				400,
				"This confirmation link is invalid or has expired. Please subscribe again.",
			);
		await strapi.db.transaction(async () => {
			const subscriber = await db("subscriber").findOne({
				where: { id: decoded.id },
			});
			if (
				!subscriber ||
				subscriber.version !== decoded.version ||
				subscriber.tokenHash !== hash(token) ||
				!["pending", "active"].includes(subscriber.state)
			)
				throw problem(
					400,
					"This confirmation link is no longer valid. Please subscribe again.",
				);
			if (subscriber.state !== "pending") return;
			await db("subscriber").update({
				where: { id: subscriber.id },
				data: { state: "active", confirmedAt: date(now()) },
			});
			if (settings.notifyTo)
				await db("job").create({
					data: {
						deliveryKey: `notify:${subscriber.id}:${subscriber.version}`,
						kind: "notification",
						state: "pending",
						subscriberId: subscriber.id,
						subscriberVersion: subscriber.version,
						nextAttemptAt: date(now()),
					},
				});
		});
		wake();
		return {
			message: "You’re subscribed. New posts will arrive in your inbox.",
		};
	}
	async function unsubscribe(token) {
		const decoded = readToken(token, "unsubscribe", settings.signingSecret);
		if (!decoded) throw problem(400, "This unsubscribe link is invalid.");
		await strapi.db.transaction(async () => {
			const subscriber = await db("subscriber").findOne({
				where: { id: decoded.id },
			});
			if (!subscriber || subscriber.version !== decoded.version)
				throw problem(
					400,
					"This link belongs to an older subscription. Use the link in your latest email.",
				);
			if (subscriber.state !== "suppressed")
				await db("subscriber").update({
					where: { id: subscriber.id },
					data: { state: "unsubscribed", tokenHash: null },
				});
			await db("job").updateMany({
				where: { subscriberId: subscriber.id, state: "pending" },
				data: { state: "cancelled" },
			});
		});
		return {
			message: "You’re unsubscribed. You won’t receive new posts by email.",
		};
	}
	async function recordPublication(article, seeded = false) {
		if (!article?.documentId || !article.publishedAt) return;
		await strapi.db.transaction(async () => {
			if (
				await db("publication").findOne({
					where: { articleDocumentId: article.documentId },
				})
			)
				return;
			await db("publication").create({
				data: {
					articleDocumentId: article.documentId,
					title: article.title,
					snapshot: article,
					seeded,
					publishedAt: article.publishedAt,
				},
			});
			if (seeded) return;
			const subscribers = await db("subscriber").findMany({
				where: { state: "active" },
			});
			for (const subscriber of subscribers)
				await db("job").create({
					data: {
						deliveryKey: `article:${article.documentId}:${subscriber.id}`,
						kind: "article",
						state: "pending",
						subscriberId: subscriber.id,
						subscriberVersion: subscriber.version,
						articleDocumentId: article.documentId,
						nextAttemptAt: date(now()),
					},
				});
		});
	}
	async function cancelPublication(documentId) {
		await db("publication").updateMany({
			where: { articleDocumentId: documentId },
			data: { cancelled: true },
		});
		await db("job").updateMany({
			where: { articleDocumentId: documentId, state: "pending" },
			data: { state: "cancelled" },
		});
	}
	async function recover() {
		await db("job").updateMany({
			where: { state: "sending" },
			data: {
				state: "uncertain",
				lastError:
					"Worker stopped during send; reconcile the provider log before retrying.",
			},
		});
	}
	async function processJob(job) {
		const subscriber = await db("subscriber").findOne({
			where: { id: job.subscriberId },
		});
		const update = (data) => db("job").update({ where: { id: job.id }, data });
		if (
			!subscriber ||
			subscriber.version !== job.subscriberVersion ||
			subscriber.state !== (job.kind === "confirmation" ? "pending" : "active")
		)
			return update({ state: "cancelled" });
		let mail;
		const unsubscribeUrl = link(
			"unsubscribe",
			subscriberToken("unsubscribe", subscriber),
		);
		if (job.kind === "confirmation") {
			if (Date.parse(subscriber.tokenExpiresAt) <= now())
				return update({ state: "cancelled" });
			mail = renderConfirmation(
				link("confirm", subscriberToken("confirm", subscriber)),
			);
		} else if (job.kind === "notification") {
			mail = renderSubscriberNotice(subscriber, {
				total: await db("subscriber").count({ where: { state: "active" } }),
			});
		} else {
			const publication = await db("publication").findOne({
				where: { articleDocumentId: job.articleDocumentId },
			});
			if (!publication || publication.cancelled)
				return update({ state: "cancelled" });
			if (!(await visible(publication.snapshot)))
				return update({ nextAttemptAt: date(now() + 15_000) });
			mail = renderArticleEmail(publication.snapshot, {
				...settings,
				unsubscribeUrl,
			});
		}
		// Persist before network I/O. A crash or ambiguous response is never silently retried.
		await update({ state: "sending", attempts: job.attempts + 1 });
		try {
			const response = await send({
				...mail,
				from: { address: settings.from, name: "Deion D’Souza" },
				reply_to: [{ address: settings.replyTo, name: "Deion D’Souza" }],
				to: [
					{
						email_address: {
							address:
								job.kind === "notification"
									? settings.notifyTo
									: subscriber.email,
						},
					},
				],
				track_opens: false,
				track_clicks: false,
				client_reference: job.deliveryKey,
				mime_headers:
					job.kind === "article"
						? {
								"List-Unsubscribe": `<${settings.siteUrl}/api/blog-subscriptions/unsubscribe/?token=${encodeURIComponent(subscriberToken("unsubscribe", subscriber))}>`,
								"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
							}
						: {},
			});
			// A webhook can arrive before the send response; never regress its terminal state.
			await db("job").updateMany({
				where: { id: job.id, state: "sending" },
				data: {
					state: "accepted",
					providerReference: String(
						response?.request_id ||
							response?.data?.[0]?.request_id ||
							"accepted",
					).slice(0, 255),
					lastError: null,
				},
			});
		} catch (error) {
			const status = Number(
				error.status || error.statusCode || error.response?.status,
			);
			const retry = status === 429 && job.attempts < 5;
			await db("job").updateMany({
				where: { id: job.id, state: "sending" },
				data: {
					state: retry
						? "pending"
						: status >= 400 && status < 500
							? "failed"
							: "uncertain",
					lastError: retry
						? "Provider rate limited the request."
						: status >= 400 && status < 500
							? `Provider rejected request (${status}).`
							: "Send outcome unknown; reconcile provider logs before retrying.",
					nextAttemptAt: date(
						now() + Math.min(3_600_000, 30_000 * 2 ** job.attempts),
					),
				},
			});
			strapi.log.warn(
				`Blog delivery ${job.id}: ${retry ? "retry scheduled" : "requires review"}`,
			);
		}
	}
	async function tick() {
		if (running || !settings.enabled) return;
		running = true;
		try {
			const jobs = await db("job").findMany({
				where: { state: "pending", nextAttemptAt: { $lte: date(now()) } },
				orderBy: { id: "asc" },
				limit: 25,
			});
			for (const job of jobs) {
				await processJob(job);
				if (settings.intervalMs)
					await new Promise((resolve) =>
						setTimeout(resolve, settings.intervalMs),
					);
			}
			await db("limit").deleteMany({
				where: { expiresAt: { $lt: date(now()) } },
			});
		} finally {
			running = false;
		}
	}
	function wake() {
		if (!timer || wakeTimer) return;
		wakeTimer = setTimeout(() => {
			wakeTimer = undefined;
			tick().catch((error) =>
				strapi.log.error(`Blog worker failed: ${error.name}`),
			);
		}, 0);
		wakeTimer.unref();
	}
	async function webhook(payload) {
		const messages = Array.isArray(payload.event_message)
			? payload.event_message
			: [payload.event_message];
		const names = JSON.stringify(payload.event_name || "")
			.toLowerCase()
			.replace(/[^a-z]/g, "");
		for (const message of messages) {
			const reference = message?.email_info?.client_reference;
			if (typeof reference !== "string") continue;
			await strapi.db.transaction(async () => {
				const job = await db("job").findOne({
					where: { deliveryKey: reference },
				});
				if (!job) return;
				if (
					names.includes("hardbounce") ||
					names.includes("feedback") ||
					names.includes("complaint")
				) {
					await db("job").update({
						where: { id: job.id },
						data: {
							state: "failed",
							lastError: "Recipient bounced or reported spam.",
						},
					});
					// Owner notices go to the owner, so their bounces say nothing about the subscriber.
					if (job.kind === "notification") return;
					await db("subscriber").update({
						where: { id: job.subscriberId },
						data: { state: "suppressed", tokenHash: null },
					});
					await db("job").updateMany({
						where: { subscriberId: job.subscriberId, state: "pending" },
						data: { state: "cancelled" },
					});
				} else if (names.includes("delivered")) {
					await db("job").updateMany({
						where: {
							id: job.id,
							state: { $in: ["sending", "accepted", "uncertain"] },
						},
						data: { state: "delivered", lastError: null },
					});
				}
			});
		}
		return { message: "Received" };
	}
	return {
		options,
		subscribe,
		confirm,
		unsubscribe,
		recordPublication,
		cancelPublication,
		recover,
		tick,
		wake,
		webhook,
		start() {
			if (!timer) {
				timer = setInterval(
					() =>
						tick().catch((error) =>
							strapi.log.error(`Blog worker failed: ${error.name}`),
						),
					15_000,
				);
				timer.unref();
				wake();
			}
		},
		async stop() {
			clearInterval(timer);
			clearTimeout(wakeTimer);
			timer = undefined;
			while (running) await new Promise((resolve) => setTimeout(resolve, 50));
		},
	};
}
