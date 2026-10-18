import type { BlocksContent } from "@strapi/blocks-react-renderer";

type MediaEmbed = {
	provider: "youtube" | "spotify";
	src: string;
	height?: number;
};

export function getMediaEmbed(value: string): MediaEmbed | null {
	let url: URL;
	try {
		url = new URL(value.startsWith("www.") ? `https://${value}` : value);
	} catch {
		return null;
	}
	if (!["https:", "http:"].includes(url.protocol)) return null;
	const host = url.hostname.replace(/^(www\.|m\.)/, "");
	const parts = url.pathname.split("/").filter(Boolean);
	if (["youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
		const id =
			host === "youtu.be"
				? parts[0]
				: parts[0] === "watch"
					? url.searchParams.get("v")
					: ["embed", "shorts", "live", "v"].includes(parts[0] || "")
						? parts[1]
						: null;
		if (!id || !/^[\w-]{11}$/.test(id)) return null;
		const src = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
		const time = url.searchParams.get("start") || url.searchParams.get("t");
		if (time && /^(?:\d+h)?(?:\d+m)?(?:\d+s?)?$/.test(time)) {
			const [, hours, minutes, seconds] =
				time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) || [];
			const start =
				Number(hours || 0) * 3600 +
				Number(minutes || 0) * 60 +
				Number(seconds || 0);
			if (start > 0) src.searchParams.set("start", String(start));
		}
		return { provider: "youtube", src: src.href };
	}
	if (host === "open.spotify.com") {
		if (parts[0]?.startsWith("intl-")) parts.shift();
		if (parts[0] === "embed") parts.shift();
		const [type, id] = parts;
		if (
			!type ||
			!id ||
			!["track", "album", "playlist", "artist", "episode", "show"].includes(
				type,
			) ||
			!/^[a-zA-Z0-9]{22}$/.test(id) ||
			parts.length !== 2
		)
			return null;
		return {
			provider: "spotify",
			src: `https://open.spotify.com/embed/${type}/${id}`,
			height: type === "track" || type === "episode" ? 152 : 352,
		};
	}
	return null;
}

// Turn pasted URLs into links so rich text and bare URLs use the same player.
export function linkifyMediaUrls(content: BlocksContent): BlocksContent {
	type Node = BlocksContent[number] | BlocksContent[number]["children"][number];
	function visit(node: Node): Node[] {
		if (node.type === "code" || node.type === "link") return [node];
		if (node.type === "text") {
			if ("code" in node && node.code) return [node];
			const result: Node[] = [];
			let offset = 0;
			for (const match of node.text.matchAll(
				/(?:https?:\/\/|www\.)[^\s<>]+/g,
			)) {
				const url = match[0].replace(/[.,!?;:)\]}]+$/, "");
				if (!getMediaEmbed(url)) continue;
				if (match.index > offset)
					result.push({ ...node, text: node.text.slice(offset, match.index) });
				result.push({ type: "link", url, children: [{ ...node, text: url }] });
				offset = match.index + url.length;
			}
			if (!offset) return [node];
			if (offset < node.text.length)
				result.push({ ...node, text: node.text.slice(offset) });
			return result;
		}
		if (node.type === "image") return [node];
		return [{ ...node, children: node.children.flatMap(visit) } as Node];
	}
	return content.flatMap(visit) as BlocksContent;
}
