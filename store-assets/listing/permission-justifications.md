# Suggested dashboard permission explanations

| Permission | Explanation |
| --- | --- |
| declarativeNetRequest | Applies packaged local rules for ad/tracker filtering and optional adult/gambling navigation redirects, plus explicit website exceptions. |
| storage | Saves filter preferences, allowed website domains and filter-application status locally and temporary blocking-test results in session memory in the browser profile. No account sync is used. |
| scripting | Registers only packaged CSS and a small local helper when the user enables optional page cleanup. The helper reads the current hostname to honor exceptions. |
| sidePanel | Offers the same Zenith Guard controls alongside a webpage when the user opens the side panel from Settings. |
| Host permissions (HTTP/HTTPS) | Required for Chromium Declarative Net Request rules to block request networks, redirect blocked domains to local security pages, and inject cosmetic styles. |

No remote executable code is loaded. Filtering data is packaged; rebuilding the lists is a development operation, not a runtime download feature.
