import { enabledRulesets } from "./settings.js";

export const TEST_STATE_KEY = "tinyShieldBlockingTests";
export const TESTS = Object.freeze({
  adult: { domain: "adult.tinyshield.test", setting: "adultEnabled", ruleset: "adult_sites", page: "blocked-adult.html", reason: "Adult content" },
  gambling: { domain: "gambling.tinyshield.test", setting: "gamblingEnabled", ruleset: "gambling_sites", page: "blocked-gambling.html", reason: "Gambling" },
});

export function testStateKey(privateWindow = false) {
  return privateWindow ? `${TEST_STATE_KEY}:private` : TEST_STATE_KEY;
}

function testResult(last, now) {
  return last?.status === "running" && now - last.startedAt > 12000
    ? "unconfirmed" : last?.status || "not-run";
}

export function sameRulesets(actual, expected) {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

export function blockingChecks(settings, hasAccess, actual, status, tests = {}, now = Date.now()) {
  const expected = enabledRulesets(settings, hasAccess);
  const checks = [
    { label: "Protection", ok: settings.enabled, detail: settings.enabled ? "On" : "Paused — resume protection first." },
    { label: "Website access", ok: hasAccess, detail: hasAccess ? "Granted for HTTP and HTTPS websites" : "Missing — enable a site filter and grant website access." },
    { label: "Filter activation", ok: status?.ok !== false && sameRulesets(actual, expected), detail: status?.ok === false ? status.message : sameRulesets(actual, expected) ? "Browser rules agree with saved settings" : "Browser rules differ from saved settings. Click Repair filters." },
  ];
  const categories = {};
  const pageChecks = {};
  for (const [category, spec] of Object.entries(TESTS)) {
    const excepted = settings.allowedSites.some((domain) => spec.domain === domain || spec.domain.endsWith(`.${domain}`));
    const ready = settings.enabled && hasAccess && settings[spec.setting] && actual.includes(spec.ruleset) && sameRulesets(actual, expected) && !excepted && status?.ok !== false;
    const last = tests[category];
    const result = testResult(last, now);
    categories[category] = {
      ready,
      detail: excepted ? "Remove the test domain from Allowed websites first." : !settings[spec.setting] ? "Enable this category first." : !ready ? "Resolve the failed checks above first." : "Ready to test the packaged redirect",
      result,
      message: result === "passed" ? "The redirected page confirmed its heading, category, GitHub link and shield image." : result === "running" ? "Waiting for the blocked page to render…" : result === "unconfirmed" ? "No blocked-page confirmation arrived. Inspect the test tab and export these diagnostics." : "No navigation test has run in this browser session.",
    };
    const pageResult = testResult(tests.pages?.[category], now);
    pageChecks[category] = {
      result: pageResult,
      message: pageResult === "passed" ? "The local page confirmed its heading, category, GitHub link and shield image. Website redirection is a separate test."
        : pageResult === "running" ? "Waiting for the local blocked page to render…"
        : pageResult === "unconfirmed" ? "The local page did not confirm rendering. Inspect its tab and the extension's Errors."
        : "The local page has not been checked in this browser session.",
    };
  }
  return { checks, categories, pageChecks, enabledRulesets: actual, expectedRulesets: expected };
}
