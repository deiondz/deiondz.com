import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "~/components/article-body";
import { BlogList } from "~/components/blog-list";
import { ShareArticle } from "~/components/share-article";
import { articleUrl, formatDate, getArticles } from "~/lib/blog";

type Props = { params: Promise<{ slug?: string[] }> };
export const dynamicParams = false;

export function generateStaticParams() {
	return [
		{ slug: [] },
		...getArticles().map((article) => ({ slug: [article.slug] })),
	];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	if (!slug?.length) {
		return {
			title: "Blog | Deion D'Souza",
			description: "Articles and notes by Deion D'Souza.",
			alternates: {
				canonical: "/blog/",
				types: { "application/rss+xml": "/blog/feed.xml" },
			},
			openGraph: {
				title: "Blog | Deion D'Souza",
				description: "Articles and notes by Deion D'Souza.",
				url: "/blog/",
				type: "website",
			},
			twitter: {
				title: "Blog | Deion D'Souza",
				description: "Articles and notes by Deion D'Souza.",
			},
		};
	}
	const article = getArticles().find((item) => item.slug === slug[0]);
	if (slug.length !== 1 || !article) notFound();
	const images = article.coverImage
		? [
				{
					url: article.coverImage.url,
					alt: article.coverImage.alternativeText || article.title,
				},
			]
		: [{ url: "/og-image-1200x630.jpg" }];
	return {
		title: `${article.title} | Deion D'Souza`,
		description: article.excerpt,
		alternates: {
			canonical: articleUrl(article.slug),
			types: { "application/rss+xml": "/blog/feed.xml" },
		},
		openGraph: {
			title: article.title,
			description: article.excerpt,
			type: "article",
			url: articleUrl(article.slug),
			publishedTime: article.publishedAt,
			modifiedTime: article.updatedAt,
			authors: ["Deion D'Souza"],
			images,
		},
		twitter: {
			card: "summary_large_image",
			title: article.title,
			description: article.excerpt,
			images,
		},
	};
}

export default async function BlogPage({ params }: Props) {
	const { slug } = await params;
	const articles = getArticles();
	if (!slug?.length) {
		const listed = articles.map(
			({
				content: _content,
				plainText: _plainText,
				updatedAt: _updatedAt,
				...article
			}) => ({ ...article, dateLabel: formatDate(article.publishedAt) }),
		);
		return (
			<>
				<header className="blog-heading">
					<h1>Blog</h1>
					<p>Articles and notes.</p>
				</header>
				<BlogList articles={listed} />
			</>
		);
	}
	const article = articles.find((item) => item.slug === slug[0]);
	if (slug.length !== 1 || !article) notFound();
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: article.title,
		description: article.excerpt,
		datePublished: article.publishedAt,
		dateModified: article.updatedAt,
		mainEntityOfPage: articleUrl(article.slug),
		author: {
			"@type": "Person",
			name: "Deion D'Souza",
			url: "https://deiondz.com/",
		},
		...(article.coverImage ? { image: article.coverImage.url } : {}),
	};
	return (
		<>
			<script // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized JSON-LD escapes HTML delimiters
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
				}}
				type="application/ld+json"
			/>
			<article>
				<header className="article-heading">
					<Link className="article-back" href="/blog/">
						← All posts
					</Link>
					{article.categories.length > 0 && (
						<ul aria-label="Categories" className="blog-tags">
							{article.categories.map((item) => (
								<li key={item.slug}>{item.name}</li>
							))}
						</ul>
					)}
					<h1>{article.title}</h1>
					<div className="blog-meta">
						<time dateTime={article.publishedAt}>
							{formatDate(article.publishedAt)}
						</time>
						<span aria-hidden="true">·</span>
						<span>{article.readingMinutes} min read</span>
					</div>
					{article.excerpt && (
						<p className="article-excerpt">{article.excerpt}</p>
					)}
				</header>
				{article.coverImage && (
					<Image
						alt={article.coverImage.alternativeText || ""}
						className="article-cover"
						height={article.coverImage.height || 480}
						priority
						src={article.coverImage.url}
						unoptimized
						width={article.coverImage.width || 720}
					/>
				)}
				<ArticleBody content={article.content} />
				<ShareArticle title={article.title} url={articleUrl(article.slug)} />
			</article>
		</>
	);
}
