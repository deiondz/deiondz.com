# Runtime deployment

The blog routes, RSS and sitemap render on the Next.js server. Published Strapi
articles share a 60-second in-memory cache; drafts are excluded. Fetch failures
return an error rather than retaining unpublished content indefinitely.

GitHub builds a standalone Next.js artifact, excludes environment files, runs
CMS normalization tests, SSR publishing/unpublishing tests and receiver rollback
tests, then uploads through the restricted SSH deployment receiver. There are no
scheduled content builds. The homepage remains prerendered.

Production uses `portfolio.service` on localhost port 3001 behind Nginx. The
existing Node runtime is `/opt/strapi-runtime/bin/node`. The root-owned mode-600
`/etc/portfolio.env` supplies `STRAPI_URL` and the existing read-only
`STRAPI_READ_TOKEN`; credentials never enter the browser or build artifact.

Install `portfolio.service` under `/etc/systemd/system/`, `proxy.conf` as
`/etc/nginx/snippets/deiondz-proxy.conf`, and `xml-locations.conf` as
`/etc/nginx/snippets/deiondz-xml.conf`. The canonical HTTPS server proxies
`location /` through the proxy snippet and includes the XML locations snippet.
The SSH receiver is installed at `/usr/local/lib/deiondz-deploy/receive.py`.
Its user may restart or stop only `portfolio.service` through sudo. Runtime
artifacts activate atomically; a failed health check restores and restarts the
previous runtime release.

Local preview: `npm run dev`. Local production validation: `npm run build`,
`node --test scripts/ssr.test.mjs`, then `npm run typecheck`. Production start
uses `server.js` from the standalone artifact, with `public` and `.next/static`
copied into it as shown in the workflow.
