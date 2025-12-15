<!-- .github/copilot-instructions.md -->
# Copilot / AI coding agent instructions — admin-responsibility-prototype

Short, actionable notes to help an AI contributor be productive in this repository.

1. Project type & run commands
- This is a GOV.UK Prototype Kit project. Use the scripts in `package.json`:
  - `npm run dev` — run local dev server (preferred while editing)
  - `npm run serve` — serve a built prototype
  - `npm run start` — start production-like server

2. Big picture architecture
- Router entry: `app/routes.js` builds the index and mounts versioned routers.
- Versioned route modules live under `app/routes/*.js` (example: `app/routes/baseline.js`).
- Views: Nunjucks templates in `app/views/<version>/…` (e.g. `app/views/baseline/...`).
- Data: local JSON fixtures under `app/data/` (example: `app/data/baseline_billing.json`).
- Session usage: persistent UI state is stored on `req.session.data` (common pattern across routes).

3. Common patterns & conventions (do not change lightly)
- Versioned UI: each visual version is a folder in `app/views/` (e.g. `baseline`). Routes build view paths by concatenating `version + '/path'`.
- Middleware: `app/routes.js` sets `res.locals.version` by parsing the URL; valid versions are declared there.
- Route files use `govuk-prototype-kit` router helpers: `const router = govukPrototypeKit.requests.setupRouter('/baseline');`.
- Data self-healing: many routes load JSON into `req.session.data` if the session copy is missing — e.g. `baseline` loads `app/data/baseline_billing.json`.
- Session keys used by billing flow: `baseline_billing`, `selected`, `current_action`, `confirmBillingInstructions`.

4. UI & templates
- Templates are Nunjucks - look for `_includes`, `_components`, and page templates in `app/views/baseline/`.
- Partial examples: `app/views/baseline/_components/_billing-progress-banner.njk` demonstrates component-only templates.
- To add a page: create a route in `app/routes/<version>.js` and add a `.njk` file in `app/views/<version>/...`.

5. Data flows & examples
- Pagination: query params `page` and `limit` are used; routes slice arrays and create a GDS pagination object.
- Filter counts: the billing route computes `statusCounts` and `instructionCounts` from the `baseline_billing` array.
- Update flow: POST to `/billing/confirm-billing-instructions` sets session keys and renders a confirm page; final POST to `/confirm-update` mutates `req.session.data['baseline_billing']`.

6. Where to make changes
- Add new version: add a directory `app/views/<newversion>` and a router `app/routes/<newversion>.js`, then add the folder name to the `validVersions` list in `app/routes.js`.
- Add new API-like logic: place it in `app/routes/*.js` and prefer using `req.session.data` for demo persistence.

7. Dependencies & integrations
- Uses `govuk-prototype-kit`, `govuk-frontend`, and `@govuk-prototype-kit/*` packages. Templates follow GOV.UK Design System patterns.
- `notifications-node-client` is included for sending notifications (search usage before modifying).

8. Developer notes / gotchas
- There is no automated test suite in the repo — manual testing via `npm run dev` is expected.
- Logging is present but often commented-out; useful `console.log` points are in route middleware.
- Be careful when editing session keys — many templates assume certain keys exist (see `app/routes/baseline.js`).

9. Helpful file pointers (examples)
- Router entry: `app/routes.js`
- Baseline routes: `app/routes/baseline.js`
- Views: `app/views/baseline/` and `app/views/layouts/`
- Data fixture: `app/data/baseline_billing.json`
- Frontend JS/CSS: `app/assets/javascripts/` and `app/assets/sass/`

If any section is unclear or you want me to expand examples (e.g., a quick recipe to add a new page + route), tell me which area and I'll update this file.
