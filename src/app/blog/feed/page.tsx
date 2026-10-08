import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getArticles } from "~/lib/blog";

export const metadata: Metadata = {
	title: "RSS feed | Deion D'Souza",
	description: "Follow new articles by Deion D'Souza in your RSS reader.",
	alternates: { canonical: "/blog/feed/" },
};

export default function FeedPage() {
	const articles = getArticles();
	return (
		<>
			<header className="blog-heading">
				<h1>RSS feed</h1>
				<p className="tagline">Follow new articles in your RSS reader.</p>
			</header>
			<section
				aria-labelledby="subscribe-heading"
				className="feed-subscription"
			>
				<h2 id="subscribe-heading">Subscribe</h2>
				<p>Copy this address into your reader to receive new posts.</p>
				<label className="sr-only" htmlFor="feed-address">
					RSS subscription address
				</label>
				<input
					className="feed-address"
					id="feed-address"
					readOnly
					value="https://deiondz.com/blog/feed.xml"
				/>
			</section>
			<section aria-labelledby="feed-posts" className="blog-archive">
				<div className="blog-archive-heading">
					<h2 id="feed-posts">
						Latest posts{" "}
						<span className="project-count">({articles.length})</span>
					</h2>
				</div>
				{articles.length === 0 ? (
					<p>
						No posts yet. New articles will appear here once they’re published.
					</p>
				) : (
					<div className="blog-list">
						{articles.map((article) => (
							<article className="blog-card" key={article.slug}>
								<div className="blog-card-copy">
									<div className="blog-meta">
										<time dateTime={article.publishedAt}>
											{formatDate(article.publishedAt)}
										</time>
									</div>
									<h3>
										<Link href={`/blog/${article.slug}/`}>
											<span>{article.title}</span>
											<ArrowUpRight
												aria-hidden="true"
												size={18}
												strokeWidth={1.8}
											/>
										</Link>
									</h3>
									<p>{article.excerpt}</p>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</>
	);
}
