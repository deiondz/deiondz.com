import "server-only";

import { type BetterAuthOptions, betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { GUESTBOOK_SCHEMA, getDb } from "./db";

function socialProviders() {
	const providers: BetterAuthOptions["socialProviders"] = {};
	const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
	const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
	if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET)
		providers.github = {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
		};
	if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
		providers.google = {
			clientId: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			prompt: "select_account",
		};
	return providers;
}

function authOptions() {
	return {
		appName: "Deion D'Souza",
		database: getDb(),
		baseURL: process.env.BETTER_AUTH_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		trustedOrigins: ["https://deiondz.com", "http://localhost:3000"],
		socialProviders: socialProviders(),
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			cookieCache: { enabled: true, maxAge: 5 * 60 },
		},
		// next.config.js sets trailingSlash, so requests arrive as /api/auth/x/.
		advanced: { skipTrailingSlashes: true },
	} satisfies BetterAuthOptions;
}

function createAuth() {
	return betterAuth(authOptions());
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as {
	guestbookAuth?: Auth;
	guestbookSchema?: Promise<void>;
};

export function getAuth(): Auth {
	globalForAuth.guestbookAuth ??= createAuth();
	return globalForAuth.guestbookAuth;
}

/** Creates or updates Better Auth's tables, then the guestbook tables, once per process. */
export function ensureSchema(): Promise<void> {
	globalForAuth.guestbookSchema ??= (async () => {
		// Migrate from plain options before the instance exists, so Better Auth's
		// startup schema check sees the finished tables.
		const { runMigrations } = await getMigrations(authOptions());
		await runMigrations();
		getDb().exec(GUESTBOOK_SCHEMA);
	})().catch((error) => {
		globalForAuth.guestbookSchema = undefined;
		throw error;
	});
	return globalForAuth.guestbookSchema;
}

export function enabledProviders() {
	return Object.keys(socialProviders()) as ("github" | "google")[];
}

export async function getSession(headers: Headers) {
	await ensureSchema();
	return getAuth().api.getSession({ headers });
}

export function isOwner(email: string | null | undefined) {
	if (!email) return false;
	const owners = (process.env.GUESTBOOK_ADMIN_EMAILS || "")
		.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	return owners.includes(email.toLowerCase());
}
