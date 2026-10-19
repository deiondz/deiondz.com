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
