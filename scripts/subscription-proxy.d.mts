export function subscriptionRequest(
	request: Request,
	action: string,
	config: {
		siteUrl: string;
		cmsUrl: string;
		secret?: string;
		production: boolean;
	},
): Promise<Response>;

export function allowedOrigins(
	request: Request,
	config: { siteUrl: string; production: boolean },
): Set<string>;

export function readSmallBody(
	request: Request,
	limit?: number,
): Promise<Record<string, unknown> | Response>;
