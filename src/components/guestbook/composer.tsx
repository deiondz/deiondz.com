"use client";

import { play } from "cuelume";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";
import { type PostState, postEntry } from "~/app/guestbook/actions";
import { authClient } from "~/lib/auth-client";

export function GuestbookComposer({
	name,
	image,
	maxLength,
}: {
	name: string;
	image: string | null;
	maxLength: number;
}) {
	const id = useId();
	const router = useRouter();
	// Controlled, so React's post-action form reset can't discard a message
	// that failed to post.
	const [body, setBody] = useState("");
	const length = [...body].length;
	const [signingOut, setSigningOut] = useState(false);
	const [state, action, pending] = useActionState<PostState, FormData>(
		postEntry,
		{},
	);

	useEffect(() => {
		if (state.ok) {
			setBody("");
			play("success", { emphasis: "subtle" });
		} else if (state.error) play("error", { emphasis: "subtle" });
	}, [state]);

	async function signOut() {
		setSigningOut(true);
		await authClient.signOut();
		router.refresh();
	}

	return (
		<form action={action} aria-busy={pending} className="guestbook-composer">
			<div className="guestbook-composer-who">
				{image ? (
					// biome-ignore lint/performance/noImgElement: remote OAuth avatar
					<img
						alt=""
						className="guestbook-avatar"
						height={36}
						referrerPolicy="no-referrer"
						src={image}
						width={36}
					/>
				) : null}
				<p>
					Signed in as <strong>{name}</strong>
					<span aria-hidden="true"> · </span>
					<button
						className="guestbook-link-button"
						disabled={signingOut}
						onClick={() => void signOut()}
						type="button"
					>
						{signingOut ? "Signing out…" : "Sign out"}
					</button>
				</p>
			</div>
			<label className="sr-only" htmlFor={`${id}-body`}>
				Your message
			</label>
			<textarea
				id={`${id}-body`}
				maxLength={maxLength}
				name="body"
				onChange={(event) => setBody(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
						event.currentTarget.form?.requestSubmit();
				}}
				placeholder="Say hi, share a thought, or just let me know you were here."
				readOnly={pending}
				required
				rows={3}
				value={body}
			/>
			<div className="guestbook-composer-footer">
				<p
					aria-live="polite"
					className="guestbook-message"
					data-error={Boolean(state.error)}
					role="status"
				>
					{state.error || (state.ok ? "Thanks for leaving a mark!" : "")}
				</p>
				<span
					className="guestbook-counter"
					data-near={length > maxLength - 50 || undefined}
				>
					{length}/{maxLength}
					<span className="sr-only"> characters</span>
				</span>
				<button
					className="guestbook-button"
					disabled={pending || length === 0}
					type="submit"
				>
					{pending ? "Posting…" : "Sign the guestbook"}
				</button>
			</div>
		</form>
	);
}
