# Test a blank blocked page — TinyShield 3.1.1

## Install the candidate

Extract the Chrome or Edge runtime ZIP. Open `chrome://extensions` or `edge://extensions`, enable Developer mode and **Load unpacked** the folder that directly contains `manifest.json`. If replacing your existing unpacked copy, update its original folder and click **Reload** to keep the same extension ID and settings. Check that Details shows **3.1.1**; do not leave two copies enabled together.

Open the toolbar popup, enable **Block adult sites** and **Block gambling sites**, approve HTTP/HTTPS website access, and keep **Protection on**. For this first check, temporarily disable any other website blocker in the test browser profile: another extension can win a block/redirect conflict. Managed browser policies can also affect access.

## Check the local pages first

Open **Test blocking** from the popup and click **Check adult page**, then **Check gambling page**. The new tabs should display the local blocked page with **Page check only — no website was blocked**. Return to the diagnostic screen: each local page result should say **Passed**. These checks work with the site filters off and do not prove a website redirect.

The footer identifies **Normal window** or **Private window**. For the first check use a normal Edge window. To test InPrivate/Incognito separately, enable **Allow in InPrivate/Incognito** in the extension's Details, open a private window and repeat both local and redirect checks there. This package declares split private execution; prior versions used default spanning mode, which cannot load extension pages in private main frames. Results are kept separately by window context.

## Run a real redirect test

1. Open **Test blocking** in the popup or Settings.
2. All three checks should pass. If filter activation differs, click **Repair filters**, then **Check again**. If website access is missing, enable a category in Settings and accept the browser's access prompt. In the extension's Details, ensure site access allows all websites when using category blocking.
3. Click **Test adult blocking**. A new tab should show **This site is blocked**, **Adult content**, the blue shield, **Visit GZVS on GitHub** and **Go back**.
4. Return to the test screen: the Adult result should say **Passed**. A result becomes **Needs checking** after 12 seconds without confirmation; it never treats a blank page as a pass.
5. Repeat **Test gambling blocking**. Its page must show **Gambling**, and its result must also say **Passed**.
6. Check the GitHub link goes to `https://github.com/GZVS`. **Go back** uses the tab's prior page or local Settings when there is no back history. Donations still go to your supplied PayPal link only when clicked.

The addresses `adult.tinyshield.test` and `gambling.tinyshield.test` are reserved test names inside the **production static category lists**. No real adult or gambling website is visited and no substitute redirect rule is injected. Use the buttons or a fresh tab with the full `https://…/` address; don't search for the name.

## Separate rendering from matching

**Preview page** opens the local HTML directly and labels it as a preview. A preview does not prove a network redirect or set a Passed result.

| Observation | What to inspect next |
| --- | --- |
| Local-page check or preview fails | Wrong/incomplete extracted folder, stale/disabled extension, private-window availability, missing local files or a page error. Check the installed ID/version in extension Details, extension Errors and the page's DevTools Console. |
| Preview works; .test tab fails | Missing/withheld site access, inactive rules, an exception for `tinyshield.test`, another blocker, browser policy, or a redirect/indexing error. |
| .test works; a particular real site loads | The domain may be absent from the list, allowed explicitly, changed to a new host, or already running as a cached/in-page application. A domain list is not a content classifier. |
| ERR_BLOCKED_BY_CLIENT at TinyShield's blocked-adult.html or blocked-gambling.html | The browser rejected the replacement extension page before rendering. Start with the local-page check in a normal window; check version/ID/private enablement and other blockers in the test profile. This error alone does not identify the cause. |
| Local-page checks pass; redirect checks fail with ready filters | Narrow the investigation to website permissions, redirects or a conflict. Export diagnostics and retain the harmless .test tab's error. |
| Checks look ready; result is Needs checking | The redirected page never confirmed its heading/category/image/link. Inspect the test tab; a script or image error also prevents confirmation. |

Click **Export diagnostics** and retain `tinyshield-diagnostics.json`. It contains the version, normal/private context, rule checks and separate page/redirect outcomes, with no visited URL/history or tab ID. Share it with the browser name/version, the .test tab's displayed address/error, and any extension error message. A screenshot of that harmless test tab is useful. Do not share a browser profile.

## Developer browser regression

```sh
npm install
npx playwright install chromium
npm test
npm run test:browser
npm run test:browser -- --target=edge
```

Both automated runs use **Playwright Chromium**, and the Edge run uses the Edge manifest. They do not certify behavior in branded Chrome/Edge. Optional origins are pre-granted only in the temporary automated fixture; real grant/deny/revoke UI remains a manual check. The tests match several full-list samples hypothetically, then navigate the production .test addresses via the real test buttons. Screenshots/results are written to the sibling browser-QA directory. See VERIFICATION.md for what ran here.

Sources: [DNR and testMatchOutcome](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest), [Playwright extension testing](https://playwright.dev/docs/chrome-extensions).
