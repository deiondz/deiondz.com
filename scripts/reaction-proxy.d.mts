export const REACTIONS: readonly ["like", "love", "fire", "idea", "party"];

export function reactionRequest(
	request: Request,
	config: {
		siteUrl: string;
		cmsUrl: string;
		secret?: string;
		production: boolean;
	},
): Promise<Response>;
