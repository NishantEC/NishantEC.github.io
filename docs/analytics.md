# Free analytics and public counter

The site uses GoatCounter's donation-supported hosted service. Its public
counter endpoint requires no API key or paid plan. Hosting remains on Vercel.

## Account setup

1. Create a free account at https://www.goatcounter.com/signup. The prepared
   signup uses account name `nishantg`, domain `https://www.nishantg.com`, and the
   public contact email from `src/data/profile.ts`. The account is created at
   `https://nishantg.goatcounter.com/`. Email verification is still pending.
2. Enable **Allow adding visitor counts on your website** in GoatCounter's site
   settings. This publishes aggregate counts; the rest of the dashboard can
   remain private.
3. Set `VITE_GOATCOUNTER_CODE` to the confirmed account name in Vercel's
   **portfolio** project, for **Production**. Also set it in the ignored
   `.env.local` for local stats testing. No secret credential is needed.
4. Deploy after saving the variable. It is embedded by Vite at build time and
   read by the Vercel function at runtime.
5. Check homepage and skill paths in GoatCounter, then `/api/stats` for
   `{ "pageVisits": <number>, "period": "all-time", "updatedAt": <timestamp> }`.
   The footer stays hidden until a valid response is available.

## What the number means

The compact counter shows **page visits across the site since tracking began**,
with the scope explained in its tooltip. Zero and unavailable counts are hidden.
On the homepage it sits in the existing social/status footer, without a separate
border or explanatory sentence. It does
not claim distinct people or a rolling 30-day total. GoatCounter deduplicates
repeat visits to the same page within its session window; someone visiting
multiple pages can contribute multiple visits. Collection starts at setup.

The public endpoint `/counter/TOTAL.json` can cache totals for up to **four
hours**. Our `/api/stats` function adds at most five minutes of caching. This is
an occasional aggregate update, not a live counter.

## Implementation

- `src/utils/analytics.ts` loads `https://gc.zgo.at/count.js` only in production
  builds on `www.nishantg.com` and `nishantg.com`. GoatCounter's automatic
  onload capture is disabled. React Router's pathname effect owns capture.
- Visits queue until the script loads. Consecutive duplicate paths are ignored,
  including React Strict Mode effects. Navigating away and returning counts
  again at the tracker level; GoatCounter performs its own session deduplication.
- `VisitorStatsProvider` fetches the shared total once per app load. The footer
  renders on homepage/404, standalone documents, and active split panes.
- `api/stats.js` accepts GET, validates the configured account code, and fetches
  the documented public JSON endpoint. It accepts formatted count strings such
  as `1,240`, rejects malformed data, returns only the count and metadata, and
  never lets requests control the upstream host or path. Upstream timeout: 5s.
- Missing configuration returns 503; unavailable/disabled counters return 502.
  Errors are not cached and the frontend hides unavailable totals.
- No Umami script, API key, SDK, paid API, database, or separate server is used.

## Verification

```sh
node --test tests/*.test.mjs
yarn build
yarn lint
```

Ten tests cover the API contract, zero, malformed data, upstream failure,
caching/expiry, local and preview exclusions, duplicate route capture, queued
pageviews, route revisits, and a blocked tracker. Local prerendering uses
`PUPPETEER_EXECUTABLE_PATH` pointing to installed Google Chrome when the expected
Puppeteer browser download is unavailable. The existing bundle-size warning
and unrelated repository lint issues remain outside this change.

`yarn dev` serves only Vite. Use `vercel dev` to run `/api/stats` locally; it
needs the account code but no API key. Local pageview tracking stays disabled.

An existing `PanelRouteSync` behavior restores the active pane's URL when
browser Back tries returning to `/` with a pane open. This analytics change
preserves that navigation behavior.

Account creation and public-counter activation are complete. The production
Vercel environment and local environment both contain `VITE_GOATCOUNTER_CODE=nishantg`.
Production deployment is live at https://www.nishantg.com/. The deployed
`/api/stats` returns HTTP 200 with valid aggregate data, and the footer renders
on the skill route. GoatCounter recorded one homepage visit and one skill-route
visit during browser verification. Public totals may remain cached at zero for
up to four hours. Email verification is the remaining account step.

The first analytics deployment used a local prebuilt release. The subsequent
DialKit 2 upgrade fixes cloud prerendering by using fresh pages in Chromium's
default context and clearing storage before each route. Yarn 4.18.0 is pinned
with `packageManager` and a checked-in `.cjs` executable through `yarnPath`.
Vercel's experimental Corepack environment variable must remain unset: its
cached `.js` executable inherits this project's ES module setting and fails.
Never present fixture counts as production traffic.

References: https://www.goatcounter.com/ (free hosted usage),
https://www.goatcounter.com/help/visitor-counter (public TOTAL endpoint),
https://www.goatcounter.com/help/spa (manual route capture),
https://www.goatcounter.com/help/sessions (visit definition).
