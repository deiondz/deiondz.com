"use client";

import { type ReactNode, useRef } from "react";
import { ReadingProgress } from "~/components/interior/reading-progress";

export function ArticleReadingProgress({
	children,
	words,
}: {
	children: ReactNode;
	words: number;
}) {
	const body = useRef<HTMLDivElement>(null);

	return (
		<div className="article-reading">
			<div className="article-reading-toolbar">
				<ReadingProgress target={body} words={words} />
			</div>
			<div ref={body}>{children}</div>
		</div>
	);
}
