import { matchesSecret, normalizeEmail } from "./security.mjs";
import { createService, problem, UIDS } from "./service.mjs";

function settings() {
	const config = {
		enabled: process.env.BLOG_SUBSCRIPTIONS_ENABLED === "true",
		signingSecret: process.env.BLOG_SUBSCRIPTIONS_SIGNING_SECRET,
		internalSecret: process.env.BLOG_SUBSCRIPTIONS_INTERNAL_SECRET,
		webhookSecret: process.env.BLOG_SUBSCRIPTIONS_WEBHOOK_SECRET,
		siteUrl: (
			process.env.BLOG_SUBSCRIPTIONS_SITE_URL || "https://deiondz.com"
		).replace(/\/$/, ""),
		cmsUrl: process.env.PUBLIC_URL || "https://strapi.deiondz.com",
		from: process.env.BLOG_SUBSCRIPTIONS_FROM || "blog@deiondz.com",
		replyTo:
			process.env.BLOG_SUBSCRIPTIONS_REPLY_TO || "deiondsouza12@gmail.com",
		url: process.env.ZEPTOMAIL_URL || "https://cpaas.zoho.in/v1.1/email",
		token: process.env.ZEPTOMAIL_TOKEN,
		intervalMs: 1000,
	};
	if (
		config.enabled &&
		(!config.signingSecret ||
			config.signingSecret.length < 32 ||
			!config.internalSecret ||
			config.internalSecret.length < 32 ||
			!config.webhookSecret ||
			config.webhookSecret.length < 32 ||
			!config.token ||
			!normalizeEmail(config.from) ||
			!normalizeEmail(config.replyTo))
	)
		throw new Error(
			"Blog subscriptions require valid sender addresses and server secrets before enabling.",
		);
	return config;
}

export function register({ strapi }) {
	strapi.documents.use(async (context, next) => {
		if (context.uid !== "api::article.article") return next();
		const publishes =
			context.action === "publish" ||
			(["create", "update"].includes(context.action) &&
				context.params.status === "published");
		const cancels = ["unpublish", "delete", "discardDraft"].includes(
			context.action,
		);
		if (!publishes && !cancels) return next();
		return strapi.db.transaction(async ({ onCommit }) => {
			const result = await next();
			const documentId =
				context.params.documentId ||
				result.documentId ||
				result.entries?.[0]?.documentId;
			if (publishes && documentId) {
				const article = await strapi.documents(context.uid).findOne({
					documentId,
					status: "published",
					populate: ["coverImage"],
				});
				await strapi.blogSubscriptions.recordPublication(article);
			} else if (cancels && context.action !== "discardDraft")
				await strapi.blogSubscriptions.cancelPublication(documentId);
			onCommit(() => strapi.blogSubscriptions.wake());
			return result;
		});
	});
}

export async function bootstrap({ strapi }) {
	const config = settings();
	let sender;
	const service = createService(strapi, {
		settings: config,
		async send(payload) {
			if (!sender) {
				const { createSender } = await import("./transport.mjs");
				sender = createSender(config);
			}
			return sender(payload);
		},
		async visible(snapshot) {
			const current = await strapi
				.documents("api::article.article")
				.findOne({ documentId: snapshot.documentId, status: "published" });
			if (!current) {
				await service.cancelPublication(snapshot.documentId);
				return false;
			}
			// Preserve original content, but resolve the public link if the slug was corrected.
			snapshot.slug = current.slug;
			try {
				const response = await fetch(
					`${config.siteUrl}/blog/${encodeURIComponent(snapshot.slug)}/`,
					{ signal: AbortSignal.timeout(5000), redirect: "error" },
				);
				await response.body?.cancel();
				return response.ok;
			} catch {
				return false;
			}
		},
	});
	strapi.blogSubscriptions = service;
	service.handle = async (action, ctx) => {
		ctx.set("Cache-Control", "no-store");
		try {
			const expected =
				action === "webhook" ? config.webhookSecret : config.internalSecret;
			if (
				!matchesSecret(
					ctx.get("authorization"),
					expected ? `Bearer ${expected}` : "",
				)
			)
				throw problem(401, "Unauthorized");
			const body = ctx.request.body || {};
			if (JSON.stringify(body).length > (action === "webhook" ? 131072 : 4096))
				throw problem(413, "Request too large.");
			if (action === "subscribe")
				ctx.body = await service.subscribe(body.email, body.ip || "unknown");
			else if (action === "webhook") {
				const values = Object.values(body);
				const payload = body.event_name
					? body
					: values.length === 1 && typeof values[0] === "string"
						? JSON.parse(values[0])
						: body;
				ctx.body = await service.webhook(payload);
			} else ctx.body = await service[action](body.token);
		} catch (error) {
			ctx.status = Number(error.status) || 500;
			ctx.body = {
				message: error.status
					? error.message
					: "Something went wrong. Please try again.",
			};
			if (!error.status)
				strapi.log.error(`Blog subscription request failed: ${error.name}`);
		}
	};
	await service.recover();
	const publications = strapi.db.query(UIDS.publication);
	if (
		!(await publications.findOne({
			where: { articleDocumentId: "__initialized__" },
		}))
	) {
		await strapi.db.transaction(async () => {
			const articles = await strapi
				.documents("api::article.article")
				.findMany({ status: "published", populate: ["coverImage"] });
			for (const article of articles)
				await service.recordPublication(article, true);
			await publications.create({
				data: {
					articleDocumentId: "__initialized__",
					title: "Existing posts seeded",
					seeded: true,
				},
			});
		});
	}
	service.start();
	strapi.log.info(
		`Blog subscriptions installed; sending ${config.enabled ? "enabled" : "disabled"}.`,
	);
}
export async function destroy({ strapi }) {
	await strapi.blogSubscriptions?.stop();
}
