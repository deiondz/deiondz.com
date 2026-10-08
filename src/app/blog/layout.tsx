import { ArrowLeft, Rss } from "lucide-react";
import Link from "next/link";
import "./blog.css";

export default function BlogLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="page-shell blog-page">
			<main className="content blog-shell">
				<nav aria-label="Blog navigation" className="blog-nav">
					<Link className="blog-icon-link" data-cuelume-navigate="" href="/">
						<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
						Portfolio
					</Link>
					<Link
						className="blog-icon-link"
						data-cuelume-navigate=""
						href="/blog/feed/"
					>
						<Rss aria-hidden="true" size={14} strokeWidth={1.8} />
						RSS feed
					</Link>
				</nav>
				{children}
				<footer className="blog-footer">
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
