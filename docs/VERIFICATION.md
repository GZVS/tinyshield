# Verification status — release candidate 3.1.1

## Passed in the authoring environment

- Sixteen Node.js checks cover permission gating, serialized changes, actual-ruleset mismatch detection, rollback, initialization failure/repair, missing/failing sidebar behavior, domain validation, migration and exception behavior. New regressions distinguish page-check confirmation from redirect confirmation, separate private test state, keep test tabs in the requesting window and reconcile changes from another context.
- Test-state checks reject previews, wrong tabs, wrong local pages and missing rendering confirmation. Paused/missing-access/allowed test domains cannot start a test. Exports omit tab IDs and browsing URLs; ordinary blocked visits do not create logs.
- Manifest version/description, split private execution and explicit stable resource URLs, all runtime references, web-accessible redirect targets and dependencies, shipped harmless test-domain presence, DNR IDs/domain syntax and JavaScript parsing.
- The full upstream snapshots retain their hashes and notices. Each category adds one reserved .test address without changing upstream coverage.
- Chrome/Edge package paths, manifests, runtime contents, ZIP CRC integrity and asset dimensions are checked during packaging.

## Browser verification blocked

The user supplied an actual Edge screenshot showing `ERR_BLOCKED_BY_CLIENT` at the local adult blocked-page URL in the previously installed build. This confirms a browser rejection before rendering, but does not identify its cause. The 3.1.1 private-window fix and new diagnostics have not yet been confirmed in actual Edge.

Browser plugin not available. The local Chrome for Testing runtime exited with SIGSEGV before any extension page or service worker could be validated. The previous release also encountered environment launch restrictions and cloud file-URL rejection. No security-policy workaround was attempted.

| Required rendered check | Result here |
| --- | --- |
| Correct browser page URL/title | Not run — runtime could not launch |
| Non-blank blocked page | Not run — requires installed browser |
| No error overlay | Not run |
| Actual console health | Not run |
| Runtime screenshot evidence | None captured |
| Real redirect/button interaction | Not run |
| Actual Microsoft Edge | Not run |

The optional Playwright script has been syntax-checked. It checks both browser manifest variants in bundled Chromium, the real static .test redirects, several full-list hypothetical matches, controls, exceptions, pause and narrow layout. It captures six actual screenshots only after a successful run. It does not automatically certify branded Chrome/Edge or real optional-permission prompts.

Run the built-in Test blocking screen on your computer and follow BLOCKING_TESTS.md, EDGE.md and RELEASE_CHECKS.md. Do not describe this candidate as fully browser-tested or submit it before those live checks pass. Supplied UI previews are print-rendered examples and are not runtime proof. The original blank-page root cause remains unconfirmed; FIX_NOTES.md records the code gaps actually found and repaired.
