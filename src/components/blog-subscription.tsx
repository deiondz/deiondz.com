"use client";

import { type FormEvent, useId, useState } from "react";

function useSubscription(action: "subscribe" | "confirm" | "unsubscribe") {
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState("");
	const [success, setSuccess] = useState(false);
	async function submit(payload: { email?: string; token?: string }) {
		setPending(true);
		setMessage("");
		try {
			const result = await fetch(`/api/blog-subscriptions/${action}/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(15_000),
			});
			const data: { message?: string } = await result.json();
			setSuccess(result.ok);
			setMessage(data.message || "Something went wrong. Please try again.");
		} catch {
			setMessage("Couldn’t connect. Please try again.");
		} finally {
			setPending(false);
		}
	}
	return { pending, message, success, submit };
}

export function BlogSubscription() {
	const id = useId();
	const { pending, message, success, submit } = useSubscription("subscribe");
	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const email = String(new FormData(event.currentTarget).get("email") || "");
		void submit({ email });
	}
	return (
		<section aria-labelledby={`${id}-heading`} className="blog-subscription">
			<h2 id={`${id}-heading`}>Get new posts by email.</h2>
			<p>A short preview of each new post. Unsubscribe anytime.</p>
			{!success && (
				<form aria-busy={pending} onSubmit={onSubmit}>
					<label className="sr-only" htmlFor={`${id}-email`}>
						Email address
					</label>
					<input
						autoComplete="email"
						disabled={pending}
						id={`${id}-email`}
						maxLength={254}
						name="email"
						placeholder="Your email address"
						required
						type="email"
					/>
					<button disabled={pending} type="submit">
						{pending ? "Subscribing…" : "Subscribe"}
					</button>
				</form>
			)}
			<p
				aria-live="polite"
				className="subscription-message"
				data-error={Boolean(message && !success)}
				role="status"
			>
				{message}
			</p>
		</section>
	);
}

export function BlogSubscriptionAction({
	action,
	token,
}: {
	action: "confirm" | "unsubscribe";
	token: string;
}) {
	const { pending, message, success, submit } = useSubscription(action);
	return (
		<div className="blog-subscription subscription-action">
			<p>
				{action === "confirm"
					? "Confirm to receive new posts from Deion D’Souza."
					: "Unsubscribe from new posts by Deion D’Souza."}
			</p>
			{!token ? (
				<p>
					This link is missing its token. Please use the link in your email.
				</p>
			) : (
				!success && (
					<form
						aria-busy={pending}
						onSubmit={(event) => {
							event.preventDefault();
							void submit({ token });
						}}
					>
						<button disabled={pending} type="submit">
							{pending
								? "Please wait…"
								: action === "confirm"
									? "Confirm subscription"
									: "Unsubscribe"}
						</button>
					</form>
				)
			)}
			<p
				aria-live="polite"
				className="subscription-message"
				data-error={Boolean(message && !success)}
				role="status"
			>
				{message}
			</p>
		</div>
	);
}
