"use client";

import { play } from "cuelume";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";

type Provider = "github" | "google";

function GitHubMark() {
	return (
		<svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
			<path
				d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function GoogleMark() {
	return (
		<svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
			<path
				d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z"
				fill="#4285F4"
			/>
			<path
				d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
				fill="#34A853"
			/>
			<path
				d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.11Z"
				fill="#FBBC05"
			/>
			<path
				d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z"
				fill="#EA4335"
			/>
		</svg>
	);
}

const LABELS: Record<
	Provider,
	{ label: string; Mark: () => React.JSX.Element }
> = {
	github: { label: "GitHub", Mark: GitHubMark },
	google: { label: "Google", Mark: GoogleMark },
};

export function GuestbookSignIn({ providers }: { providers: Provider[] }) {
	const [pending, setPending] = useState<Provider | null>(null);
	const [error, setError] = useState("");

	async function signIn(provider: Provider) {
		setPending(provider);
		setError("");
		const { error } = await authClient.signIn.social({
			provider,
			callbackURL: "/guestbook/",
			errorCallbackURL: "/guestbook/",
		});
		if (error) {
			play("error", { emphasis: "subtle" });
			setError(error.message || "Couldn’t start sign-in. Please try again.");
			setPending(null);
		}
	}

	return (
		<div className="guestbook-intro">
			<div>
				<h2>You stopped by. Leave a mark.</h2>
				<p>
					Say hi, share a thought, or just let me know you were here. Sign in,
					it only takes a second.
				</p>
				<code>{"// hi. you stopped by. that means something."}</code>
			</div>
			<div className="guestbook-sign-in">
				{providers.length === 0 && (
					<p className="guestbook-message">Sign-in isn’t configured yet.</p>
				)}
				{providers.map((provider) => {
					const { label, Mark } = LABELS[provider];
					return (
						<button
							aria-busy={pending === provider}
							className="guestbook-button guestbook-button-outline"
							disabled={pending !== null}
							key={provider}
							onClick={() => void signIn(provider)}
							type="button"
						>
							<Mark />
							{pending === provider ? "Redirecting…" : `Sign in with ${label}`}
						</button>
					);
				})}
				<p
					aria-live="polite"
					className="guestbook-message"
					data-error="true"
					role="status"
				>
					{error}
				</p>
			</div>
		</div>
	);
}
