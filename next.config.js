/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	output: "standalone",
	trailingSlash: true,
	images: { unoptimized: true },
	// Guestbook SQLite driver: keep it out of the bundle and ship the Linux
	// N-API prebuilds even when the build host is another platform.
	serverExternalPackages: ["better-sqlite3"],
	outputFileTracingIncludes: {
		"/guestbook": ["./node_modules/better-sqlite3/prebuilds/linux-*.node"],
		"/api/auth/*": ["./node_modules/better-sqlite3/prebuilds/linux-*.node"],
	},
};

export default config;
