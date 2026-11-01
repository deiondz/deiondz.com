"use client";

import { play } from "cuelume";
import { useEffect, useId, useRef, useState } from "react";

const REACTIONS = [
	{ key: "like", label: "Like" },
	{ key: "love", label: "Love" },
	{ key: "fire", label: "Fire" },
	{ key: "idea", label: "Insightful" },
	{ key: "party", label: "Celebrate" },
] as const;
type Reaction = (typeof REACTIONS)[number]["key"];
type Counts = Record<Reaction, number>;
type Result = { counts?: Counts; mine?: Reaction | null; message?: string };

const isReaction = (value: unknown): value is Reaction =>
	REACTIONS.some((item) => item.key === value);
const emptyCounts = (): Counts => ({
	like: 0,
	love: 0,
	fire: 0,
	idea: 0,
	party: 0,
});

export function ArticleReactions({ slug }: { slug: string }) {
	const id = useId();
	const section = useRef<HTMLElement>(null);
	const [counts, setCounts] = useState<Counts | null>(null);
	const [mine, setMine] = useState<Reaction | null>(null);
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState("");
	const [popped, setPopped] = useState<Reaction | null>(null);

	async function request(init?: RequestInit) {
		const response = await fetch(
			`/api/blog-reactions/${init ? "" : `?slug=${encodeURIComponent(slug)}`}`,
			{ ...init, signal: AbortSignal.timeout(15_000) },
		);
		const data: Result = await response.json();
		if (!response.ok || !data.counts)
			throw new Error(data.message || "Couldn’t save your reaction.");
		setCounts(data.counts);
		setMine(isReaction(data.mine) ? data.mine : null);
		return data;
	}

	function send(reaction: Reaction | null, token?: string) {
		return request({
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ slug, reaction, ...(token ? { token } : {}) }),
		});
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: load once per article
	useEffect(() => {
		// Email links carry the reaction and a subscriber token in the fragment.
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const fromEmail = hash.get("react");
		const token = hash.get("token");
		if (isReaction(fromEmail) && token) {
			window.history.replaceState(
				window.history.state,
				"",
				window.location.pathname + window.location.search,
			);
			section.current?.scrollIntoView({ block: "center" });
			setPending(true);
			send(fromEmail, token)
				.then(() => {
					setPopped(fromEmail);
					setMessage("Thanks for your reaction!");
				})
				.catch((error: Error) => {
					setMessage(error.message);
					return request().catch(() => setCounts(emptyCounts()));
				})
				.finally(() => setPending(false));
			return;
		}
		request().catch(() => setCounts(emptyCounts()));
	}, [slug]);

	async function choose(reaction: Reaction) {
		if (pending || !counts) return;
		const previous = { counts, mine };
		const next = mine === reaction ? null : reaction;
		const optimistic = { ...counts };
		if (mine) optimistic[mine] = Math.max(0, optimistic[mine] - 1);
		if (next) optimistic[next] += 1;
		setCounts(optimistic);
		setMine(next);
		setPopped(next);
		setMessage("");
		setPending(true);
		try {
			await send(next);
			play("success", { emphasis: "subtle" });
		} catch (error) {
			setCounts(previous.counts);
			setMine(previous.mine);
			setPopped(null);
			play("error", { emphasis: "subtle" });
			setMessage(
				error instanceof Error && error.message !== "Failed to fetch"
					? error.message
					: "Couldn’t connect. Please try again.",
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<section
			aria-labelledby={`${id}-heading`}
			className="article-reactions"
			id="reactions"
			ref={section}
		>
			<h2 id={`${id}-heading`}>Leave a reaction</h2>
			<ul aria-busy={!counts || pending}>
				{REACTIONS.map(({ key, label }) => {
					const count = counts?.[key] ?? 0;
					return (
						<li key={key}>
							<button
								aria-label={`${label}, ${count} ${count === 1 ? "reaction" : "reactions"}`}
								aria-pressed={mine === key}
								data-pop={popped === key || undefined}
								disabled={!counts}
								onAnimationEnd={() => setPopped(null)}
								onClick={() => void choose(key)}
								title={label}
								type="button"
							>
								{/* biome-ignore lint/performance/noImgElement: tiny static sticker */}
								<img
									alt=""
									decoding="async"
									height={28}
									loading="lazy"
									src={`/blog/reactions/${key}.webp`}
									width={28}
								/>
								<span aria-hidden="true">{counts ? count : "–"}</span>
							</button>
						</li>
					);
				})}
			</ul>
			<p
				aria-live="polite"
				className="reaction-message"
				data-error={Boolean(message && message !== "Thanks for your reaction!")}
				role="status"
			>
				{message}
			</p>
		</section>
	);
}
