# Microsoft Edge candidate — TinyShield 3.1.1

The Edge ZIP has a root manifest, Edge version label, the complete local lists and the shared runtime. It uses the same four permissions and optional website access as Chrome. No Chrome-only internal page URL or backend is added. Network initialization tolerates absent/failing sidebar methods; the popup and Settings remain the primary controls.

## Actual desktop Edge validation

1. Extract `tinyshield-v3.1.1-edge.zip` into its own folder. In `edge://extensions`, enable Developer mode and **Load unpacked** that folder. Confirm version 3.1.1 and no manifest/list/service-worker errors.
2. Follow BLOCKING_TESTS.md: first run both **Check page** buttons in a normal window. Then grant site access, enable both categories, run the two .test buttons and check the separate **Passed** results. Test Go back, page previews, the GitHub destination and the PayPal destination.
3. Deny website access on a fresh installation. Categories must remain off with visible feedback. Then grant access and repeat. Revoke access through Edge extension Details: categories/cleanup must turn off while basic ad/tracker rules remain.
4. Pause/resume, add/remove a harmless allowed domain, restart Edge and repeat the category tests. Results reset between browser sessions; preferences persist. Test upgrades under the same extension ID.
5. Open the Edge sidebar through Settings if available. Disable the browser sidebar option and confirm popup/settings/filtering still work. Check keyboard focus and a narrow panel.
6. Test desktop Edge on Windows, then any other desktop OS you intend to support. For InPrivate, explicitly allow TinyShield in extension Details and repeat both page and redirect checks in an InPrivate window. The manifest uses split execution so local blocked pages can load there. Check that pausing in one window applies in the other, and private test results do not inherit normal-window passes. Managed profiles may restrict extensions or website access.

This candidate has not passed these actual Edge checks in the authoring environment. The included `--target=edge` browser script verifies the manifest/shared runtime in Playwright Chromium only. Current branded Edge cannot be assumed to accept automated command-line side-loading; load unpacked through its supported UI for this manual check.

## Build and publish

```sh
python3 tools/package.py --target=edge
```

Upload the Edge runtime ZIP, not the source/kit archive, to Microsoft Partner Center after browser checks pass. `store-assets/edge/` contains the publishing guide, store logo and reviewer test notes; the common listing text and promo PNGs are reusable. Use a verified public privacy-policy URL. No store submission was made by this build.

Official references: [supported Edge APIs](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support), [Edge sidebar](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar), [publish an Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension), [Playwright extension testing](https://playwright.dev/docs/chrome-extensions).
