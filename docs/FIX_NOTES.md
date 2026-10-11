# Blocked-page investigation — 3.1.1

The user's Edge screenshot shows `ERR_BLOCKED_BY_CLIENT` at the extension's `blocked-adult.html` address. Edge rejects the replacement page before its HTML renders. This establishes the failed stage, but not whether the cause is private-window mode, a stale/disabled copy, another blocker, browser access rules or policy. The screenshot does not identify the installed extension version or window mode. The supplied 3.0.0 archive already had both blocked HTML files and their web-accessible declarations.

The 3.1.1 manifest fixes a confirmed private-window compatibility gap: default spanning mode cannot load extension pages in private main frames. It now declares `incognito: "split"`; browser Details must still explicitly allow the extension in private windows. The HTTP/HTTPS web-accessible resource scope remains narrow and static `extensionPath` resources explicitly use stable URLs. This stable-URL flag makes the configuration explicit; its previous omission is not identified as the screenshot's cause.

New local-page check buttons launch only a fixed packaged page, record the requesting window and require a render confirmation. Their results cannot satisfy the separate website-redirect test. Test state is separated for private and normal workers, and diagnostics export the window context. Shared local preferences trigger reconciliation in each worker so a pause or setting change made in another window is applied.

Confirmed code gaps repaired:

- Activation returned the intended rule IDs without reading the browser's actual active rules. The new code verifies them before saving a successful status, with rollback on failure.
- Initialization failures could leave the popup describing protection as on. Unhealthy initialization now shows Protection needs attention and can be repaired explicitly.
- Sidebar configuration could fail initialization even after network rules were working. Sidebar absence or failure is now isolated from filtering.
- Go back used a hardcoded Chrome new-tab URL. It now uses history or local Settings in either browser.
- The former automated redirect test inserted synthetic dynamic rules. The new test exercises harmless domains embedded in the actual shipped static category lists, plus a render confirmation from the registered test tab.

The diagnostic flow distinguishes local page rendering, active permissions, actual static rules and confirmed redirect rendering. It does not assume the reported failure's root cause. If a local test still fails, its diagnostic export and harmless test-tab error provide the evidence needed for the next fix. Actual browser QA remains the release gate.

Primary references: [Chrome incognito manifest behavior](https://developer.chrome.com/docs/extensions/reference/manifest/incognito), [web-accessible resource navigation](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources). Desktop Edge must still be checked directly.
