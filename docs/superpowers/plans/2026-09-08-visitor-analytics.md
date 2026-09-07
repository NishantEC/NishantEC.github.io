# Free visitor analytics implementation

**Current design:** React/Vite stays on Vercel. GoatCounter provides free hosted
analytics and a public total without API credentials. The footer is labelled
page visits since tracking began because the aggregate is not a count of
unique people across the site. GoatCounter may cache totals for four hours.

- [x] Replace the paid Umami API dependency with GoatCounter public TOTAL JSON.
- [x] Add explicit React Router page tracking with duplicate suppression and
  queued initial visits. Exclude localhost, prerendering, and preview domains.
- [x] Preserve the footer in all layouts and hide unavailable statistics.
- [x] Verify ten API/tracker tests, TypeScript, production build, and changed-file lint.
- [x] Complete signup, enable the public counter, set the confirmed code on
  Vercel, deploy, and verify live tracking and totals.

Signup, public counter activation, configuration, and production deployment
are complete. Live API and browser tracking are verified. The user still needs
to click GoatCounter's email-verification link. See docs/analytics.md for release
details and the local prebuilt deployment workflow.
