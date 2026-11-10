import { ensureSchema, getAuth } from "~/lib/auth";

async function handler(request: Request) {
	await ensureSchema();
	return getAuth().handler(request);
}

export { handler as GET, handler as POST };
