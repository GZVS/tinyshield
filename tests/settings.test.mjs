import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanSettings,
  normalizeDomain,
  enabledRulesets,
  buildAllowRules,
  DEFAULTS,
} from "../extension/settings.js";

test("migration preserves existing preferences without enabling new content filters", () => {
  const migrated = cleanSettings({
    enabled: false,
    youtubeEnabled: true,
    cosmeticEnabled: false,
    allowedSites: [
      "EXAMPLE.COM",
      "example.com",
      "bad/path",
      "https://safe.example",
    ],
  });
  assert.equal(migrated.enabled, false);
  assert.equal(migrated.youtubeEnabled, true);
  assert.equal(migrated.adultEnabled, false);
  assert.equal(migrated.gamblingEnabled, false);
  assert.equal(migrated.cosmeticEnabled, false);
  assert.deepEqual(migrated.allowedSites, ["example.com", "safe.example"]);
});
test("domain exceptions cannot contain credentials, paths, ports, wildcards or URL injections", () => {
  for (const input of [
    "https://x:secret@example.com",
    "example.com:8080",
    "example.com/path",
    "example.com?q=1",
    "*.com",
    "com",
    "javascript:alert(1)",
    "127.0.0.1",
    "example.com#x",
  ])
    assert.throws(() => normalizeDomain(input));
  assert.equal(normalizeDomain("https://EXAMPLE.COM/"), "example.com");
  assert.equal(normalizeDomain("παράδειγμα.gr"), "xn--hxajbheg2az3al.gr");
});
test("pausing disables every ruleset; categories require optional access", () => {
  const all = {
    ...DEFAULTS,
    youtubeEnabled: true,
    adultEnabled: true,
    gamblingEnabled: true,
  };
  assert.deepEqual(enabledRulesets({ ...all, enabled: false }, true), []);
  assert.deepEqual(enabledRulesets(all, false), [
    "web_ads",
    "trackers",
    "youtube_ads",
  ]);
  assert.deepEqual(enabledRulesets(all, true), [
    "web_ads",
    "trackers",
    "youtube_ads",
    "adult_sites",
    "gambling_sites",
  ]);
});
test("an allowed initiator never exempts a navigation to a blocked destination", () => {
  const rules = buildAllowRules(["example.com"]);
  assert.deepEqual(rules[0].condition.resourceTypes, ["main_frame"]);
  assert.deepEqual(rules[1].condition.excludedResourceTypes, ["main_frame"]);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, 2);
});
test("exception cap cannot produce overlapping rule IDs", () => {
  const settings = cleanSettings({
    ...DEFAULTS,
    allowedSites: Array.from({ length: 300 }, (_, i) => `site${i}.example`),
  });
  assert.equal(settings.allowedSites.length, 200);
  const rules = buildAllowRules(settings.allowedSites);
  assert.equal(rules.length, 400);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, 400);
});
