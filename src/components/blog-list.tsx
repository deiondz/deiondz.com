"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

	if (articles.length === 0) {
		return (
			<div className="blog-empty">
				<h2>No posts yet.</h2>
				<p>New articles will appear here once they’re published.</p>
			</div>
		);
	}

	return (
		<>
			<div className="blog-tools">
				<label className="blog-search">
					<span className="sr-only">Search posts</span>
					<input
						onChange={(event) => {
							setQuery(event.target.value);
							setPage(1);
						}}
						placeholder="Search posts"
						type="search"
						value={query}
					/>
				</label>
				{categories.length > 0 && (
					<fieldset className="blog-filters">
						<legend className="sr-only">Filter by category</legend>
						<button
							aria-pressed={!category}
							onClick={() => {
								setCategory("");
								setPage(1);
							}}
							type="button"
						>
							All posts
						</button>
						{categories.map((item) => (
							<button
								aria-pressed={category === item.slug}
								key={item.slug}
								onClick={() => {
									setCategory(item.slug);
									setPage(1);
								}}
								type="button"
							>
								{item.name}
							</button>
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
							<h2>
								<Link href={`/blog/${article.slug}/`}>{article.title}</Link>
							</h2>
							<p>{article.excerpt}</p>
							{article.categories.length > 0 && (
								<ul aria-label="Categories" className="blog-tags">
									{article.categories.map((item) => (
										<li key={item.slug}>{item.name}</li>
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
									src={article.coverImage.url}
									unoptimized
									width={160}
								/>
							</Link>
						)}
					</article>
				))}
			</div>
			{filtered.length === 0 && (
				<div className="blog-empty">
					<h2>No matching posts.</h2>
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
						← Previous
					</button>
					<span aria-live="polite">
						Page {page} of {pageCount}
					</span>
					<button
						disabled={page === pageCount}
						onClick={() => setPage(page + 1)}
						type="button"
					>
						Next →
					</button>
				</nav>
			)}
		</>
	);
}
