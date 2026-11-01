export const REACTIONS = ["like", "love", "fire", "idea", "party"];
const string = (extra = {}) => ({ type: "string", ...extra });
const integer = (extra = {}) => ({ type: "integer", ...extra });
const json = (extra = {}) => ({ type: "json", ...extra });
const datetime = () => ({ type: "datetime" });
const enumeration = (...values) => ({ type: "enumeration", enum: values });
const schema = (singular, plural, displayName, attributes) => ({
	kind: "collectionType",
	collectionName: plural.replaceAll("-", "_"),
	info: { singularName: singular, pluralName: plural, displayName },
	options: { draftAndPublish: false },
	pluginOptions: {},
	attributes,
});
export const schemas = {
	"blog-subscriber": schema(
		"blog-subscriber",
		"blog-subscribers",
		"Blog subscriber",
		{
			email: { type: "email", unique: true, required: true },
			state: enumeration("pending", "active", "unsubscribed", "suppressed"),
			version: integer({ default: 1 }),
			confirmedAt: datetime(),
			requestedAt: datetime(),
			tokenHash: string({ private: true }),
			tokenExpiresAt: datetime(),
		},
	),
	"blog-publication": schema(
		"blog-publication",
		"blog-publications",
		"Blog publication",
		{
			articleDocumentId: string({ unique: true, required: true }),
			title: string(),
			snapshot: json({ private: true }),
			seeded: { type: "boolean", default: false },
			cancelled: { type: "boolean", default: false },
			publishedAt: datetime(),
		},
	),
	"blog-delivery": schema(
		"blog-delivery",
		"blog-deliveries",
		"Blog email delivery",
		{
			deliveryKey: string({ unique: true, required: true }),
			kind: enumeration("confirmation", "article", "notification"),
			state: enumeration(
				"pending",
				"sending",
				"accepted",
				"delivered",
				"failed",
				"uncertain",
				"cancelled",
			),
			subscriberId: integer({ required: true }),
			subscriberVersion: integer({ required: true }),
			articleDocumentId: string(),
			attempts: integer({ default: 0 }),
			nextAttemptAt: datetime(),
			providerReference: string(),
			lastError: string(),
		},
	),
	"blog-reaction": schema("blog-reaction", "blog-reactions", "Blog reaction", {
		// `${articleDocumentId}:${reactor}` keeps one reaction per reader per post.
		key: string({ unique: true, required: true, private: true }),
		articleDocumentId: string({ required: true }),
		reaction: enumeration(...REACTIONS),
		reactorKind: enumeration("guest", "subscriber"),
		subscriberId: integer(),
	}),
	"blog-rate-limit": schema(
		"blog-rate-limit",
		"blog-rate-limits",
		"Blog signup rate limit",
		{
			bucket: string({ unique: true, required: true, private: true }),
			requests: integer({ default: 0 }),
			expiresAt: datetime(),
		},
	),
};
