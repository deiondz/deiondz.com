import { timingSafeEqual } from "node:crypto";
import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { loadPreviewArticle } from "~/lib/strapi";

export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const secret = params.get("secret") || "";
	const expected = process.env.PREVIEW_SECRET;
	if (
		!expected ||
		Buffer.byteLength(secret) !== Buffer.byteLength(expected) ||
		!timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
	) {
		return new Response("Invalid preview token", { status: 401 });
	}
	const documentId = params.get("documentId") || "";
	const status = params.get("status") === "published" ? "published" : "draft";
	const article = await loadPreviewArticle(documentId, status);
	if (!article) return new Response("Article not found", { status: 404 });
	const mode = await draftMode();
	if (status === "published") {
		mode.disable();
		(await cookies()).delete("blog-preview-document");
	} else {
		mode.enable();
		(await cookies()).set("blog-preview-document", documentId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "none",
			path: "/",
		});
	}
	redirect(`/blog/${article.slug}/`);
}

export async function POST(request: Request) {
	const origin = request.headers.get("origin");
	if (
		origin !== "https://deiondz.com" &&
		origin !== new URL(request.url).origin
	) {
		return new Response("Invalid origin", { status: 403 });
	}
	(await draftMode()).disable();
	(await cookies()).delete("blog-preview-document");
	return new Response(null, {
		status: 303,
		headers: { Location: "/blog/", "Cache-Control": "no-store" },
	});
}
