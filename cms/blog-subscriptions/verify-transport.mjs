import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emailShell } from "./render.mjs";
import { normalizeEmail } from "./security.mjs";
import { createSender } from "./transport.mjs";

// Run with node --env-file=/opt/strapi/.env. Credentials never appear in argv/output.
const email = normalizeEmail(process.argv[2]);
if (!email)
	throw new Error(
		"Usage: node --env-file=/opt/strapi/.env verify-transport.mjs <owned-test-email>",
	);
const receipt = path.resolve(
	process.argv[3] || "/opt/strapi/data/blog-transport-verification.json",
);
let previous;
try {
	previous = JSON.parse(await readFile(receipt, "utf8"));
} catch (error) {
	if (error.code !== "ENOENT") throw error;
}
if (
	previous &&
	!(previous.state === "rejected" && process.argv.includes("--retry-rejected"))
)
	throw new Error(
		"A verification attempt is already recorded. Reconcile its outcome before sending another test.",
	);
await writeFile(
	receipt,
	JSON.stringify({ state: "sending", date: new Date().toISOString() }),
	{ mode: 0o600, flag: previous ? "w" : "wx" },
);
try {
	const result = await createSender({
		url: process.env.ZEPTOMAIL_URL || "https://cpaas.zoho.in/v1.1/email",
		token: process.env.ZEPTOMAIL_TOKEN,
	})({
		...emailShell(
			"Blog subscription delivery test",
			"<h1>Blog email delivery test</h1><p>This is the controlled delivery test for deiondz.com blog subscriptions.</p>",
			"This is the controlled delivery test for deiondz.com blog subscriptions.",
		),
		from: {
			address: process.env.BLOG_SUBSCRIPTIONS_FROM || "blog@deiondz.com",
			name: "Deion D’Souza",
		},
		to: [{ email_address: { address: email } }],
		reply_to: [{ address: "deiondsouza12@gmail.com" }],
		track_opens: false,
		track_clicks: false,
		client_reference: `deiondz-transport-verification-${Date.now()}`,
	});
	const reference = String(
		result.request_id || result.data?.[0]?.request_id || "accepted",
	);
	await writeFile(
		receipt,
		JSON.stringify({
			state: "accepted",
			reference,
			date: new Date().toISOString(),
		}),
		{ mode: 0o600 },
	);
	console.log(
		`ZeptoMail accepted the controlled delivery test. Reference: ${reference}`,
	);
} catch (error) {
	const status = Number(error.status || error.statusCode || 0);
	await writeFile(
		receipt,
		JSON.stringify({
			state: status >= 400 && status < 500 ? "rejected" : "uncertain",
			status,
			date: new Date().toISOString(),
		}),
		{ mode: 0o600 },
	);
	console.error(
		`Delivery test ${status ? `returned HTTP ${status}` : "has an uncertain outcome"}. No credential or provider error body was logged.`,
	);
	if (status && error.providerCode)
		console.error(`Provider ${error.providerCode}: ${error.message}`);
	process.exitCode = 1;
}
