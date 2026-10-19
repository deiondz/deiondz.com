import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { install } from "./install.mjs";

export async function loadFixture() {
	const base = process.env.STRAPI_TEST_SOURCE;
	if (!base)
		throw new Error(
			"Set STRAPI_TEST_SOURCE to a Strapi 5.57 installation. Tests create a fresh temporary app and database; they never load its .env or data.",
		);
	const directory = await mkdtemp(
		path.join(tmpdir(), "deiondz-subscriptions-test-"),
	);
	await mkdir(path.join(directory, "config"));
	await mkdir(path.join(directory, "src"));
	await mkdir(path.join(directory, "public/uploads"), { recursive: true });
	await cp(
		path.join(base, "package.json"),
		path.join(directory, "package.json"),
	);
	await cp(
		path.join(base, "src/api/article"),
		path.join(directory, "src/api/article"),
		{ recursive: true },
	);
	await cp(
		path.join(base, "src/api/category"),
		path.join(directory, "src/api/category"),
		{ recursive: true },
	);
	await symlink(
		path.join(base, "node_modules"),
		path.join(directory, "node_modules"),
		"dir",
	);
	await writeFile(
		path.join(directory, "config/database.js"),
		`module.exports = { connection: { client: 'sqlite', connection: { filename: ${JSON.stringify(path.join(directory, "test.db"))} }, useNullAsDefault: true } };`,
	);
	await writeFile(
		path.join(directory, "config/server.js"),
		`module.exports = { host: '127.0.0.1', port: 0, app: { keys: ['test-app-key-one', 'test-app-key-two'] } };`,
	);
	await writeFile(
		path.join(directory, "config/admin.js"),
		`module.exports = { auth: { secret: 'test-admin-secret-for-isolated-fixture' }, apiToken: { salt: 'test-api-token-salt' }, transfer: { token: { salt: 'test-transfer-token-salt' } }, secrets: { encryptionKey: 'test-encryption-key-for-local-only' } };`,
	);
	await writeFile(
		path.join(directory, "config/plugins.js"),
		`module.exports = { cloud: { enabled: false }, 'users-permissions': { config: { jwtSecret: 'isolated-test-jwt-secret-not-production' } } };`,
	);
	await writeFile(
		path.join(directory, "config/middlewares.js"),
		`module.exports = ['strapi::errors','strapi::security','strapi::cors','strapi::query','strapi::body','strapi::session','strapi::favicon','strapi::public'];`,
	);
	await install(directory);
	process.env.BLOG_SUBSCRIPTIONS_ENABLED = "false";
	process.env.BLOG_SUBSCRIPTIONS_SIGNING_SECRET =
		"fixture-signing-secret-at-least-32-characters";
	process.env.BLOG_SUBSCRIPTIONS_INTERNAL_SECRET =
		"fixture-internal-secret-at-least-32-characters";
	process.env.STRAPI_TELEMETRY_DISABLED = "true";
	const require = createRequire(path.join(base, "package.json"));
	const { createStrapi } = require("@strapi/strapi");
	const strapi = await createStrapi({
		appDir: directory,
		distDir: directory,
	}).load();
	return {
		strapi,
		directory,
		async close() {
			await strapi.destroy();
			await rm(directory, { recursive: true, force: true });
		},
	};
}
