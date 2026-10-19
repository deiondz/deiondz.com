import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
	makeToken,
	matchesSecret,
	normalizeEmail,
	readToken,
} from "../security.mjs";

const secret = "test-signing-secret-long-enough-for-local-tests";
test("confirmation tokens reject forgery, wrong purpose, and expiry", () => {
	const token = makeToken(
		"confirm",
		{ id: 4, version: 2, expires: 2000 },
		secret,
	);
	assert.deepEqual(readToken(token, "confirm", secret, 1000), {
		id: 4,
		version: 2,
		expires: 2000,
	});
	assert.equal(readToken(`${token}x`, "confirm", secret, 1000), null);
	assert.equal(readToken(token, "unsubscribe", secret, 1000), null);
	assert.equal(readToken(token, "confirm", secret, 2000), null);
	assert.equal(readToken(token, "confirm", "different-key", 1000), null);
	assert.ok(createHash("sha256").update(token).digest("hex"));
});
test("unsubscribe tokens remain usable after confirmation expiry", () => {
	const token = makeToken("unsubscribe", { id: 4, version: 2 }, secret);
	assert.deepEqual(readToken(token, "unsubscribe", secret, 999999), {
		id: 4,
		version: 2,
		expires: 0,
	});
});
test("email validation rejects header injection and secret comparison fails closed", () => {
	assert.equal(normalizeEmail(" Reader@Example.COM "), "reader@example.com");
	for (const value of [
		"not-email",
		"a@example.com\r\nBcc: x@y.com",
		"@example.com",
		"a@",
		null,
	])
		assert.equal(normalizeEmail(value), null);
	assert.equal(matchesSecret("", ""), false);
	assert.equal(matchesSecret("wrong", "secret"), false);
	assert.equal(matchesSecret("secret", "secret"), true);
});
