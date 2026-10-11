# Required local checks before store submission

1. Load the actual `extension/` directory or extracted runtime package in Chrome/Edge Developer mode. Ensure there are no manifest, indexing or service-worker errors in chrome://extensions or edge://extensions. Confirm version 3.1.1. Category list activation must succeed with the full shipped files; static rule-count checks alone do not prove browser indexing.
2. Confirm adult/gambling filters initially show off for a new install. Click one and deny the website-access prompt. It must stay off and show a helpful message. Then grant access and verify activation.
3. Enable both categories and inspect Settings, the popup and side panel. Toggle each independently. Pause all protection and resume. Close/reopen the popup and restart Chrome to confirm persistence.
4. Run `npm run test:browser` for full list indexing, hypothetical matches, reserved test-domain redirects and 1280×800 screenshots. Do not use the test-only manifest as the store upload package.
5. Use an explicit allowed test domain; confirm exceptions take effect and removal restores filtering. Check that a link from an allowed page to another category-listed domain is still filtered.
6. Revoke website access in Chrome's extension settings. Adult, gambling and cleanup controls must turn off. Basic ad/tracker blocking should remain available.
7. Enable page cleanup, reload a safe test page and verify its selectors. Test an exception. Disable cleanup and confirm the helper leaves the page inactive.
8. Open the PayPal and GitHub buttons. Verify the destinations and absence of a blocked URL in the link. Donations must stay optional.
9. Check blocked pages' category labels and Go back behavior, including when the page was opened with no previous history.
10. Test at least Chrome and Microsoft Edge on Windows, the 360px popup and the narrow side panel. Inspect text wrapping, keyboard focus, toggle names and donation controls. Sidebar absence/failure must not stop filtering or the popup.
11. Upgrade a copy of version 2.0.0 under the same extension ID; verify existing preferences and allowed websites migrate and new categories remain off.
12. Test YouTube separately if you choose to enable its experimental filter. Keep best-effort wording and do not claim universal ad removal.
13. Host `privacy.md` at an accessible public URL, copy that exact URL into the store, and keep its disclosures aligned with the submitted version.
14. Run both production .test redirects through Test blocking. Each page must render and each session result must say Passed. Preview page must not create a pass. Test pause, a tinyshield.test exception, and Repair filters. See BLOCKING_TESTS.md and EDGE.md.
15. Upload real verified captures to the store after browser QA. The included UI previews have not verified an installed Chrome or Edge extension.
16. Confirm both local-page checks pass independently, without enabling category filters, and cannot mark a website redirect as passed. Enable private access in browser Details; repeat page and redirect checks there. Confirm test tabs stay in their originating window and preferences (including pause) apply across normal and private windows.
