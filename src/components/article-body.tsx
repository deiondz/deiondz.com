"use client";

import {
	type BlocksContent,
	BlocksRenderer,
} from "@strapi/blocks-react-renderer";
import Image from "~/components/site-image";
import { getMediaEmbed, linkifyMediaUrls } from "~/lib/media-embeds";
import CodeBlock from "./code-block";

export function ArticleBody({ content }: { content: BlocksContent }) {
	return (
		<div className="article-body">
			<BlocksRenderer
				blocks={{
					heading: ({ children, level }) => {
						const Heading = `h${Math.max(2, level)}` as
							| "h2"
							| "h3"
							| "h4"
							| "h5"
							| "h6";
						return <Heading>{children}</Heading>;
					},
					code: ({ plainText }) => <CodeBlock code={plainText || ""} />,
					image: ({ image }) => (
						<figure>
							<Image
								alt={image.alternativeText || ""}
								height={image.height || 480}
								placeholder={
									(image as typeof image & { placeholder?: string }).placeholder
								}
								src={image.url}
								width={image.width || 720}
							/>
							{image.caption && <figcaption>{image.caption}</figcaption>}
						</figure>
					),
					link: ({ children, url }) => {
						const embed = getMediaEmbed(url);
						if (!embed) {
							return (
								<a data-cuelume-navigate="" href={url}>
									{children}
								</a>
							);
						}
						return (
							<span className={`article-embed article-embed-${embed.provider}`}>
								<iframe
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
									allowFullScreen
									height={embed.height}
									loading="lazy"
									referrerPolicy="strict-origin-when-cross-origin"
									src={embed.src}
									title={
										embed.provider === "youtube"
											? "YouTube video player"
											: "Spotify music player"
									}
								/>
								<a className="article-embed-source" href={url}>
									{children}
								</a>
							</span>
						);
					},
				}}
				content={linkifyMediaUrls(content)}
			/>
		</div>
	);
}
