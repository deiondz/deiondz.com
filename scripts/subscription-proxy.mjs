const response = (message, status = 200) =>
	Response.json(
		{ message },
		{ status, headers: { "Cache-Control": "no-store" } },
	);

export async function subscriptionRequest(request, action, config) {
	if (!["subscribe", "confirm", "unsubscribe"].includes(action))
		return response("Not found.", 404);
	const origin = request.headers.get("origin");
	const allowed = new Set([config.siteUrl]);
	if (!config.production) {
		const url = new URL(request.url);
		allowed.add(url.origin);
		for (const host of ["localhost", "127.0.0.1", "[::1]"])
			allowed.add(`http://${host}${url.port ? `:${url.port}` : ""}`);
	}
	// Mailbox providers POST one-click unsubscribe without an Origin header.
	if (action !== "unsubscribe" && (!origin || !allowed.has(origin)))
		return response("Invalid origin.", 403);
	if (origin && !allowed.has(origin)) return response("Invalid origin.", 403);
	const reader = request.body?.getReader();
	let size = 0,
		text = "";
	if (reader) {
		const decoder = new TextDecoder();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > 4096) {
				await reader.cancel();
				return response("Request too large.", 413);
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
	}
	let body;
	try {
		body = request.headers.get("content-type")?.includes("application/json")
			? JSON.parse(text || "{}")
			: Object.fromEntries(new URLSearchParams(text));
		if (!body || typeof body !== "object" || Array.isArray(body))
			return response("Invalid request.", 400);
	} catch {
		return response("Invalid request.", 400);
	}
	const token = body.token || new URL(request.url).searchParams.get("token");
	let payload;
	if (action === "subscribe") {
		const email =
			typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
		if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
			return response("Enter a valid email address.", 400);
		// Nginx overwrites X-Real-IP; never trust the browser's X-Forwarded-For list.
		payload = { email, ip: request.headers.get("x-real-ip") || "unknown" };
	} else {
		if (typeof token !== "string" || !token || token.length > 300)
			return response("This link is invalid.", 400);
		payload = { token };
	}
	if (!config.secret)
		return response(
			"Email subscriptions aren’t available yet. Please try again later.",
			503,
		);
	try {
		const upstream = await fetch(
			new URL(`/api/blog-subscriptions/${action}`, config.cmsUrl),
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
		if (![200, 400, 429, 503].includes(upstream.status))
			return response(
				"Email subscriptions are temporarily unavailable. Please try again.",
				503,
			);
		const result = await upstream.json();
		return response(
			typeof result.message === "string" ? result.message : "Please try again.",
			upstream.status,
		);
	} catch {
		return response("Couldn’t connect. Please try again.", 503);
	}
}
