"use client";

import {
	motion,
	useIsomorphicLayoutEffect,
	useReducedMotion,
} from "motion/react";
import { type CSSProperties, useRef, useState } from "react";

const DEVELOP = { duration: 0.65, ease: [0.23, 1, 0.32, 1] } as const;

const INSTANT = { duration: 0 } as const;

export type BlurUpStatus = "loading" | "ready" | "error";

export type UseBlurUpImageOptions = {
	src?: string;
	srcSet?: string;
	onReady?: () => void;
	onError?: () => void;
};

export function useBlurUpImage({
	src,
	srcSet,
	onReady,
	onError,
}: UseBlurUpImageOptions) {
	const ref = useRef<HTMLImageElement>(null);
	const [state, setState] = useState<{
		status: BlurUpStatus;
		instant: boolean;
	}>({ status: "loading", instant: false });

	const ready = useRef(onReady);
	ready.current = onReady;
	const failed = useRef(onError);
	failed.current = onError;

	useIsomorphicLayoutEffect(() => {
		const img = ref.current;

		const set = (status: BlurUpStatus, instant: boolean) =>
			setState((prev) =>
				prev.status === status && prev.instant === instant
					? prev
					: { status, instant },
			);

		if (!img || !src) {
			set("loading", false);
			return;
		}

		let alive = true;

		const cached = img.complete && img.naturalWidth > 0;

		const reveal = () => {
			if (!alive) return;
			set("ready", cached);
			ready.current?.();
		};

		const fail = () => {
			if (!alive) return;
			set("error", cached);
			failed.current?.();
		};

		if (img.complete) {
			if (cached) reveal();
			else fail();
			return () => {
				alive = false;
			};
		}

		set("loading", false);

		const onLoad = () => {
			if (!alive) return;
			if (typeof img.decode === "function") {
				img.decode().then(reveal, fail);
				return;
			}
			reveal();
		};

		img.addEventListener("load", onLoad);
		img.addEventListener("error", fail);

		return () => {
			alive = false;
			img.removeEventListener("load", onLoad);
			img.removeEventListener("error", fail);
		};
	}, [src, srcSet]);

	return {
		ref,
		status: state.status,
		instant: state.instant,
		loaded: state.status === "ready",
	};
}

export type BlurUpImageProps = {
	src?: string;
	alt: string;
	width: number;
	height: number;
	placeholder?: string;
	color?: string;
	blur?: number;
	radius?: number;
	fit?: "cover" | "contain";
	srcSet?: string;
	sizes?: string;
	loading?: "lazy" | "eager";
	fetchPriority?: "high" | "low" | "auto";
	onReady?: () => void;
	onError?: () => void;
	className?: string;
};

export function BlurUpImage({
	src,
	alt,
	width,
	height,
	placeholder,
	color,
	blur = 14,
	radius,
	fit = "cover",
	srcSet,
	sizes,
	loading = "lazy",
	fetchPriority,
	onReady,
	onError,
	className = "",
}: BlurUpImageProps) {
	const reduced = useReducedMotion();
	const { ref, status, instant } = useBlurUpImage({
		src,
		srcSet,
		onReady,
		onError,
	});

	const shown = status === "ready";
	const still = reduced === true || instant;
	const transition = still ? INSTANT : DEVELOP;

	return (
		<div
			aria-busy={status === "loading"}
			className={`blur-up-image ${className}`}
			style={
				{
					aspectRatio: `${width} / ${height}`,
					borderRadius: radius,
					"--image-width": `${width}px`,
					"--image-fit": fit,
					backgroundColor: color,
				} as CSSProperties
			}
		>
			{placeholder ? (
				// biome-ignore lint/performance/noImgElement: custom blur-up renderer for a static export
				<motion.img
					alt=""
					animate={{ opacity: shown ? 0 : 1 }}
					aria-hidden
					className="blur-up-image-layer"
					draggable={false}
					initial={false}
					src={placeholder}
					style={{ filter: `blur(${blur}px)`, transform: "scale(1.08)" }}
					transition={transition}
				/>
			) : null}
			{/* biome-ignore lint/performance/noImgElement: animated static image */}
			<motion.img
				alt={alt}
				animate={
					shown
						? {
								opacity: 1,
								filter: "blur(0px) saturate(1)",
								scale: 1,
							}
						: {
								opacity: 0,
								filter: "blur(18px) saturate(0.6)",
								scale: 1.06,
							}
				}
				className="blur-up-image-layer"
				decoding="async"
				draggable={false}
				fetchPriority={fetchPriority}
				height={height}
				initial={false}
				loading={loading}
				ref={ref}
				sizes={sizes}
				src={src}
				srcSet={srcSet}
				transition={transition}
				width={width}
			/>
			<noscript>
				{/* biome-ignore lint/performance/noImgElement: visible fallback without JavaScript */}
				<img
					alt={alt}
					className="blur-up-image-layer"
					height={height}
					src={src}
					width={width}
				/>
			</noscript>
			{status === "error" ? (
				<motion.div
					animate={{ opacity: 1 }}
					aria-hidden
					className="absolute inset-0 grid place-items-center bg-white text-stone-400"
					initial={{ opacity: 0 }}
					transition={transition}
				>
					<svg
						aria-hidden="true"
						fill="currentColor"
						height="22"
						viewBox="0 0 256 256"
						width="22"
					>
						<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16h64a8,8,0,0,0,7.59-5.47l14.83-44.48L163,151.43a8.07,8.07,0,0,0,4.46-4.46l14.62-36.55,44.48-14.83A8,8,0,0,0,232,88V56A16,16,0,0,0,216,40ZM112.41,157.47,98.23,200H40V172l52-52,30.42,30.42L117,152.57A8,8,0,0,0,112.41,157.47ZM216,82.23,173.47,96.41a8,8,0,0,0-4.9,4.62l-14.72,36.82L138.58,144l-35.27-35.27a16,16,0,0,0-22.62,0L40,149.37V56H216Zm12.68,33a8,8,0,0,0-7.21-1.1l-23.8,7.94a8,8,0,0,0-4.9,4.61l-14.31,35.77-35.77,14.31a8,8,0,0,0-4.61,4.9l-7.94,23.8A8,8,0,0,0,137.73,216H216a16,16,0,0,0,16-16V121.73A8,8,0,0,0,228.68,115.24ZM216,200H148.83l3.25-9.75,35.51-14.2a8.07,8.07,0,0,0,4.46-4.46l14.2-35.51,9.75-3.25Z" />
					</svg>
				</motion.div>
			) : null}
		</div>
	);
}
