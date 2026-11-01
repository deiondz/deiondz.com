import { randomBytes } from "node:crypto";
import { allowedOrigins, readSmallBody } from "./subscription-proxy.mjs";

export const REACTIONS = ["like", "love", "fire", "idea", "party"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const READER_ID = /^[A-Za-z0-9_-]{43}$/;
const READER_COOKIE = "blog_reader";
const SUBSCRIBER_COOKIE = "blog_subscriber";
const YEAR = 60 * 60 * 24 * 365;

function readCookies(request) {
	const cookies = {};
	for (const part of (request.headers.get("cookie") || "").split(";")) {
		const index = part.indexOf("=");
		if (index < 1) continue;
		const name = part.slice(0, index).trim();
		try {
			cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
		} catch {}
	}
	return cookies;
}

function cookie(name, value, config, maxAge = YEAR) {
	return `${name}=${encodeURIComponent(value)}; Path=/api/blog-reactions; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${config.production ? "; Secure" : ""}`;
}

function reply(body, status, cookies = []) {
	const headers = new Headers({ "Cache-Control": "no-store" });
	for (const value of cookies) headers.append("Set-Cookie", value);
	return Response.json(body, { status, headers });
}
const message = (text, status, cookies) => reply({ message: text }, status, cookies);

/** Proxies GET (counts) and POST (set or clear) reaction requests to Strapi. */
export async function reactionRequest(request, config) {
	const method = request.method.toUpperCase();
	if (method !== "GET" && method !== "POST")
		return message("Method not allowed.", 405);
	const cookies = readCookies(request);
	const setCookies = [];
	let payload;
	if (method === "GET") {
		const slug = new URL(request.url).searchParams.get("slug") || "";
		if (slug.length > 200 || !SLUG.test(slug))
			return message("This post isn’t available.", 400);
		payload = { slug };
	} else {
		const origin = request.headers.get("origin");
		if (!origin || !allowedOrigins(request, config).has(origin))
			return message("Invalid origin.", 403);
		const body = await readSmallBody(request);
		if (body instanceof Response) return body;
		const slug = typeof body.slug === "string" ? body.slug : "";
		if (slug.length > 200 || !SLUG.test(slug))
			return message("This post isn’t available.", 400);
		const reaction = body.reaction ?? null;
		if (reaction !== null && !REACTIONS.includes(reaction))
			return message("Choose a reaction.", 400);
		payload = {
			slug,
			reaction,
			// Nginx overwrites X-Real-IP; never trust the browser's X-Forwarded-For list.
			ip: request.headers.get("x-real-ip") || "unknown",
		};
		if (typeof body.token === "string" && body.token) {
			if (body.token.length > 300)
				return message("This reaction link is invalid.", 400);
			payload.subscriberToken = body.token;
		}
	}
	let reader = cookies[READER_COOKIE];
	if (!reader || !READER_ID.test(reader)) {
		reader = undefined;
		// Only writes need an identity; reading counts never sets a cookie.
		if (method === "POST") {
			reader = randomBytes(32).toString("base64url");
			setCookies.push(cookie(READER_COOKIE, reader, config));
		}
	}
	if (reader) payload.reader = reader;
	const storedToken = cookies[SUBSCRIBER_COOKIE];
	const fromEmail = Boolean(payload.subscriberToken);
	if (!fromEmail && storedToken && storedToken.length <= 300)
		payload.subscriberToken = storedToken;
	if (!config.secret)
		return message("Reactions aren’t available yet.", 503, setCookies);
	try {
		const upstream = await fetch(
			new URL(
				`/api/blog-subscriptions/${method === "GET" ? "reactions" : "react"}`,
				config.cmsUrl,
			),
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.secret}`,
				},
				body: JSON.stringify(payload),
				cache: "no-store",
				signal: AbortSignal.timeout(10_000),
				redirect: "error",
			},
		);
		if (![200, 400, 404, 429, 503].includes(upstream.status))
			return message(
				"Reactions are temporarily unavailable. Please try again.",
				503,
				setCookies,
			);
		const result = await upstream.json();
		if (result.subscriber === true && fromEmail)
			setCookies.push(cookie(SUBSCRIBER_COOKIE, payload.subscriberToken, config));
		if (result.subscriber === false && storedToken)
			setCookies.push(cookie(SUBSCRIBER_COOKIE, "", config, 0));
		if (upstream.status !== 200)
			return message(
				typeof result.message === "string"
					? result.message
					: "Please try again.",
				upstream.status,
				setCookies,
			);
		const counts = {};
		for (const key of REACTIONS) {
			const value = Number(result.counts?.[key]);
			counts[key] = Number.isSafeInteger(value) && value > 0 ? value : 0;
		}
		return reply(
			{
				counts,
				mine: REACTIONS.includes(result.mine) ? result.mine : null,
			},
			200,
			setCookies,
		);
	} catch {
		return message("Couldn’t connect. Please try again.", 503, setCookies);
	}
}
