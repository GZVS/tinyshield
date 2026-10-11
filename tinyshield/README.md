# TinyShield

TinyShield is a Manifest V3 browser extension that blocks common ad and tracker requests and optionally blocks adult and gambling websites. It uses packaged local rules, a compact blue popup, a side panel and detailed settings.

**Developer:** GZVS — GZ - Your friendly developer  
**Release candidate:** 3.1.1  
**Code license:** MIT; third-party list notices are retained separately.

## Features

- Independent ad, adult-site and gambling-site controls in the popup.
- Optional tracker blocking, page cleanup and experimental YouTube rules in Settings.
- A local blocked-site page with a clear category, a Go back button and an explicit link to https://github.com/GZVS.
- Optional PayPal donation button: https://www.paypal.com/paypalme/Zacharidis.
- Local settings and website exceptions. No accounts, runtime downloads, analytics, browsing logs or developer backend.
- Adult and gambling blocking is opt-in and asks for HTTP/HTTPS website access.
- Built-in confirmed local-page checks, previews, permission/ruleset checks, repair, and real redirect tests. Page loading and redirect success have separate results.
- Split private-window execution when explicitly enabled in browser Details. Preferences are shared within the profile; private and normal test results are separate.
- Chrome and desktop Microsoft Edge packages share the same guarded filtering code; sidebar errors cannot stop blocking.
- Existing TinyShield 2.0.0 settings migrate when upgrading the same installed extension ID.

## Load locally

1. Download/extract the source package, or extract the runtime ZIP for your browser.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge, enable Developer mode, and choose **Load unpacked**.
3. Select the **extension** folder from the source package, or the extracted runtime folder that directly contains **manifest.json**.
4. Pin TinyShield and open the toolbar popup.
5. Enable the adult or gambling toggle and approve Chrome's website-access prompt if you want that category.
6. Open **Test blocking**, run **Check adult page** and **Check gambling page**, then run both website-blocking tests. Each new tab should show **This site is blocked**, the correct category, and **Visit GZVS on GitHub**. Return to see the corresponding **Passed** result. Read [BLOCKING_TESTS.md](docs/BLOCKING_TESTS.md) for browser errors or blank pages.
7. Open Settings for trackers, cleanup, YouTube and exceptions. Reload existing pages after enabling cleanup.

## Project layout

| Path | Purpose |
| --- | --- |
| `extension/` | Files loaded by Chrome and included in the Chrome upload ZIP |
| `privacy.md` | Public privacy policy for this release |
| `vendor/blocklistproject/` | Full upstream adult/gambling snapshots and notices |
| `tools/build_blocklists.py` | Reproducible local domain validation, grouping and rule generation |
| `tools/validate.py` | Manifest, reference, rule and source checks |
| `tools/package.py` | Build separate Chrome and Edge upload ZIPs from the shared runtime |
| `tests/` | Automated unit tests and optional local Chromium QA/capture script |
| `store-assets/` | Icons, promo artwork, UI previews, listing copy and publishing guide |
| `docs/` | Architecture, verification status, design notes and manual release checks |

## Domain list coverage

Source: [Block List Project](https://github.com/blocklistproject/Lists). The source adult list contains 953,393 domains and the gambling list 278,856. After validation, the adult category retains 953,197 entries. Child domains already covered by parent domains are collapsed without reducing coverage. The final files contain 936,979 adult domain conditions in 937 rules, and 278,852 gambling conditions in 279 rules. Each list also includes one reserved `.test` address for on-device QA; the upstream coverage counts above exclude these test addresses. The existing ad/tracker/YouTube filters add 58 rules: **1,274 packaged rules total**.

Hashes, raw URLs and upstream modification dates are recorded in `extension/blocklist-info.json`. This candidate uses snapshots whose headers report July 2026 modification dates. It does not claim live threat intelligence or daily updates.

Chrome's `requestDomains` matching includes subdomains. Each category redirects only top-level HTTP/HTTPS website visits; it does not classify images, scan page content, filter search results or block every embedded adult/gambling resource. The lists can contain false positives and omissions. No separate comprehensive malware/phishing category is added in this release. Browser Safe Browsing remains independent of TinyShield.

## Exceptions and limits

An allowed website and its subdomains bypass **all TinyShield filters**, including adult and gambling blocking. Exceptions are user-controlled and limited to 200 domains. Clicking a link from an allowed website to another blocked domain does not itself exempt that destination. A user can change settings or uninstall the extension. TinyShield is not a locked parental-control system.

The original ad filter is small and best effort. YouTube blocking is experimental and can miss ads or interfere with playback. This release does not promise to remove every ad.

## Build and test

No build step or npm dependency is needed to load the shipped extension. For source checks, install Node.js and Python 3.10+:

```sh
npm test
python3 tools/validate.py
python3 tools/build_blocklists.py
python3 tools/package.py
```

`build_blocklists.py` rebuilds from vendored snapshots without network access. To deliberately refresh the upstream snapshots before rebuilding:

```sh
python3 tools/build_blocklists.py --download
```

Review the new list contents, metadata, notices and runtime activation before releasing an update. Bundled rules are updated through a new extension release; TinyShield does not fetch lists while users browse.

## Local browser QA and live screenshots

```sh
npm install
npx playwright install chromium
npm run test:browser
```

This optional test uses a temporary copy with website access pre-granted in a test-only manifest so automation does not operate Chrome's permission dialog. It loads the real packaged category rules, tests hypothetical matches, exercises controls and uses the shipped static `.test` rules and built-in Test blocking screen to verify redirects without injecting substitute redirect rules. It does not visit a live adult or gambling website. Production website access remains optional. Verify real permission prompts and denial/revocation separately using `docs/RELEASE_CHECKS.md`.

The browser script writes six 1280×800 live PNG captures and results to the sibling `tinyshield-browser-qa-chrome/` folder (or `QA_OUTPUT`). After checking them, copy the actual screenshots into your publishing assets. Run `npm run test:browser -- --target=edge` to check the Edge manifest in Playwright Chromium; this does not prove behavior in Microsoft Edge itself. The bundled `ui-previews` are 3.0 design references, not current installed-extension screenshots; they do not show the new 3.1 diagnostic controls. Read `docs/VERIFICATION.md` before submitting a store update.

## Publish as open source

Create a public GitHub repository such as `GZVS/TinyShield`, then upload this source folder's contents. Commit the vendor snapshots, generated rules, license and notices so another developer can reproduce the build. Exclude `dist/`, `node_modules/` and browser profiles. The public repository URL is a suggestion until you create it; the extension currently links to the existing developer profile, https://github.com/GZVS.

## Privacy and support

[Privacy policy](privacy.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)  
Support/privacy email: zsgeorgios@icloud.com  
Optional donations: https://www.paypal.com/paypalme/Zacharidis

All features are free. No payment or donation is required to use the filters.

## Microsoft Edge

Extract `tinyshield-v3.1.1-edge.zip` and load that folder at `edge://extensions`. The toolbar popup and Settings are available even when a sidebar method is missing or fails. No Chrome-only new-tab URL is used. See [EDGE.md](docs/EDGE.md) for actual Edge validation and store preparation. Both browser builds are release candidates until their live checks pass.
