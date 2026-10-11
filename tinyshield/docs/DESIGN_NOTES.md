# Design fidelity notes

Accepted reference: TinyShield's **02 — Soft Blue** concept from 10 October 2026.

Compared the concept with implementation-derived 1280×800 previews using image inspection. Native live browser comparison is blocked; see VERIFICATION.md. These notes establish design intent rather than claiming browser fidelity QA passed.

| Comparison | Implementation |
| --- | --- |
| Palette | Pale cool background, white rows, #0969e8 blue toggles/CTA, navy text; coral removed. |
| Main layout | Compact shield/brand header, three independent toggle rows, protection status, footer. |
| Typography | System UI stack with explicit heading, body, label and button sizes. Preview renderer uses an available fallback; Windows Segoe UI remains a local check. |
| Icons | Editable outline shield, prohibition, 18+ and die metaphors; blue outline treatment. |
| Spacing/container | Rounded white rows, fine pale borders and restrained background gradient. |
| Blocking page | Centered shield, heading, reason pill, explanation, explicit GitHub CTA and Go back. |

Intentional approved/functional additions: a Donate via PayPal button replaces the generic support action; privacy/GitHub footer links are present; the status control can pause all filtering; website-access feedback explains the optional permissions. Detailed pre-existing controls move to Settings. The side panel stays available from Settings.

The blocked page is a local pre-load redirect rather than a cosmetic overlay over an already-running site. This functional deviation prevents the matching site's main-frame content from loading when the rule applies.
