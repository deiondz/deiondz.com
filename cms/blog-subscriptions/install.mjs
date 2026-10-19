import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { schemas } from "./schemas.mjs";

export async function install(appDir) {
	const source = path.dirname(fileURLToPath(import.meta.url));
	const target = path.resolve(appDir);
	await readFile(path.join(target, "package.json"));
	const extension = path.join(target, "blog-subscriptions");
	await mkdir(extension, { recursive: true });
	if (extension !== source)
		await cp(source, extension, {
			recursive: true,
			filter: (file) => !file.split(path.sep).includes("node_modules"),
		});
	for (const [name, schema] of Object.entries(schemas)) {
		const folder = path.join(target, "src/api", name, "content-types", name);
		await mkdir(folder, { recursive: true });
		await writeFile(
			path.join(folder, "schema.json"),
			`${JSON.stringify(schema, null, 2)}\n`,
		);
	}
	const routes = path.join(target, "src/api/blog-subscriptions/routes");
	const controllers = path.join(
		target,
		"src/api/blog-subscriptions/controllers",
	);
	await mkdir(routes, { recursive: true });
	await mkdir(controllers, { recursive: true });
	await writeFile(
		path.join(routes, "blog-subscriptions.js"),
		`module.exports = { routes: [${["subscribe", "confirm", "unsubscribe", "webhook"].map((action) => `{ method: 'POST', path: '/blog-subscriptions/${action}', handler: 'blog-subscriptions.${action}', config: { auth: false } }`).join(",")} ] };\n`,
	);
	await writeFile(
		path.join(controllers, "blog-subscriptions.js"),
		`module.exports = ({ strapi }) => Object.fromEntries(['subscribe','confirm','unsubscribe','webhook'].map(action => [action, ctx => strapi.blogSubscriptions.handle(action, ctx)]));\n`,
	);
	const index = path.join(target, "src/index.js");
	let original = "module.exports = {};\n";
	try {
		original = await readFile(index, "utf8");
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (!original.includes("deiondz-blog-subscriptions-wrapper")) {
		await writeFile(
			path.join(target, "src/index.before-blog-subscriptions.cjs"),
			original,
			{ flag: "wx" },
		);
		await writeFile(
			index,
			`// deiondz-blog-subscriptions-wrapper: original application hooks are preserved.\nconst original = require('./index.before-blog-subscriptions.cjs');\nconst extension = import('../blog-subscriptions/runtime.mjs');\nmodule.exports = {\n async register(ctx) { await original.register?.(ctx); await (await extension).register(ctx); },\n async bootstrap(ctx) { await original.bootstrap?.(ctx); await (await extension).bootstrap(ctx); },\n async destroy(ctx) { await (await extension).destroy(ctx); await original.destroy?.(ctx); }\n};\n`,
		);
	}
	return extension;
}
if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	if (!process.argv[2])
		throw new Error(
			"Usage: node install.mjs /absolute/path/to/strapi (back up and stop Strapi first)",
		);
	console.log(
		`Installed source at ${await install(process.argv[2])}. Install its dependencies and rebuild Strapi before restarting.`,
	);
}
