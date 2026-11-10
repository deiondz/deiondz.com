import { ArrowLeft, Pin, Repeat2 } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { GuestbookComposer } from "~/components/guestbook/composer";
import { EntryActions } from "~/components/guestbook/entry-actions";
import { LikeButton } from "~/components/guestbook/like-button";
import { GuestbookSignIn } from "~/components/guestbook/sign-in";
import { enabledProviders, getSession, isOwner } from "~/lib/auth";
import {
	type GuestbookEntry,
	listEntries,
	MAX_ENTRY_LENGTH,
} from "~/lib/guestbook";
import "./guestbook.css";

export const metadata: Metadata = {
	title: "Guestbook | Deion D'Souza",
	description:
		"You stopped by. Leave a mark. Sign in with Google or GitHub and say hi.",
	alternates: { canonical: "/guestbook/" },
	openGraph: { url: "/guestbook/", title: "Guestbook | Deion D'Souza" },
};

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 31_536_000],
	["month", 2_592_000],
	["week", 604_800],
	["day", 86_400],
	["hour", 3_600],
	["minute", 60],
];

function timeAgo(timestamp: number, now: number) {
	const seconds = Math.round((timestamp - now) / 1000);
	for (const [unit, size] of UNITS)
		if (Math.abs(seconds) >= size)
			return relative.format(Math.round(seconds / size), unit);
	return "just now";
}

function Avatar({ name, image }: { name: string; image: string | null }) {
	if (image)
		return (
			// biome-ignore lint/performance/noImgElement: remote OAuth avatar
			<img
				alt=""
				className="guestbook-avatar"
				decoding="async"
				height={36}
				loading="lazy"
				referrerPolicy="no-referrer"
				src={image}
				width={36}
			/>
		);
	return (
		<span aria-hidden="true" className="guestbook-avatar">
			{[...name.trim()][0]?.toUpperCase() || "?"}
		</span>
	);
}

function Entry({
	entry,
	now,
	viewer,
}: {
	entry: GuestbookEntry;
	now: number;
	viewer: { id: string; owner: boolean } | null;
}) {
	return (
		<li className="guestbook-entry" data-pinned={entry.pinned || undefined}>
			<Avatar image={entry.image} name={entry.name} />
			<article aria-label={`Message #${entry.id} from ${entry.name}`}>
				<header className="guestbook-entry-meta">
					<strong>{entry.name}</strong>
					<span className="guestbook-number">#{entry.id}</span>
					<span aria-hidden="true">·</span>
					<time
						dateTime={new Date(entry.createdAt).toISOString()}
						title={`${fullDate.format(entry.createdAt)} UTC`}
					>
						{timeAgo(entry.createdAt, now)}
					</time>
					{entry.pinned && (
						<span className="guestbook-pinned" title="Pinned">
							<Pin aria-hidden="true" size={13} strokeWidth={2} />
							<span className="sr-only">Pinned</span>
						</span>
					)}
					{entry.backAgain && (
						<span className="guestbook-badge">
							<Repeat2 aria-hidden="true" size={13} strokeWidth={2} />
							Back again
						</span>
					)}
					{viewer && (viewer.owner || viewer.id === entry.userId) && (
						<EntryActions
							canPin={viewer.owner}
							id={entry.id}
							pinned={entry.pinned}
						/>
					)}
				</header>
				<p className="guestbook-body">{entry.body}</p>
				<LikeButton
					count={entry.likes}
					id={entry.id}
					liked={entry.likedByMe}
					signedIn={Boolean(viewer)}
				/>
			</article>
		</li>
	);
}

export default async function GuestbookPage() {
	const session = await getSession(await headers());
	const viewer = session
		? { id: session.user.id, owner: isOwner(session.user.email) }
		: null;
	const entries = listEntries(viewer?.id ?? null);
	const now = Date.now();

	return (
		<div className="page-shell guestbook-page">
			<main className="content guestbook-shell">
				<nav aria-label="Guestbook navigation" className="guestbook-nav">
					<Link
						className="guestbook-icon-link"
						data-cuelume-navigate=""
						href="/"
					>
						<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
						Portfolio
					</Link>
					<Link data-cuelume-navigate="" href="/blog/">
						Blog
					</Link>
				</nav>

				<header className="guestbook-hero">
					<h1>Guestbook</h1>
					<p>
						You stopped by. <mark>Leave a mark.</mark>
					</p>
				</header>

				<section aria-label="Guestbook" className="guestbook-panel">
					{session ? (
						<GuestbookComposer
							image={session.user.image ?? null}
							maxLength={MAX_ENTRY_LENGTH}
							name={session.user.name}
						/>
					) : (
						<GuestbookSignIn providers={enabledProviders()} />
					)}

					<div className="guestbook-list-heading">
						<h2>Messages</h2>
						<span>
							{entries.length}
							<span className="sr-only">
								{entries.length === 1 ? " message" : " messages"}
							</span>
						</span>
					</div>

					{entries.length ? (
						<ol className="guestbook-list">
							{entries.map((entry) => (
								<Entry entry={entry} key={entry.id} now={now} viewer={viewer} />
							))}
						</ol>
					) : (
						<p className="guestbook-empty">No messages yet. Be the first.</p>
					)}
				</section>

				<footer className="guestbook-footer">
					<Link data-cuelume-navigate="" href="/">
						Deion D&apos;Souza
					</Link>
					<a data-cuelume-tap="" href="mailto:deiondsouza12@gmail.com">
						Email
					</a>
				</footer>
			</main>
			<div aria-hidden="true" className="is-visible bottom-grid" />
		</div>
	);
}
