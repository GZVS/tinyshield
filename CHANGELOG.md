# Changelog

## 3.1.1 — 10 October 2026 (release candidate)

- Declare split private-window support so blocked extension pages can load in private main frames when the user allows TinyShield there.
- Keep static redirect resources at stable URLs explicitly, with no dynamically generated resource ID.
- Add confirmed local-page checks distinct from the real static-list redirect tests. A page check never marks a redirect as passed.
- Keep tests in the window where they were requested, separate private/normal test state, and export the window context.
- Reconcile shared preferences in each worker when another window changes settings, including pause/resume.
- Document the supplied Edge `ERR_BLOCKED_BY_CLIENT` screenshot and the remaining live-browser verification gate. No single root cause is inferred from that screenshot.

## 3.1.0 — 10 October 2026 (release candidate)

- Verify actual enabled rulesets before saving successful activation; preserve prior preferences on failed changes.
- Show unhealthy initialization instead of an active protection label, and add Repair filters.
- Add Test blocking with direct previews, actual production .test redirects, rendered-page confirmation and privacy-preserving local diagnostic export.
- Use session-only test state; never log ordinary blocked visits.
- Isolate sidebar failures from network filtering and invoke sidebar opening in the user gesture.
- Replace the Chrome-only no-history fallback with local Settings.
- Build separate Chrome and desktop Edge packages from one runtime; add Edge store assets and test/reviewer instructions.
- Keep experimental YouTube rules disabled by default while preserving saved preferences.
- Twelve automated checks pass. Actual Chrome/Edge browser validation remains pending due the authoring runtime crash.

## 3.0.0 — 10 October 2026 (release candidate)

- Replace the coral control surface with the approved minimal soft-blue popup and matching Settings/blocked pages.
- Keep side-panel controls available from Settings.
- Add independent optional adult and gambling domain blocking using bundled Block List Project snapshots.
- Add an explicit GitHub button on each local blocked-site page.
- Add the supplied PayPal donation link to the popup, Settings and side panel.
- Preserve existing TinyShield 2.0.0 preferences when upgrading the same extension; new content categories stay off initially.
- Serialize setting changes, surface errors and restore previous rules after activation failures.
- Turn access-dependent features off if optional website permissions are revoked.
- Fix exception validation and prevent an allowed initiator from exempting an unrelated blocked navigation.
- Preserve upstream source snapshots, hashes and notices; add an MIT license for TinyShield code.
- Supply store artwork, listing text, privacy policy, automated source tests and local browser QA instructions.

Runtime browser verification remains pending in this environment. See `docs/VERIFICATION.md`.
