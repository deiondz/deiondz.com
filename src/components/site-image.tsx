"use client";

import placeholders from "~/lib/image-placeholders.json";
import { BlurUpImage, type BlurUpImageProps } from "./interior/blur-up-image";

type SiteImageProps = BlurUpImageProps & { priority?: boolean };

export default function SiteImage({
	src,
	placeholder,
	priority,
	...props
}: SiteImageProps) {
	const localPreview = src
		? (placeholders as Record<string, string>)[src]
		: undefined;
	return (
		<BlurUpImage
			fit={src?.endsWith(".svg") ? "contain" : "cover"}
			{...props}
			fetchPriority={priority ? "high" : props.fetchPriority}
			loading={priority ? "eager" : props.loading}
			placeholder={placeholder || localPreview}
			src={src}
		/>
	);
}
