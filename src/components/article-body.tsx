"use client";

import {
	type BlocksContent,
	BlocksRenderer,
} from "@strapi/blocks-react-renderer";
import Image from "next/image";

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
					code: ({ plainText }) => (
						<pre>
							<code>{plainText}</code>
						</pre>
					),
					image: ({ image }) => (
						<figure>
							<Image
								alt={image.alternativeText || ""}
								height={image.height || 480}
								src={image.url}
								unoptimized
								width={image.width || 720}
							/>
							{image.caption && <figcaption>{image.caption}</figcaption>}
						</figure>
					),
					link: ({ children, url }) => <a href={url}>{children}</a>,
				}}
				content={content}
			/>
		</div>
	);
}
