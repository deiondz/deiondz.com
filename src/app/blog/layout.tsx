import Link from "next/link";
import "./blog.css";

export default function BlogLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="blog-shell">
			<nav aria-label="Blog navigation" className="blog-nav">
				<Link href="/">← Portfolio</Link>
				<a href="/blog/feed.xml">RSS feed ↗</a>
			</nav>
			{children}
			<footer className="blog-footer">
				<Link href="/">Deion D&apos;Souza</Link>
				<a href="mailto:deiondsouza12@gmail.com">Email</a>
			</footer>
		</main>
	);
}
