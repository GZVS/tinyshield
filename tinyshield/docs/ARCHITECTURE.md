# Architecture

The service worker loads sanitized preferences and configures packaged static DNR rulesets. Dynamic allow rules represent explicit website exceptions. Settings requests are serialized; changes persist only after browser APIs apply them and getEnabledRulesets confirms the actual active IDs. Reconciliation is idempotent and avoids rewriting unchanged rules. An activation failure attempts to restore previous settings and returns a visible error. Initialization errors produce a visible unhealthy status, and an explicit repair request reapplies saved preferences.

The popup and side panel share production markup and `controls.js`; Settings uses the same controller and settings module. Category switches request optional HTTP/HTTPS origins directly from the user gesture. Permission revocation triggers reconciliation: adult, gambling and cosmetic preferences are disabled and their rules/scripts are removed.

Adult/gambling rules group 1,000 validated domains per rule and redirect `main_frame` requests to separate web-accessible local pages. No original URL is passed to those pages. A category redirect occurs before the request is sent when it matches and host permission is available. Ad and tracker rules retain their original block actions. No comprehensive malware rule set is claimed.

Allow rules have higher priority and intentionally bypass all filters for their destination. Initiator exceptions explicitly exclude main-frame requests, so navigating from an allowed page to another category-listed domain is still filtered.

Page cleanup is optional and registered dynamically; a small helper reads the current hostname to honor exceptions and toggles a root attribute used by packaged CSS. It starts inactive until local preferences load. No text/form extraction, URL logging, analytics or remote code is used.

The website and PayPal buttons navigate only when clicked. External links use no-referrer policies and do not append blocked URLs, settings or tracking parameters.

DNR references: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

The production category files include harmless adult.tinyshield.test and gambling.tinyshield.test domains. Test blocking checks permission, protection, actual rule activation and exceptions before creating a reserved test tab. The pending tab/category is stored in session memory before its navigation begins. The exact local blocked-page sender, matching tab and rendered heading/category/image/GitHub link must confirm before the result becomes Passed. Direct previews cannot confirm a test. No ordinary blocked visit is logged, and diagnostic exports omit test-tab IDs and browsing URLs. A missing confirmation remains unconfirmed, never passed.

Chrome and Edge ZIPs are generated from the same runtime with explicit build/version labels. Sidebar configuration is optional and errors are isolated from filtering. Its Open call runs directly in the click gesture using a previously obtained current-window ID. Go back uses history or local Settings, never a hardcoded browser-specific new-tab URL.

The manifest declares split private-window execution. Local preferences remain shared within the profile, and a storage-change listener reconciles each worker without rewriting preferences. Normal and private workers use different session-test keys. Both page checks and redirect tests create their tab in the diagnostic sender's window. Local-page checks navigate to a fixed `?check=1` resource and require that exact sender URL and registered tab; their confirmations update only page-check results, never the website-redirect result. The diagnostic export includes the normal/private context, not a list of visited pages.
