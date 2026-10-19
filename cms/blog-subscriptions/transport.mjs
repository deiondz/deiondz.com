import { SendMailClient } from "zeptomail";

export function createSender({ url, token, timeoutMs = 10_000 }) {
	// The pinned SDK normally discards HTTP status when parsing an error body.
	// Preserve it so a known 429 can be retried without retrying ambiguous sends.
	class DeliveryClient extends SendMailClient {
		async status(response) {
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				const clean = (value) =>
					String(value || "")
						.replaceAll(token || "\0", "[redacted]")
						.replace(/[\r\n]/g, " ")
						.slice(0, 250);
				const code = clean(body.error?.code || body.code);
				const reason = clean(
					body.error?.details
						?.map((detail) => detail.message || detail.code)
						.join("; ") ||
						body.error?.message ||
						body.message,
				);
				throw Object.assign(
					new Error(reason || "ZeptoMail rejected the request."),
					{ status: response.status, providerCode: code },
				);
			}
			return response;
		}
	}
	const client = new DeliveryClient({ url, token }, { useHttps: false });
	return async (payload) => {
		let timer;
		try {
			return await Promise.race([
				client.sendMail(payload),
				new Promise((_, reject) => {
					timer = setTimeout(
						() =>
							reject(
								new Error(
									"ZeptoMail response timed out; delivery may have been accepted.",
								),
							),
						timeoutMs,
					);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	};
}
