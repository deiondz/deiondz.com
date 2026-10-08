"use client";

import { play } from "cuelume";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

export function ShareArticle({ title, url }: { title: string; url: string }) {
	const [message, setMessage] = useState("");
	async function share() {
		try {
			if (navigator.share) {
				await navigator.share({ title, url });
				play("success", { emphasis: "subtle" });
				return;
			}
			await navigator.clipboard.writeText(url);
			setMessage("Link copied.");
			play("success", { emphasis: "subtle" });
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") return;
			play("error", { emphasis: "subtle" });
			setMessage("Copy the address from your browser to share this post.");
		}
	}
	return (
		<div className="article-share">
			<button onClick={share} type="button">
				Share this post
				<ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
			</button>
			<span aria-live="polite">{message}</span>
		</div>
	);
}
