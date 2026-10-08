"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ExpandingSearch } from "~/components/interior/expanding-search";
import { Badge, BadgeButton } from "~/components/ui/badge";
import Image from "~/components/site-image";
import type { Article } from "~/lib/blog";

type ListedArticle = Pick<
	Article,
	| "title"
	| "slug"
	| "excerpt"
	| "categories"
	| "coverImage"
	| "publishedAt"
	| "readingMinutes"
> & { dateLabel: string };
const pageSize = 10;

export function BlogList({ articles }: { articles: ListedArticle[] }) {
	const [query, setQuery] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [category, setCategory] = useState("");
	const [page, setPage] = useState(1);
	const categories = Array.from(
		new Map(
			articles
				.flatMap((article) => article.categories)
				.map((item) => [item.slug, item]),
		).values(),
	);
	const filtered = articles.filter((article) => {
		const matchesCategory =
			!category || article.categories.some((item) => item.slug === category);
		const text =
			`${article.title} ${article.excerpt} ${article.categories.map((item) => item.name).join(" ")}`.toLowerCase();
		return matchesCategory && text.includes(query.trim().toLowerCase());
	});
	const pageCount = Math.ceil(filtered.length / pageSize);
	const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
	const archiveHeading = (
		<div className="blog-archive-heading">
			<h2 id="all-posts">
				All posts <span className="project-count">({articles.length})</span>
			</h2>
			{articles.length > 0 ? (
				<div className="blog-search-slot">
					<span
						aria-hidden={searchOpen}
						className="blog-search-order"
						style={{ opacity: searchOpen ? 0 : 1 }}
					>
						Newest first
					</span>
					<ExpandingSearch
						label="Search posts"
						placeholder="Search posts"
						value={query}
						resultCount={filtered.length}
						onOpenChange={setSearchOpen}
						onChange={(value) => {
							setQuery(value);
							setPage(1);
						}}
					/>
				</div>
			) : (
				<span>Newest first</span>
			)}
		</div>
	);

	if (articles.length === 0) {
		return (
			<section aria-labelledby="all-posts" className="blog-archive">
				{archiveHeading}
				<div className="blog-empty">
					<div aria-hidden="true" className="blog-empty-icon">
						<BookOpen size={22} strokeWidth={1.5} />
					</div>
					<div>
						<h3>No posts yet.</h3>
						<p>New articles will appear here once they’re published.</p>
						<Link className="blog-icon-link blog-empty-link" href="/blog/feed/">
							Follow via RSS
							<ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
						</Link>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section aria-labelledby="all-posts" className="blog-archive">
			{archiveHeading}
			<div className="blog-tools">
				{categories.length > 0 && (
					<fieldset className="blog-filters">
						<legend className="sr-only">Filter by category</legend>
						<BadgeButton
							aria-pressed={!category}
							onClick={() => {
								setCategory("");
								setPage(1);
							}}
							type="button"
						>
							All posts
						</BadgeButton>
						{categories.map((item) => (
							<BadgeButton
								aria-pressed={category === item.slug}
								aria-label={
									category === item.slug ? `Remove ${item.name}` : item.name
								}
								key={item.slug}
								onClick={() => {
									setCategory(category === item.slug ? "" : item.slug);
									setPage(1);
								}}
								type="button"
							>
								{item.name}
								{category === item.slug && <X aria-hidden="true" size={12} />}
							</BadgeButton>
						))}
					</fieldset>
				)}
			</div>
			<p aria-live="polite" className="blog-results">
				{filtered.length} {filtered.length === 1 ? "post" : "posts"}
				{query || category ? " found" : ""}
			</p>
			<div className="blog-list">
				{visible.map((article) => (
					<article className="blog-card" key={article.slug}>
						<div className="blog-card-copy">
							<div className="blog-meta">
								<time dateTime={article.publishedAt}>{article.dateLabel}</time>
								<span aria-hidden="true">·</span>
								<span>{article.readingMinutes} min read</span>
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
							{article.categories.length > 0 && (
								<ul aria-label="Categories" className="blog-tags">
									{article.categories.map((item) => (
										<li key={item.slug}>
											<Badge>{item.name}</Badge>
										</li>
									))}
								</ul>
							)}
						</div>
						{article.coverImage && (
							<Link
								aria-label={`Read ${article.title}`}
								className="blog-thumbnail"
								href={`/blog/${article.slug}/`}
							>
								<Image
									alt={article.coverImage.alternativeText || ""}
									height={120}
									placeholder={article.coverImage.placeholder}
									src={article.coverImage.url}
									width={160}
								/>
							</Link>
						)}
					</article>
				))}
			</div>
			{filtered.length === 0 && (
				<div className="blog-empty">
					<h3>No matching posts.</h3>
					<p>Try another search or category.</p>
					<button
						onClick={() => {
							setQuery("");
							setCategory("");
							setPage(1);
						}}
						type="button"
					>
						Clear filters
					</button>
				</div>
			)}
			{pageCount > 1 && (
				<nav aria-label="Blog pagination" className="blog-pagination">
					<button
						disabled={page === 1}
						onClick={() => setPage(page - 1)}
						type="button"
					>
						<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
						Previous
					</button>
					<span aria-live="polite">
						Page {page} of {pageCount}
					</span>
					<button
						disabled={page === pageCount}
						onClick={() => setPage(page + 1)}
						type="button"
					>
						Next
						<ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
					</button>
				</nav>
			)}
		</section>
	);
}
