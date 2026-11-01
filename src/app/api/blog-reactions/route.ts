import { reactionRequest } from "../../../../scripts/reaction-proxy.mjs";

const config = () => ({
	siteUrl: "https://deiondz.com",
	cmsUrl:
		process.env.STRAPI_INTERNAL_URL ||
		process.env.STRAPI_URL ||
		"https://strapi.deiondz.com",
	secret: process.env.BLOG_SUBSCRIPTIONS_INTERNAL_SECRET,
	production: process.env.NODE_ENV === "production",
});

export function GET(request: Request) {
	return reactionRequest(request, config());
}

export function POST(request: Request) {
	return reactionRequest(request, config());
}
