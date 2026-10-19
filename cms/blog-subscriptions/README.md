# Blog subscriptions

This extension runs inside the existing Strapi 5.57.0 application. Strapi owns
subscriber records and the persistent publication/delivery queue in its existing
SQLite database. Next.js only renders forms and proxies subscription actions.
The homepage and RSS feed are unchanged.

## Install and configure

1. Back up the CMS with `/opt/strapi/scripts/backup.py`, then stop `strapi.service`.
2. Copy this directory to the server and run its installer:

   ```sh
   /opt/strapi-runtime/bin/node /path/to/blog-subscriptions/install.mjs /opt/strapi
   cd /opt/strapi/blog-subscriptions
   npm ci --ignore-scripts --no-audit --no-fund
   ```

3. Add the variables in `.env.example` to `/opt/strapi/.env`. Generate separate
   cryptographically random secrets of at least 32 characters. Keep the file
   root-owned, group `strapi`, mode `640`. Leave sending disabled initially.
4. Put the same `BLOG_SUBSCRIPTIONS_INTERNAL_SECRET` in root-owned
   `/etc/portfolio.env` and set `STRAPI_INTERNAL_URL=http://127.0.0.1:1337` there.
   Keep the existing read token separate and unchanged.
5. Rebuild Strapi using its Node runtime and existing package manager. Restart
   `strapi.service`. Deploy Next.js through the existing portfolio workflow.
6. Install `scripts/deploy/cloudflare-real-ip.conf` as
   `/etc/nginx/snippets/deiondz-real-ip.conf` and `scripts/deploy/proxy.conf`
   in its existing Nginx snippet location. Run `nginx -t` and reload Nginx.
   These snippets accept visitor-IP headers only from official Cloudflare
   proxy ranges, then overwrite `X-Real-IP` for signup rate limiting.
7. Verify the `deiondz.com` sending domain, DKIM/SPF, sender, account approval,
   credit balance, and sending limits in ZeptoMail. Use an owned test address
   for the confirmation and new-post excerpt inbox checks.
8. In the ZeptoMail agent, configure the webhook at
   `https://strapi.deiondz.com/api/blog-subscriptions/webhook` for Delivered,
   Hard Bounce, Soft Bounce, and Feedback Loop. Set its Authorization header
   to `Bearer <BLOG_SUBSCRIPTIONS_WEBHOOK_SECRET>`. This is a separate secret
   from the Send API key. The endpoint fails closed without it.
9. After testing, set `BLOG_SUBSCRIPTIONS_ENABLED=true` and restart Strapi.
   This flag controls both accepting signups and sending the queue. It never
   disables unsubscribe or delivery-webhook processing.

The installer preserves original `src/index.js` hooks in
`src/index.before-blog-subscriptions.cjs` and delegates to them. It does not
replace existing article schemas or CMS settings. It is safe to rerun for
extension updates. Keep the installed source and this repository in sync.

ZeptoMail explicitly excludes newsletters in its published usage guidance. The
owner selected it after reviewing this restriction; rejection or suspension is
a known launch risk. See
[Zoho's service guidance](https://www.zoho.com/zeptomail/help/introduction.html).

## Behavior and operations

- No CRUD routes are generated for the four new collection types. Only the
  dedicated authenticated subscription endpoints exist. Collection types are
  available to authorized CMS administrators; grant other admin roles only the
  access they need.
- Signup accepts email only. Addresses are normalized and unique. Signup is
  limited to five requests per IP per hour, using hashed rate-limit buckets;
  pending addresses have a ten-minute resend cooldown.
- Confirmation tokens are signed, purpose-bound, versioned, stored as hashes,
  and valid for 24 hours. Visiting a link does not change state; confirmation
  requires a POST. Resubscribing requires a new confirmation and invalidates
  earlier unsubscribe links.
- On first installation, existing published documents are seeded as handled.
  New first publications transactionally create an immutable content snapshot
  and jobs for subscribers active at publication. Edits and repeated publish
  events never resend. Unpublish/delete cancel unsent jobs. Resubscribing does
  not replay old posts.
- One worker checks jobs every 15 seconds and wakes after publication. It sends
  at most one message per second, in runs of up to 25 jobs. Delivery begins
  after the public article responds successfully; the existing blog cache may
  take 60 seconds to update. Large lists take longer to finish.
- Jobs are `pending`, `sending`, `accepted`, `delivered`, `failed`, `uncertain`,
  or `cancelled`. `accepted` is API acceptance; `delivered` means a provider
  webhook confirmed receiving-server acceptance, not inbox placement.
- Explicit HTTP 429 rejections retry with exponential backoff, up to six send
  attempts. Other explicit client rejections fail. Timeouts, server errors,
  and worker interruptions become `uncertain`. The SDK has a ten-second
  response deadline; an underlying request might still complete afterward.
- `client_reference` matches the delivery key for tracing. **It is not a
  provider idempotency guarantee.** Reconcile uncertain jobs against ZeptoMail
  logs before changing their status. If accepted, record the reference and set
  `accepted`; only requeue as `pending` after verifying no send was accepted.
- Authenticated hard-bounce and complaint events suppress the address, cancel
  pending jobs, and mark the affected job failed. Repeated or late delivery
  events cannot reactivate a subscriber or undo a failure.
- Post emails include the title, excerpt, and a link to read the full post.
  Without an excerpt or description, the opening text is shortened to 180
  characters. Article bodies, images, and embeds stay on the website. Emails
  use escaped text, inline styles, and a plain-text alternative. Open and click
  tracking are disabled.

## Tests

```sh
npm ci --prefix cms/blog-subscriptions --ignore-scripts
npm run test:subscriptions
```

For full integration tests, point `STRAPI_TEST_SOURCE` at an installed Strapi
5.57.0 application, then run:

```sh
STRAPI_TEST_SOURCE=/opt/strapi node --test --test-concurrency=1 cms/blog-subscriptions/test/service.test.mjs
```

The fixture creates a new application and SQLite database in a temporary
directory, reuses the installed Strapi dependencies and article/category schema,
and supplies test-only secrets. It never loads production `.env`, data, media,
or subscribers. Email transport is replaced at its external boundary. Tests
exercise real transactions, publication middleware, and HTTP route protection.

## Rollback

Set sending to false before reverting code and stop Strapi while changing its
source. Restore the backed-up original hooks and source; keep the additive
subscriber/publication/delivery schemas installed so Strapi does not remove
their tables during schema synchronization. Preserve the current database and
take another backup rather than restoring an older database over new signups.
Roll back the portfolio using its existing retained-release procedure.

Do not remove the extension's schemas or signing secret during an application
rollback. Existing unsubscribe links need both the subscriber data and secret.
