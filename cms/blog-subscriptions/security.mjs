import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function matchesSecret(value, expected) {
	return (
		typeof value === "string" &&
		typeof expected === "string" &&
		expected.length >= 1 &&
		Buffer.byteLength(value) === Buffer.byteLength(expected) &&
		timingSafeEqual(Buffer.from(value), Buffer.from(expected))
	);
}

export function normalizeEmail(value) {
	if (typeof value !== "string" || /[\r\n]/.test(value)) return null;
	const email = value.trim().toLowerCase();
	return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
		? email
		: null;
}

export const hash = (value) => createHash("sha256").update(value).digest("hex");

export function makeToken(purpose, { id, version, expires = 0 }, secret) {
	if (!secret || secret.length < 32)
		throw new Error("A signing secret of at least 32 characters is required.");
	const payload = `${purpose}.${id}.${version}.${expires}`;
	return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function readToken(token, purpose, secret, now = Date.now()) {
	if (
		typeof token !== "string" ||
		token.length > 300 ||
		!secret ||
		secret.length < 32
	)
		return null;
	const parts = token.split(".");
	if (
		parts.length !== 5 ||
		parts[0] !== purpose ||
		!parts.slice(1, 4).every((part) => /^\d+$/.test(part))
	)
		return null;
	const [, id, version, expires] = parts;
	const data = {
		id: Number(id),
		version: Number(version),
		expires: Number(expires),
	};
	if (
		!Number.isSafeInteger(data.id) ||
		data.id < 1 ||
		!Number.isSafeInteger(data.version) ||
		data.version < 1 ||
		!Number.isSafeInteger(data.expires) ||
		(purpose === "confirm" && data.expires <= now)
	)
		return null;
	return matchesSecret(token, makeToken(purpose, data, secret)) ? data : null;
}
