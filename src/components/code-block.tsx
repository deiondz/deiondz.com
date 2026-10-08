// biome-ignore-all lint/suspicious/noArrayIndexKey: Source positions identify immutable code lines and fragments, including repeated text.
"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * CODE BLOCK
 * A light editor panel with Code and Diff variants:
 *   · Code — a line-numbered listing
 *   · Diff — a unified diff: old/new gutters, a green/red accent
 *     bar and row tint, plus word-level add/del highlights.
 * Both share syntax coloring, insets, and wrapping behavior.
 * ───────────────────────────────────────────────────────── */

/* A single run of code within a diff row; `change` tints it as an add/del. */
export type CodePiece = { text: string; change?: "add" | "del" };
/* One row of a unified diff: old/new line numbers, its kind, and its pieces. */
export type DiffRow = {
	old: number | null;
	cur: number | null;
	type: "ctx" | "add" | "del";
	pieces: CodePiece[];
};
/* Prominent copy strings on the code block. */
export type CodeBlockLabels = { copy: string; copied: string };

// Back-compat internal aliases for the local component signatures.
type Piece = CodePiece;

const HATCH =
	"repeating-linear-gradient(45deg, var(--red) 0, var(--red) 1.5px, transparent 1.5px, transparent 3px)";

/* light syntax coloring — keywords/imports/conditionals, functions, strings & numbers */
const KEYWORDS = new Set([
	"import",
	"from",
	"export",
	"default",
	"async",
	"function",
	"const",
	"let",
	"var",
	"await",
	"return",
	"if",
	"else",
	"for",
	"while",
	"new",
	"throw",
	"try",
	"catch",
	"null",
	"true",
	"false",
	"undefined",
]);
const TOKEN =
	/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b(?:import|from|export|default|async|function|const|let|var|await|return|if|else|for|while|new|throw|try|catch|null|true|false|undefined)\b|[A-Za-z_$][\w$]*(?=\s*\())/g;

function highlight(text: string): ReactNode[] {
	const nodes: ReactNode[] = [];
	let last = 0;
	let k = 0;
	for (const m of text.matchAll(TOKEN)) {
		const idx = m.index ?? 0;
		const t = m[0];
		if (idx > last) nodes.push(<span key={k++}>{text.slice(last, idx)}</span>);
		let color: string;
		let weight: number | undefined;
		if (/^["'`]/.test(t) || /^\d/.test(t))
			color = "var(--orange)"; // string / number
		else if (KEYWORDS.has(t))
			color = "var(--accent-ink)"; // keyword / import / conditional
		else {
			color = "var(--ink)";
			weight = 500;
		} // function call
		nodes.push(
			<span key={k++} style={{ color, fontWeight: weight }}>
				{t}
			</span>,
		);
		last = idx + t.length;
	}
	if (last < text.length) nodes.push(<span key={k++}>{text.slice(last)}</span>);
	return nodes;
}

function Pieces({ pieces }: { pieces: Piece[] }) {
	return (
		<>
			{pieces.map((p, i) => {
				if (p.change) {
					const add = p.change === "add";
					return (
						<span
							className="rounded-[3px]"
							key={i}
							style={{
								background: `color-mix(in srgb, var(--${add ? "green" : "red"}) 18%, transparent)`,
								padding: "0 2px",
								margin: "0 -1px",
								boxDecorationBreak: "clone",
								WebkitBoxDecorationBreak: "clone",
							}}
						>
							{highlight(p.text)}
						</span>
					);
				}
				return <span key={i}>{highlight(p.text)}</span>;
			})}
		</>
	);
}

function FileIcon() {
	return (
		<svg
			aria-hidden
			className="shrink-0 text-[var(--ink-3)]"
			fill="none"
			height="15"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
			viewBox="0 0 24 24"
			width="15"
		>
			<path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
		</svg>
	);
}

const DEFAULT_LABELS: CodeBlockLabels = { copy: "Copy", copied: "Copied" };

export type CodeBlockProps = {
	/** Which view to render — "Code" (line-numbered listing) or "Diff". */
	variant?: "Code" | "Diff";
	/** The lines shown in the Code view. */
	lines?: string[];
	/** Raw text placed on the clipboard by Copy. Defaults to `lines` joined. */
	code?: string;
	/** The unified-diff rows shown in the Diff view. */
	diff?: DiffRow[];
	/** Filename shown in the header. */
	filename?: string;
	/** Prominent copy strings. */
	labels?: Partial<CodeBlockLabels>;
	/** Called with the copied text after a successful copy. */
	onCopy?: (text: string) => void;
};

export default function CodeBlock({
	variant = "Code",
	lines,
	code,
	diff = [],
	filename = "Code",
	labels,
	onCopy,
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timeout = setTimeout(() => setCopied(false), 1500);
		return () => clearTimeout(timeout);
	}, [copied]);
	const isDiff = variant === "Diff";
	const text = { ...DEFAULT_LABELS, ...labels };
	const sourceLines = lines ?? (code ?? "").replace(/\r\n/g, "\n").split("\n");
	const raw =
		code ??
		(isDiff
			? diff
					.filter((row) => row.type !== "del")
					.map((row) => row.pieces.map((piece) => piece.text).join(""))
					.join("\n")
			: sourceLines.join("\n"));

	const copy = useCallback(async () => {
		setCopyError(false);
		try {
			await navigator.clipboard.writeText(raw);
			setCopied(true);
			onCopy?.(raw);
		} catch {
			setCopyError(true);
		}
	}, [raw, onCopy]);

	const added = diff.filter((r) => r.type === "add").length;
	const removed = diff.filter((r) => r.type === "del").length;

	return (
		<div className="code-block w-full max-w-105 overflow-hidden rounded-xl bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
			<span className="sr-only" role="status">
				{copied ? "Code copied." : ""}
			</span>
			{copyError && (
				<div className="px-4 pt-3 text-[12px]" role="status">
					Copy unavailable. Select the code and copy it manually.
				</div>
			)}
			{/* header — file · (diff stat | copy) */}
			<div className="flex h-11 items-center gap-2 border-[var(--line)] border-b px-4 text-[12.5px]">
				<span className="inline-flex min-w-0 items-center gap-[7px]">
					<FileIcon />
					<span className="truncate font-mono text-[var(--ink)] leading-none">
						{filename}
					</span>
				</span>

				{isDiff ? (
					<span className="ml-auto inline-flex items-center gap-2 font-mono text-[12px] tabular-nums leading-none">
						<span className="text-[var(--green)]">+{added}</span>
						<span className="text-[var(--red)]">-{removed}</span>
					</span>
				) : (
					<button
						aria-label="Copy code"
						className={`-mr-1 ml-auto flex h-6 items-center gap-1 rounded-[6px] px-1.5 font-medium text-[12px] transition-colors duration-100 hover:bg-[var(--hover)] ${copied ? "text-[var(--green)]" : "text-[var(--ink-3)] hover:text-[var(--ink)]"}`}
						onClick={copy}
						type="button"
					>
						{copied ? (
							<svg
								aria-hidden="true"
								fill="none"
								height="11"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="3"
								viewBox="0 0 24 24"
								width="11"
							>
								<path d="M20 6L9 17l-5-5" />
							</svg>
						) : (
							<svg
								aria-hidden="true"
								fill="none"
								height="11"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								viewBox="0 0 24 24"
								width="11"
							>
								<rect height="12" rx="2.5" width="12" x="9" y="9" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
						)}
						{copied ? text.copied : text.copy}
					</button>
				)}
			</div>

			{/* body — equal 12px inset on top / left / right; lines wrap */}
			<div className="py-3 font-mono text-[12.5px] text-[var(--ink-2)] leading-[1.65]">
				{isDiff ? (
					<div className="relative">
						<span className="pointer-events-none absolute inset-y-0 left-5 w-px bg-[var(--line)]" />
						{diff.map((r, i) => {
							const add = r.type === "add";
							const del = r.type === "del";
							// one gutter column: removals keep the old number, additions/context show the new one
							const num = del ? r.old : r.cur;
							return (
								<div
									className={`relative grid grid-cols-[20px_minmax(0,1fr)] items-start ${add ? "bg-[var(--green-tint)]" : del ? "bg-[var(--red-tint)]" : ""}`}
									key={i}
								>
									{(add || del) && (
										<span
											className="absolute inset-y-0 left-0 w-[3px]"
											style={{ background: add ? "var(--green)" : HATCH }}
										/>
									)}
									<span
										className={`select-none text-center text-[11px] ${add ? "text-[var(--green)]" : del ? "text-[var(--red)]" : "text-[var(--ink-3)]"}`}
									>
										{num ?? ""}
									</span>
									<code className="whitespace-pre-wrap break-words pr-3 pl-1">
										<Pieces pieces={r.pieces} />
									</code>
								</div>
							);
						})}
					</div>
				) : (
					<div className="relative">
						<span className="pointer-events-none absolute inset-y-0 left-5 w-px bg-[var(--line)]" />
						{sourceLines.map((line, i) => (
							<div
								className="grid grid-cols-[20px_minmax(0,1fr)] items-start"
								key={i}
							>
								<span className="select-none text-center text-[11px] text-[var(--ink-3)]">
									{i + 1}
								</span>
								<code className="whitespace-pre-wrap break-words pr-3 pl-1">
									{highlight(line)}
								</code>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
