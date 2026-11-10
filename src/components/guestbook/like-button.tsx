"use client";

import { play } from "cuelume";
import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { likeEntry } from "~/app/guestbook/actions";

export function LikeButton({
	id,
	count,
	liked,
	signedIn,
}: {
	id: number;
	count: number;
	liked: boolean;
	signedIn: boolean;
}) {
	const [, startTransition] = useTransition();
	const [state, setState] = useOptimistic({ count, liked });

	function toggle() {
		const next = !state.liked;
		startTransition(async () => {
			setState({ liked: next, count: state.count + (next ? 1 : -1) });
			try {
				await likeEntry(id, next);
				if (next) play("success", { emphasis: "subtle" });
			} catch {
				play("error", { emphasis: "subtle" });
			}
		});
	}

	return (
		<button
			aria-label={`${state.liked ? "Unlike" : "Like"}, ${state.count} ${state.count === 1 ? "like" : "likes"}`}
			aria-pressed={state.liked}
			className="guestbook-like"
			disabled={!signedIn}
			onClick={toggle}
			title={signedIn ? undefined : "Sign in to like"}
			type="button"
		>
			<Heart aria-hidden="true" size={15} strokeWidth={2} />
			<span aria-hidden="true">{state.count}</span>
		</button>
	);
}
