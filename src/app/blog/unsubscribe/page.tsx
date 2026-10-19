import type { Metadata } from "next";
import Link from "next/link";
import { BlogSubscriptionAction } from "~/components/blog-subscription";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
	title: "Unsubscribe | Deion D’Souza",
	robots: { index: false, follow: false },
	referrer: "no-referrer",
};

export default async function UnsubscribePage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string | string[] }>;
}) {
	const { token } = await searchParams;
	return (
		<>
			<header className="blog-heading">
				<h1>Unsubscribe</h1>
			</header>
			<BlogSubscriptionAction
				action="unsubscribe"
				token={typeof token === "string" ? token : ""}
			/>
			<Link className="article-back" href="/blog/">
				Back to the blog
			</Link>
		</>
	);
}
