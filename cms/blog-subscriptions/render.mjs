const escapeHtml = (value = "") =>
	String(value).replace(
		/[&<>"']/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				character
			],
	);
const safeUrl = (value, base, image = false) => {
	try {
		const url = new URL(value, base);
		return (image
			? ["https:", "http:"]
			: ["https:", "http:", "mailto:"]
		).includes(url.protocol)
			? url.href
			: null;
	} catch {
		return null;
	}
};

export function emailShell(title, html, text) {
	return {
		subject: String(title)
			.replace(/[\r\n]/g, " ")
			.slice(0, 255),
		htmlbody: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#fafafa;color:#18181b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff"><tr><td style="padding:24px;font:16px/1.7 Arial,sans-serif;overflow-wrap:anywhere"><p style="font-size:14px;color:#71717a">Deion D’Souza</p>${html}</td></tr></table></td></tr></table></body></html>`,
		textbody: `Deion D’Souza\n\n${text}`,
	};
}

export function renderArticleEmail(
	article,
	{ siteUrl, cmsUrl, unsubscribeUrl },
) {
	const articleUrl = new URL(`/blog/${article.slug}/`, siteUrl).href;
	const textNode = (node) => {
		if (node.type === "text") return node.text || "";
		const children = (node.children || []).map(textNode).join("");
		if (node.type === "link") {
			const url = safeUrl(node.url, articleUrl);
			return url ? `${children} (${url})` : children;
		}
		if (node.type === "image")
			return [
				node.image?.alternativeText,
				safeUrl(node.image?.url, cmsUrl, true),
				node.image?.caption,
			]
				.filter(Boolean)
				.join("\n");
		return `${children}${["paragraph", "heading", "quote", "code", "list-item", "list"].includes(node.type) ? "\n\n" : ""}`;
	};
	const htmlNode = (node) => {
		if (node.type === "text") {
			let text = escapeHtml(node.text).replace(/\n/g, "<br>");
			for (const [flag, tag] of [
				["bold", "strong"],
				["italic", "em"],
				["underline", "u"],
				["strikethrough", "s"],
				["code", "code"],
			])
				if (node[flag]) text = `<${tag}>${text}</${tag}>`;
			return text;
		}
		const children = (node.children || []).map(htmlNode).join("");
		switch (node.type) {
			case "heading": {
				const level = Math.min(6, Math.max(2, Number(node.level) || 2));
				return `<h${level} style="line-height:1.3">${children}</h${level}>`;
			}
			case "paragraph":
				return `<p style="margin:0 0 20px">${children || "<br>"}</p>`;
			case "link": {
				const url = safeUrl(node.url, articleUrl);
				return url
					? `<a style="color:#18181b;text-decoration:underline" href="${escapeHtml(url)}">${children}</a>`
					: children;
			}
			case "quote":
				return `<blockquote style="margin:20px 0;padding-left:16px;border-left:3px solid #d4d4d8">${children}</blockquote>`;
			case "code":
				return `<pre style="white-space:pre-wrap;word-break:break-word;background:#f4f4f5;padding:16px;font:13px/1.6 monospace">${escapeHtml((node.children || []).map(textNode).join(""))}</pre>`;
			case "list": {
				const tag = node.format === "ordered" ? "ol" : "ul";
				return `<${tag} style="padding-left:24px">${children}</${tag}>`;
			}
			case "list-item":
				return `<li>${children}</li>`;
			case "image": {
				const url = safeUrl(node.image?.url, cmsUrl, true);
				return url
					? `<p><img src="${escapeHtml(url)}" alt="${escapeHtml(node.image.alternativeText)}" width="552" style="display:block;max-width:100%;height:auto;border:0">${node.image.caption ? `<span style="font-size:13px;color:#71717a">${escapeHtml(node.image.caption)}</span>` : ""}</p>`
					: "";
			}
			default:
				return children;
		}
	};
	const content = article.content || [];
	const cover = article.coverImage?.url
		? htmlNode({ type: "image", image: article.coverImage })
		: "";
	return emailShell(
		article.title,
		`<h1 style="font-size:28px;line-height:1.3">${escapeHtml(article.title)}</h1><p><a href="${escapeHtml(articleUrl)}">Read on the website</a></p>${cover}${content.map(htmlNode).join("")}<hr style="border:0;border-top:1px solid #e4e4e7;margin:32px 0"><p style="font-size:13px;color:#71717a">You subscribed to new posts on deiondz.com. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`,
		`${article.title}\n\nRead on the website: ${articleUrl}\n\n${content.map(textNode).join("")}\nUnsubscribe: ${unsubscribeUrl}`,
	);
}

export function renderConfirmation(url) {
	return emailShell(
		"Confirm your blog subscription",
		`<h1 style="font-size:24px;line-height:1.3">Get new posts by email.</h1><p>Confirm your subscription to receive new posts from Deion D’Souza.</p><p><a href="${escapeHtml(url)}">Confirm subscription</a></p><p style="font-size:13px;color:#71717a">This link expires in 24 hours. If you didn’t ask to subscribe, you can ignore this email.</p>`,
		`Confirm your subscription to Deion D’Souza’s blog:\n${url}\n\nThis link expires in 24 hours. If you didn’t ask to subscribe, ignore this email.`,
	);
}
