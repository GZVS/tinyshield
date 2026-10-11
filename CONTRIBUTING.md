# Contributing

Keep TinyShield's runtime small, local and understandable. Prefer packaged declarative rules over page-content monitoring. Do not add telemetry, runtime code downloads, external SDKs or broader permissions without explaining the user-facing need and updating the privacy policy.

Run `npm test` and `python3 tools/validate.py` before proposing changes. For changes to browser behavior, run the local Chromium QA script and the manual release checks. Use reserved test domains or hypothetical DNR matches instead of loading live adult/malicious content in automated tests.

Blocklist changes must preserve source URLs, hashes, modification dates and license notices. Report an upstream false positive to the source project and document any TinyShield-specific adjustments. Avoid keyword-based domain blocking that would unintentionally block ordinary domains.

Do not commit API keys, personal browser profiles, credentials, caches, generated ZIPs or node_modules. Keep GitHub issues free of sensitive browsing URLs and personal information.
