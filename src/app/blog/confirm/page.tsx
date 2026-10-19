import type { Metadata } from "next";
import Link from "next/link";
import { BlogSubscriptionAction } from "~/components/blog-subscription";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
	title: "Confirm subscription | Deion D’Souza",
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

export default async function ConfirmPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string | string[] }>;
}) {
	const { token } = await searchParams;
	return (
		<>
			<header className="blog-heading">
				<h1>Confirm your subscription</h1>
			</header>
			<BlogSubscriptionAction
				action="confirm"
				token={typeof token === "string" ? token : ""}
			/>
			<Link className="article-back" href="/blog/">
				Back to the blog
			</Link>
		</>
	);
}
