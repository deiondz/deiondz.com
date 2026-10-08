"use client";

import { useState } from "react";

export function ShareArticle({ title, url }: { title: string; url: string }) {
	const [message, setMessage] = useState("");
	async function share() {
		try {
			if (navigator.share) {
				await navigator.share({ title, url });
				return;
			}
			await navigator.clipboard.writeText(url);
			setMessage("Link copied.");
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") return;
			setMessage("Copy the address from your browser to share this post.");
		}
	}
	return (
		<div className="article-share">
			<button onClick={share} type="button">
				Share this post ↗
			</button>
			<span aria-live="polite">{message}</span>
		</div>
	);
}
