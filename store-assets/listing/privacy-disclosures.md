# Privacy-disclosure notes for the store dashboard

Use the actual dashboard wording for the submitted version. These notes describe the implementation, not a guarantee of store approval.

- No user data is collected by or transmitted to the developer/backend; no analytics, telemetry or browsing logs.
- Your browser locally evaluates request URLs/domains against packaged rules. Optional cleanup uses the hostname locally in memory.
- Preferences, allowed domains and filter status stay in chrome.storage.local. No sync/cloud storage.
- External GitHub/PayPal links open only when clicked and contain no browsing URLs, settings or tracking parameters. Donations are handled by PayPal.
- Zenith Guard does not sell user data, use it for advertising, or use it for unrelated purposes.
- No remote executable code is used.

Host the provided `privacy.md` and enter the exact publicly reachable policy URL. Do not claim that locally processed website information is never accessed: the privacy policy explains local request matching and hostname use.

- Only user-started .test redirect checks store temporary category/tab/status state in chrome.storage.session. Normal blocked visits create no logs. A user can export a local diagnostic JSON file; export omits tab IDs and browsing URLs and sends nothing automatically.
