# Deion's portfolio

Static Next.js portfolio at https://deiondz.com, served by Nginx on the SSH host `deion`.

## Blog and Strapi

The blog lives at `/blog/`; the homepage has no blog sections or featured posts.
It uses the existing Article and Category content types in https://strapi.deiondz.com.
Only published articles are exported. Drafts remain in Strapi.

In Strapi's Content Manager, create an Article with a title, a unique lowercase
hyphenated slug, and rich-text content. Excerpts, cover images, and categories
are optional. Save the entry, then publish it. Images use Strapi's media library;
set their alternative text there. The frontend supports rich text, lists, links,
quotes, code, and inline images.

GitHub checks for published content changes every 15 minutes, at minutes 7, 22,
37, and 52. Unchanged content skips the build and deployment. Scheduler delays
are possible. Publishing, unpublishing, deleting, or editing published content
is reflected by the next successful rebuild. For an immediate refresh, run the
Portfolio CI/CD workflow manually on `main` from GitHub's Actions tab.

The blog includes search, category filters, pagination, dates, reading time,
article sharing, metadata, JSON-LD, `/blog/feed.xml`, and `/sitemap.xml`.

For local development, copy `.env.example` to `.env.local` and set the dedicated
read token. This clone is already configured. `npm run dev` and `npm run build`
sync Strapi first. After editing content while the dev server is running, use
`npm run blog:sync` and refresh the page. Generated content in `.blog-cache/`
and `public/blog-version.json` is ignored by Git; no token is included in browser
bundles or artifacts. A CMS failure stops the build and preserves the live release.
Pull requests from forks use an empty offline snapshot without CMS credentials.

Repository Actions secret: `STRAPI_READ_TOKEN` (Article/Category read permissions).
Repository variable: `STRAPI_URL`. These are already configured. Tests include
published-only handling, safe links, pagination, and unchanged-content detection:
`node --test scripts/blog.test.mjs`.

## Local development

Requires Node.js 24 and Bun 1.4.2.

```sh
bun install --frozen-lockfile
npm run setup:hooks
npm run dev
```

Open http://localhost:3000. Saved changes appear locally; commit after reviewing them.
For a production build preview, stop the dev server and run `npm run preview`.
The preview serves the static `out/` export on http://127.0.0.1:3000.

## Publish

```sh
git add src/app/page.tsx
git commit -m "Update portfolio copy"
```

The repository's `post-commit` hook automatically pushes the current branch to GitHub.
Run `npm run setup:hooks` once in each new clone to enable it. A failed push leaves
the commit saved locally; resolve the error and run `git push` again. Detached HEAD
commits stay local. To disable automatic push in this clone:
`git config --local --unset core.hooksPath`.

Every pushed branch and pull request to `main` runs linting, a production build,
and TypeScript checks. Successful pushes to `main` deploy automatically.
Feature branches deploy only after merging into `main`.

Follow runs at https://github.com/deiondz/deiondz.com/actions.
You can re-run a failed job or dispatch the workflow on `main` to redeploy.
Older commits are skipped when they no longer match GitHub's `main` branch.

## Deployment

GitHub builds the site and uploads the exact tested artifact over SSH.
The server stores it under `/var/www/deiondz.com/releases/<sha>-<run>-<attempt>`
and atomically switches the `current` symlink. Nginx continues serving requests
without a reload. The receiver checks the origin homepage, blog, RSS, JavaScript, CSS, and
release marker; a failed origin health check restores the previous release.
GitHub then verifies https://deiondz.com/deployment.json against the deployed commit.
A public verification failure marks the run failed; origin rollback is handled
by the receiver, and earlier releases remain available for manual recovery.

The `portfolio-deploy` account has no sudo permissions. Its SSH key only runs
the restricted artifact receiver and cannot open a shell or forward ports.
GitHub verifies the pinned server host key. Deployment credentials are stored
as repository Actions secrets, never in the source tree.

Configured repository secrets:

- `PORTFOLIO_DEPLOY_KEY`: dedicated SSH private key.
- `PORTFOLIO_KNOWN_HOSTS`: verified server Ed25519 host key.

Configured repository variables:

- `PORTFOLIO_HOST`, `PORTFOLIO_PORT`, `PORTFOLIO_USER`.

The receiver source is `scripts/deploy/receive.py`; its root-owned installed copy
is `/usr/local/lib/deiondz-deploy/receive.py` on `deion`. Receiver changes require
an administrator to reinstall that file. `scripts/deploy/bootstrap.sh` installs
the receiver and dedicated public key when run as root with those two file paths.
Only deploy jobs on `main` receive deployment secrets; build jobs use the CMS read token.
Production jobs are serialized and finish before the next deployment starts.

To roll back, use your administrator SSH access and atomically activate a retained release:

```sh
ssh deion
cd /var/www/deiondz.com
sudo -u portfolio-deploy flock .deploy.lock bash
ls -1 releases
ln -s /var/www/deiondz.com/releases/<release-name> current.rollback
mv -Tf current.rollback current
exit
curl -fsS https://deiondz.com/
```

The legacy initial releases predate `deployment.json`. Retained releases consume
disk space; review them before removing any, and keep the current and previous good release.

## Checks

```sh
npm run lint
npm run build
npm run typecheck
```

On Linux, `python3 scripts/deploy/test_receive.py` tests the receiver's artifact
validation, restricted command handling, and rollback in a temporary directory.

`npm run check` also checks formatting across the repository. Existing formatting
differences in supplied assets and configuration are separate from the CI source lint gate.
