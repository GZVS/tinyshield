# Third-party notices

## Block List Project domain snapshots

Source: https://github.com/blocklistproject/Lists

Adult and gambling lists are converted to local Chrome main-frame redirect rules. Source files, complete headers, SHA-256 hashes, upstream modification dates and the repository LICENSE are preserved. Details are in `extension/blocklist-info.json` and `vendor/blocklistproject/`.

The repository LICENSE is the Unlicense. The raw downloaded list headers say MIT. This distribution preserves both the Unlicense and an MIT permission notice with source attribution rather than removing the inconsistent upstream notice. No claim is made that the TinyShield MIT license replaces upstream notices.

Generated category JSON rules are derived from those domain lists. The extension package includes `third-party/` with both notices.

## Existing TinyShield filters

The 30 ad rules, 20 tracker rules, 8 experimental YouTube rules and cosmetic selectors originate in the user-supplied TinyShield 2.0.0 archive. They are small handcrafted rule sets, not EasyList or EasyPrivacy. No broader third-party filter coverage is claimed.

## Artwork and libraries

TinyShield's new shield and interface icons are editable original SVG assets. No external fonts, scripts, analytics SDKs or runtime libraries are shipped in the extension. Testing and release artwork are generated using development tools outside the Chrome runtime package.
