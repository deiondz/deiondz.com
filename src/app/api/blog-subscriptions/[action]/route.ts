import { subscriptionRequest } from "../../../../../scripts/subscription-proxy.mjs";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ action: string }> },
) {
	return subscriptionRequest(request, (await params).action, {
		siteUrl: "https://deiondz.com",
		cmsUrl:
			process.env.STRAPI_INTERNAL_URL ||
			process.env.STRAPI_URL ||
			"https://strapi.deiondz.com",
		secret: process.env.BLOG_SUBSCRIPTIONS_INTERNAL_SECRET,
		production: process.env.NODE_ENV === "production",
	});
}
