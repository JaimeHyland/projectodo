This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Main-page CMS

The fixed [content catalogue](backend/core/cms_catalogue.json) records all 99
editable fields, their stable identifiers, page/section, JSON paths, source files,
initial English/German/Spanish values and actual displayed image paths.
It is also the backend allowlist. Array positions are fixed paragraph slots;
home cards are matched by their existing IDs because locale ordering differs.
This editor changes values, not page structure, links or application behaviour.

| Page | Fields | Content |
| --- | ---: | --- |
| Home | 12 | Title, intro, claim, image/alt, visible lessons/bands cards and their link text |
| Lessons | 14 | Title, headline, intro, benefits, venue heading and contact block |
| Bands | 1 | Public listing title |
| Production | 6 | Title, image/alt, paragraphs and highlight |
| Technical | 5 | Title, image/alt and paragraphs |
| Contact | 10 | Title, business/person, address and contact values |
| Privacy | 31 | Title, date, introduction, headings, paragraphs, lists and link text |
| Legal notice | 18 | Title, headings, address/legal text and link text |
| Lesson pages / Band pages | 1 each | Existing public placeholder titles |

Header/footer/navigation, contact-field labels, course controls, loading/error
messages, authentication, news, press and guestbook remain in JSON. Existing
band/course data and editors are unchanged. Hidden production/technical home
cards and unused placeholder descriptions are not imported. Link targets remain
in code/JSON. Text is rendered through React, without HTML interpretation.

The actual initial images are `/guitarist.jpg`, `/produktion.jpg` and
`/technik.jpg`. Production/technical JSON contains older `/uploads/images/...`
paths; the catalogue preserves those source values for reference but import and
fallback use the paths the frontend actually displayed.

### Initialise an intended database

From the repository root, first inspect the active connection without exposing
credentials. Verify the reported database before running migration/import:

```powershell
backend/.venv/Scripts/python.exe backend/manage.py shell -c "from django.conf import settings; print({k: settings.DATABASES['default'].get(k) for k in ('ENGINE', 'HOST', 'PORT', 'NAME')})"
backend/.venv/Scripts/python.exe backend/manage.py migrate core
backend/.venv/Scripts/python.exe backend/manage.py init_page_content --messages-dir src/messages
```

`core.0001_pagecontent` creates `PageContent` with a unique identifier/locale pair.
The atomic importer reads only approved fields from the current message files,
uses actual displayed paths for images, and creates missing records only.
Re-running it preserves every existing edit, including intentionally blank text.
An unreadable/missing source or invalid field rolls back the whole import.
The command defaults to this checkout's `src/messages`; backend-only deployment
packages must include those source resources or supply `--messages-dir` explicitly.
Database connection settings are unchanged. Existing deployment release scripts
already run Django migrations; review the target before deploying.

### Edit content

Sign in as an existing superuser or a member of `webmaster`, open
`/[locale]/admin-dashboard/`, and expand **Website content** (translated in DE/ES).
Select a page, section/field and language, edit the text, and save. Drafts survive
switching fields/languages while the editor is open; save before closing it or
navigating away. Missing translations are identified separately from saved blank
values. Saving blank text intentionally displays no text. Missing records use the
same-language JSON value; backend failures also use existing JSON content.

Image fields show the current image (or initial fallback). Choosing an upload
validates and saves it immediately for the selected language. Image URLs/storage
keys cannot be submitted as arbitrary text. Uploads accept decoded JPEG, PNG and
WebP up to 5 MiB and 20 million pixels. Filenames/MIME types are not trusted.
Images are oriented and re-encoded to JPEG with metadata/animation removed and a
random filename. The database reference changes only after storage succeeds.
Failures retain the current reference; replaced files are retained because other
records may still reference them. No automatic deletion/cleanup job is installed.

Administrative list, text update and upload endpoints under `/api/content/admin/`
enforce the existing superuser/webmaster policy. Session authentication and CSRF
remain required. Public `/api/content/public/<page>/<locale>/` exposes only
catalogued public fields. Public pages fetch once per page/locale per server render,
with a 3-second timeout, and preserve stored blanks. Image dimensions/layout remain
in the existing components. Uploaded images bypass Next's image optimizer and use
the public storage URL directly.

### Image storage and deployment

With `DJANGO_DEBUG=True`, uploads use ignored `backend/cms-media/`, served by
Django at `/cms-media/`. Next rewrites that path to the configured backend.
Production (`DJANGO_DEBUG=False`) uses the existing S3 credentials, bucket and
region through the separate `cms` storage alias and `cms-images/` prefix. It does
not use the Heroku filesystem or write into collected static files.

Read-only AWS inspection on 15 October 2026 confirmed the existing bucket's region
is `eu-north-1`, ownership is `BucketOwnerEnforced`, and its policy permits public
`s3:GetObject` on all bucket objects, including `cms-images/`. Public-access-block
flags were all false. No bucket policy, IAM policy or object was changed.
IAM policy simulation returned `AccessDenied`: production write permissions have
**not** been verified, and no production upload test was performed.

Before enabling production use, have the AWS administrator verify backend
`s3:PutObject` and `s3:GetObject` permission restricted to
`arn:aws:s3:::<existing-bucket>/cms-images/*`, plus `s3:DeleteObject` on that prefix
for cleaning a new upload after a failed database save. Public users need read
access only; do not grant public writes. Existing static-file permissions must
remain intact. No object ACLs are sent, matching bucket-owner-enforced ownership.
Existing `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`
and `AWS_S3_REGION_NAME` settings are reused. Confirm the bucket region matches
the configured region. Browser uploads go through the Django API, so direct
browser-to-S3 upload credentials/CORS permissions are unnecessary.

Frontend deployments need `API_BASE_URL` (server) and
`NEXT_PUBLIC_API_BASE_URL` (existing browser rewrites) pointing at the intended
backend. Include the catalogue JSON in the frontend build as well as backend
deployment. No new runtime dependency is introduced.

Implementation files: `backend/core/models.py`, `cms.py`, `cms_catalogue.json`,
`views.py`, `urls.py`, `management/commands/init_page_content.py`,
`migrations/0001_pagecontent.py` and `tests.py`; backend project settings/routes;
`src/lib/page-content.ts` and `page-content-values.ts`; the ten catalogued public
`page.tsx` files; dashboard `page.tsx` and `PageContentEditor.tsx`; the three
admin-dashboard message files; `next.config.ts` and `.gitignore`; and
`playwright.cms.config.ts`, `tests/cms.spec.ts`, `tests/fixtures/cms-backend.mjs`.

### Focused checks

```powershell
backend/.venv/Scripts/python.exe backend/manage.py check
backend/.venv/Scripts/python.exe backend/manage.py makemigrations core --check --dry-run
backend/.venv/Scripts/python.exe backend/manage.py test core
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/@playwright/test/cli.js test --config playwright.cms.config.ts
```

Django tests create a separate test database using the active environment's test
target. Verify that target first; never reuse/reset an existing database with
unknown contents. Browser tests launch an isolated mock backend on port 8125 and
Next on port 3102; they do not contact a real application database or S3.

Implementation validation: 13 Django tests passed; nine browser scenarios passed
across focused runs, including all ten public page integrations, locale/blank/
fallback handling, editor saves, upload feedback and frontend access denial.
Django system checks, migration consistency, TypeScript, ESLint on changed
frontend files, Flake8 on CMS Python files and `git diff --check` passed.
The editor screenshot was visually reviewed. Application-database migrations and
initial import were not run; tests alone migrated/seeded a newly created test
database, which the Django runner removed. Deployment and production S3 writes
remain unverified.
