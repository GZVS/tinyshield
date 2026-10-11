# Suggested dashboard permission explanations

| Permission | Explanation |
| --- | --- |
| declarativeNetRequest | Applies packaged local rules for ad/tracker filtering and optional adult/gambling navigation redirects, plus explicit website exceptions. |
| storage | Saves filter preferences, allowed website domains and filter-application status locally and temporary blocking-test results in session memory in the browser profile. No account sync is used. |
| scripting | Registers only packaged CSS and a small local helper when the user enables optional page cleanup. The helper reads the current hostname to honor exceptions. |
| sidePanel | Offers the same TinyShield controls alongside a webpage when the user opens the side panel from Settings. |
| Optional HTTP/HTTPS host access | Needed to redirect a matching top-level website visit to TinyShield's local blocked page and to apply optional page cleanup. Access is requested when the user enables a dependent feature. |

No remote executable code is loaded. Filtering data is packaged; rebuilding the lists is a development operation, not a runtime download feature.
