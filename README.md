# Adaptive Hybrid Coach

Mobile-first frontend prototype for a CrossFit + running coach companion.

## What It Does

- Shows a focused Today command center.
- Builds an editable weekly hybrid training plan from demo data.
- Reviews mocked PushPress screenshot imports before they affect planning.
- Logs simple post-workout feedback.
- Keeps profile, PR, availability, and privacy context visible.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run verify
```

This runs tests, checks for obvious frontend secret leaks, and builds the app.

## GitHub Pages

The app is designed to deploy as a static GitHub Pages site. The workflow in `.github/workflows/deploy-pages.yml` builds the app with `GITHUB_PAGES=true` so Vite uses relative asset paths that work under a project Pages URL.

After pushing to GitHub, enable Pages for GitHub Actions in the repository settings.

## Security Boundary

This prototype must not contain API keys or real private training data. GitHub Pages hosts only the static frontend. Future OCR, AI extraction, account authentication, and synced storage must run through a secure backend.
