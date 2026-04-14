export default {
	async fetch(request: Request, env: { ASSETS: { fetch: typeof fetch } }) {
		const url = new URL(request.url);

		// ディレクトリアクセス時に index.html を補完する
		if (url.pathname.endsWith("/")) {
			const rewritten = new URL(`${url.pathname}index.html`, url.origin);
			return env.ASSETS.fetch(new Request(rewritten, request));
		}

		return env.ASSETS.fetch(request);
	},
};
