import {
  SETTINGS_KEY, STATUS_KEY, DEFAULTS, WEBSITE_ORIGINS, RULESET_IDS,
  cleanSettings, enabledRulesets, buildAllowRules,
} from "./settings.js";
import { testStateKey, TESTS, sameRulesets, blockingChecks } from "./diagnostics-core.js";

const COSMETIC_SCRIPT_ID = "tinyshield-page-cleanup";
const EXT_COSMETIC_SCRIPT_ID = "tinyshield-ext-cosmetic";
const EXT_YOUTUBE_SCRIPT_ID = "tinyshield-ext-youtube";
const PRIVATE_WINDOW = Boolean(chrome.extension?.inIncognitoContext);
const TEST_STATE_KEY = testStateKey(PRIVATE_WINDOW);
let queue = Promise.resolve();

async function syncContentScripts(settings, hasAccess) {
  // Static content scripts are declared in manifest.json.
  // Clean up any dynamically registered content scripts to prevent duplication.
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: registered.map((s) => s.id) });
    }
  } catch (e) {}
}

async function applySettings(settings) {
  const expected = enabledRulesets(settings);
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const desired = buildAllowRules(settings.allowedSites);
  if (JSON.stringify(rules) !== JSON.stringify(desired)) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: rules.map((rule) => rule.id), addRules: desired });
  }
  const current = await chrome.declarativeNetRequest.getEnabledRulesets();
  if (!sameRulesets(current, expected)) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: expected.filter((id) => !current.includes(id)),
      disableRulesetIds: RULESET_IDS.filter((id) => current.includes(id) && !expected.includes(id)),
    });
  }
  const actual = await chrome.declarativeNetRequest.getEnabledRulesets();
  if (!sameRulesets(actual, expected)) {
    throw new Error("The browser did not activate the requested filters. Open Test blocking and click Repair filters.");
  }
  const hasAccess = await chrome.permissions.contains({ origins: WEBSITE_ORIGINS });
  await syncContentScripts(settings, hasAccess);
  return actual;
}

async function recordError(error) {
  console.error("TinyShield:", error.message);
  await chrome.storage.local.set({ [STATUS_KEY]: { ok: false, message: error.message } });
}

async function initialize() {
  const saved = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = cleanSettings(saved[SETTINGS_KEY] || DEFAULTS);
  const rulesets = await applySettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings, [STATUS_KEY]: { ok: true, rulesets } });
  // Sidebar support is optional and must never stop network protection.
  if (chrome.sidePanel?.setPanelBehavior) {
    try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }); }
    catch (error) { console.warn("TinyShield sidebar:", error.message); }
  }
  return settings;
}

const ready = initialize().catch(recordError);
function serialize(task) {
  const work = queue.then(task);
  queue = work.catch(() => {});
  return work;
}

async function getDiagnostics(settings, status) {
  const [hasAccess, actual, session] = await Promise.all([
    chrome.permissions.contains({ origins: WEBSITE_ORIGINS }),
    chrome.declarativeNetRequest.getEnabledRulesets(),
    chrome.storage.session.get(TEST_STATE_KEY),
  ]);
  return {
    version: chrome.runtime.getManifest().version,
    privateWindow: PRIVATE_WINDOW,
    privateBrowsingMode: chrome.runtime.getManifest().incognito || "spanning",
    sidebarAvailable: Boolean(chrome.sidePanel?.open),
    ...blockingChecks(settings, hasAccess, actual, status, session[TEST_STATE_KEY]),
  };
}

async function runPageCheck(category, sender) {
  if (!Object.hasOwn(TESTS, category)) throw new Error("Choose adult, gambling or security page loading to check.");
  const tab = await chrome.tabs.create({ url: "about:blank", ...(Number.isInteger(sender.tab?.windowId) ? { windowId: sender.tab.windowId } : {}) });
  const stored = await chrome.storage.session.get(TEST_STATE_KEY);
  const tests = stored[TEST_STATE_KEY] || {};
  await chrome.storage.session.set({ [TEST_STATE_KEY]: {
    ...tests, pages: { ...tests.pages, [category]: { status: "running", tabId: tab.id, startedAt: Date.now() } },
  } });
  try { await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(TESTS[category].page) + "?check=1" }); }
  catch (error) {
    const latest = (await chrome.storage.session.get(TEST_STATE_KEY))[TEST_STATE_KEY] || {};
    await chrome.storage.session.set({ [TEST_STATE_KEY]: { ...latest, pages: { ...latest.pages, [category]: { status: "unconfirmed" } } } });
    throw error;
  }
  return { category };
}

async function runBlockingTest(category, settings, status, sender) {
  if (!Object.hasOwn(TESTS, category)) throw new Error("Choose adult, gambling or security blocking to test.");
  const spec = TESTS[category];
  if (!spec) throw new Error("Choose adult, gambling or security blocking to test.");
  const diagnostics = await getDiagnostics(settings, status);
  if (!diagnostics.categories[category].ready) throw new Error(diagnostics.categories[category].detail);
  // Store only a reserved test tab, never a user's visited URL.
  const tab = await chrome.tabs.create({ url: "about:blank", ...(Number.isInteger(sender.tab?.windowId) ? { windowId: sender.tab.windowId } : {}) });
  const stored = await chrome.storage.session.get(TEST_STATE_KEY);
  await chrome.storage.session.set({ [TEST_STATE_KEY]: {
    ...stored[TEST_STATE_KEY],
    [category]: { status: "running", tabId: tab.id, startedAt: Date.now() },
  } });
  try { await chrome.tabs.update(tab.id, { url: `https://${spec.domain}/` }); }
  catch (error) {
    const latest = await chrome.storage.session.get(TEST_STATE_KEY);
    await chrome.storage.session.set({ [TEST_STATE_KEY]: { ...latest[TEST_STATE_KEY], [category]: { status: "unconfirmed" } } });
    throw error;
  }
  return { category };
}

async function confirmBlockingTest(message, sender) {
  if (!Object.hasOwn(TESTS, message.category)) return;
  const spec = TESTS[message.category];
  if (message.mode !== undefined && !["page", "redirect"].includes(message.mode)) return;
  const pageCheck = message.mode === "page";
  if (!spec || sender.url !== chrome.runtime.getURL(spec.page) + (pageCheck ? "?check=1" : "") || message.rendered !== true) return;
  const stored = await chrome.storage.session.get(TEST_STATE_KEY);
  const tests = stored[TEST_STATE_KEY] || {};
  const pending = pageCheck ? tests.pages?.[message.category] : tests[message.category];
  if (pending?.status !== "running" || pending.tabId !== sender.tab?.id) return;
  await chrome.storage.session.set({ [TEST_STATE_KEY]: {
    ...tests, ...(pageCheck ? { pages: { ...tests.pages, [message.category]: { status: "passed" } } } : { [message.category]: { status: "passed" } }),
  } });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!["get-settings", "save-settings", "repair-filters", "get-diagnostics", "run-blocking-test", "run-page-check", "blocked-page-ready"].includes(message?.type)) return;
  serialize(async () => {
    await ready;
    if (message.type === "blocked-page-ready") {
      await confirmBlockingTest(message, sender);
      return {};
    }
    const saved = await chrome.storage.local.get([SETTINGS_KEY, STATUS_KEY]);
    const previous = cleanSettings(saved[SETTINGS_KEY] || DEFAULTS);
    if (message.type === "get-settings") return { settings: previous, status: saved[STATUS_KEY] };
    if (message.type === "get-diagnostics") return { diagnostics: await getDiagnostics(previous, saved[STATUS_KEY]) };
    if (message.type === "run-blocking-test") return await runBlockingTest(message.category, previous, saved[STATUS_KEY], sender);
    if (message.type === "run-page-check") return await runPageCheck(message.category, sender);
    const patch = {};
    if (message.type === "save-settings") {
      for (const key of Object.keys(DEFAULTS)) {
        if (Object.hasOwn(message.changes || {}, key)) patch[key] = message.changes[key];
      }
    }
    const next = cleanSettings({ ...previous, ...patch });
    try {
      const rulesets = await applySettings(next);
      const status = { ok: true, rulesets };
      await chrome.storage.local.set({ [SETTINGS_KEY]: next, [STATUS_KEY]: status });
      return { settings: next, status };
    } catch (error) {
      // Only report healthy rollback after the browser confirms its actual rules.
      try {
        const rulesets = await applySettings(previous);
        await chrome.storage.local.set({ [STATUS_KEY]: { ok: true, rulesets } });
      } catch (rollbackError) { await recordError(rollbackError); }
      throw error;
    }
  }).then((result) => respond({ ok: true, ...result }))
    .catch((error) => respond({ ok: false, message: error.message }));
  return true;
});

chrome.permissions.onRemoved.addListener(() => {
  serialize(async () => { await ready; await initialize(); }).catch(recordError);
});

// Local settings are shared with split private windows. Reconcile each worker
// when another window changes them, without writing settings back or looping.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]?.newValue) return;
  const change = changes[SETTINGS_KEY];
  if (JSON.stringify(cleanSettings(change.oldValue || DEFAULTS)) === JSON.stringify(cleanSettings(change.newValue))) return;
  serialize(async () => {
    await ready;
    const saved = await chrome.storage.local.get(SETTINGS_KEY);
    const rulesets = await applySettings(cleanSettings(saved[SETTINGS_KEY] || DEFAULTS));
    await chrome.storage.local.set({ [STATUS_KEY]: { ok: true, rulesets } });
  }).catch(recordError);
});
