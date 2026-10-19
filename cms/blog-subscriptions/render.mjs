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

const font =
	"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const muted = "#71717a";
const button = (href, label) =>
	`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr><td style="border-radius:8px;background:#18181b"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font:600 15px/1 ${font};color:#ffffff;text-decoration:none;border-radius:8px">${label}</a></td></tr></table>`;

export function emailShell(
	title,
	html,
	text,
	{ preheader = "", footer = "" } = {},
) {
	return {
		subject: String(title)
			.replace(/[\r\n]/g, " ")
			.slice(0, 255),
		htmlbody: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title><style>@media (max-width:600px){.card{padding:28px 20px!important}.outer{padding:16px 8px!important}}</style></head><body style="margin:0;padding:0;background:#f4f4f5;color:#18181b">${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td class="outer" align="center" style="padding:40px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td style="padding:0 4px 16px;font:600 14px/1.4 ${font}"><a href="https://deiondz.com" style="color:#18181b;text-decoration:none">Deion D’Souza</a></td></tr><tr><td class="card" style="padding:40px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;font:17px/1.7 ${font};color:#27272a;overflow-wrap:anywhere">${html}</td></tr>${footer ? `<tr><td style="padding:20px 4px 0;font:13px/1.6 ${font};color:${muted}">${footer}</td></tr>` : ""}</table></td></tr></table></body></html>`,
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
	const htmlNode = (node, insideLink = false) => {
		if (node.type === "text") {
			let text = escapeHtml(node.text).replace(/\n/g, "<br>");
			if (!node.code && !insideLink) {
				text = String(node.text || "")
					.split(/((?:https?:\/\/|www\.)[^\s<>]+)/g)
					.map((part) => {
						const label = part.replace(/[.,!?;:)\]}]+$/, "");
						const url = /^(?:https?:\/\/|www\.)/.test(label)
							? safeUrl(
									label.startsWith("www.") ? `https://${label}` : label,
									articleUrl,
								)
							: null;
						return url
							? `<a style="color:#18181b;text-decoration:underline" href="${escapeHtml(url)}">${escapeHtml(label)}</a>${escapeHtml(part.slice(label.length))}`
							: escapeHtml(part);
					})
					.join("")
					.replace(/\n/g, "<br>");
			}
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
		const children = (node.children || [])
			.map((child) => htmlNode(child, insideLink || node.type === "link"))
			.join("");
		switch (node.type) {
			case "heading": {
				const level = Math.min(6, Math.max(2, Number(node.level) || 2));
				const size = { 2: 22, 3: 19 }[level] || 17;
				return `<h${level} style="margin:36px 0 12px;font:700 ${size}px/1.35 ${font};color:#18181b">${children}</h${level}>`;
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
				return `<blockquote style="margin:24px 0;padding:4px 0 4px 18px;border-left:3px solid #d4d4d8;color:#52525b;font-style:italic">${children}</blockquote>`;
			case "code":
				return `<pre style="margin:0 0 20px;white-space:pre-wrap;word-break:break-word;background:#f4f4f5;border-radius:8px;padding:16px;font:13px/1.6 SFMono-Regular,Menlo,Consolas,monospace;color:#18181b">${escapeHtml((node.children || []).map(textNode).join(""))}</pre>`;
			case "list": {
				const tag = node.format === "ordered" ? "ol" : "ul";
				return `<${tag} style="margin:0 0 20px;padding-left:24px">${children}</${tag}>`;
			}
			case "list-item":
				return `<li style="margin:0 0 8px">${children}</li>`;
			case "image": {
				const url = safeUrl(node.image?.url, cmsUrl, true);
				return url
					? `<p style="margin:28px 0"><img src="${escapeHtml(url)}" alt="${escapeHtml(node.image.alternativeText)}" width="520" style="display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:8px">${node.image.caption ? `<span style="display:block;margin-top:8px;font-size:13px;line-height:1.5;color:${muted}">${escapeHtml(node.image.caption)}</span>` : ""}</p>`
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
	const date = article.publishedAt
		? new Intl.DateTimeFormat("en-IN", {
				day: "numeric",
				month: "short",
				year: "numeric",
				timeZone: "Asia/Kolkata",
			}).format(new Date(article.publishedAt))
		: "";
	const excerpt = article.excerpt || article.description || "";
	return emailShell(
		article.title,
		`<p style="margin:0 0 12px;font-size:13px;line-height:1.4;color:${muted}">New post${date ? ` · ${escapeHtml(date)}` : ""}</p><h1 style="margin:0 0 16px;font:700 30px/1.25 ${font};color:#18181b;letter-spacing:-0.01em">${escapeHtml(article.title)}</h1>${excerpt ? `<p style="margin:0 0 8px;font-size:18px;line-height:1.6;color:#52525b">${escapeHtml(excerpt)}</p>` : ""}${cover}<div style="margin-top:28px">${content.map((node) => htmlNode(node)).join("")}</div><hr style="border:0;border-top:1px solid #e4e4e7;margin:36px 0 28px"><p style="margin:0 0 12px;font-size:15px;color:#52525b">Prefer reading on the web?</p>${button(articleUrl, "Read on deiondz.com")}`,
		`${article.title}\n\n${excerpt ? `${excerpt}\n\n` : ""}Read on the website: ${articleUrl}\n\n${content.map(textNode).join("")}\nUnsubscribe: ${unsubscribeUrl}`,
		{
			preheader: excerpt,
			footer: `You’re getting this because you subscribed to new posts on deiondz.com.<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:${muted};text-decoration:underline">Unsubscribe</a>`,
		},
	);
}

export function renderConfirmation(url) {
	return emailShell(
		"Confirm your blog subscription",
		`<h1 style="margin:0 0 16px;font:700 26px/1.3 ${font};color:#18181b">Confirm your subscription</h1><p style="margin:0 0 24px">Tap the button below to start getting new posts from Deion D’Souza by email.</p>${button(url, "Confirm subscription")}<p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:${muted}">This link expires in 24 hours. If you didn’t ask to subscribe, you can ignore this email.</p>`,
		`Confirm your subscription to Deion D’Souza’s blog:\n${url}\n\nThis link expires in 24 hours. If you didn’t ask to subscribe, ignore this email.`,
		{ preheader: "One click to start getting new posts by email." },
	);
}
