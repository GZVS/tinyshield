import test from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_KEY, STATUS_KEY } from '../extension/settings.js';
import { TEST_STATE_KEY } from '../extension/diagnostics-core.js';

function makeChrome({ sidebar = 'available', startupFailure = false, privateWindow = false } = {}) {
  const data = {};
  const session = {};
  const tabs = [];
  let enabled = [];
  let rules = [];
  let scripts = [];
  let access = false;
  let failDynamic = false;
  let failRuleset = startupFailure;
  let mismatchRuleset = false;
  let listener;
  let permissionListener;
  let storageListener;
  const area = store => ({
    get: async keys => typeof keys === 'string' ? { [keys]: structuredClone(store[keys]) } : Object.fromEntries(keys.map(key => [key, structuredClone(store[key])])),
    set: async entries => Object.assign(store, structuredClone(entries)),
  });
  globalThis.chrome = {
    storage: { local: area(data), session: area(session), onChanged: { addListener: fn => { storageListener = fn; } } },
    extension: { inIncognitoContext: privateWindow },
    permissions: { contains: async () => access, onRemoved: { addListener: fn => { permissionListener = fn; } } },
    declarativeNetRequest: {
      getDynamicRules: async () => structuredClone(rules),
      getEnabledRulesets: async () => [...enabled],
      updateDynamicRules: async value => {
        if (failDynamic) { failDynamic = false; throw new Error('Simulated Chrome dynamic rule failure'); }
        rules = [...rules.filter(rule => !value.removeRuleIds.includes(rule.id)), ...value.addRules];
      },
      updateEnabledRulesets: async value => {
        if (failRuleset) { failRuleset = false; throw new Error('Simulated Chrome indexing failure'); }
        if (mismatchRuleset) { mismatchRuleset = false; return; }
        enabled = [...new Set([...enabled.filter(id => !value.disableRulesetIds.includes(id)), ...value.enableRulesetIds])];
      },
    },
    scripting: {
      getRegisteredContentScripts: async () => scripts,
      registerContentScripts: async value => { scripts = value; },
      unregisterContentScripts: async () => { scripts = []; },
    },
    tabs: {
      create: async value => { const tab = { id: 42 + tabs.length, ...value }; tabs.push(tab); return tab; },
      update: async (id, value) => { Object.assign(tabs.find(tab => tab.id === id), value); },
    },
    runtime: {
      getManifest: () => ({ version: '3.1.1', incognito: 'split' }),
      getURL: path => `chrome-extension://tinyshield-test/${path}`,
      onMessage: { addListener: fn => { listener = fn; } },
    },
  };
  if (sidebar !== 'unavailable') chrome.sidePanel = {
    open: async () => {},
    setPanelBehavior: async () => { if (sidebar === 'failing') throw new Error('Sidebar unsupported'); },
  };
  return {
    data, session, tabs, enabled: () => enabled, rules: () => rules, scripts: () => scripts,
    grant: () => { access = true; },
    revoke: () => { access = false; permissionListener(); },
    fail: () => { failDynamic = true; },
    mismatch: () => { mismatchRuleset = true; },
    changeSettings: changes => {
      const oldValue = structuredClone(data[SETTINGS_KEY]);
      data[SETTINGS_KEY] = { ...data[SETTINGS_KEY], ...changes };
      storageListener({ [SETTINGS_KEY]: { oldValue, newValue: structuredClone(data[SETTINGS_KEY]) } }, 'local');
    },
    send: (message, sender = {}) => new Promise(resolve => listener(message, sender, resolve)),
  };
}

let serial = 0;
async function start(fixture) {
  await import(`../extension/background.js?background-test=${++serial}`);
  return await fixture.send({ type: 'get-settings' });
}

test('background applies permissions, serializes saves, verifies actual activation and rolls back failures', async () => {
  const fixture = makeChrome();
  const initial = await start(fixture);
  assert.equal(initial.ok, true);
  assert.deepEqual(fixture.enabled(), ['web_ads', 'trackers']);

  const denied = await fixture.send({ type: 'save-settings', changes: { adultEnabled: true } });
  assert.equal(denied.ok, false);
  assert.equal(fixture.data[SETTINGS_KEY].adultEnabled, false);
  const preflight = await fixture.send({ type: 'run-blocking-test', category: 'adult' });
  assert.equal(preflight.ok, false);
  assert.equal(fixture.tabs.length, 0);

  fixture.grant();
  const concurrent = await Promise.all([
    fixture.send({ type: 'save-settings', changes: { adultEnabled: true } }),
    fixture.send({ type: 'save-settings', changes: { gamblingEnabled: true } }),
  ]);
  assert.ok(concurrent.every(result => result.ok));
  assert.equal(fixture.data[SETTINGS_KEY].adultEnabled, true);
  assert.equal(fixture.data[SETTINGS_KEY].gamblingEnabled, true);

  fixture.mismatch();
  const mismatch = await fixture.send({ type: 'save-settings', changes: { adultEnabled: false } });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.message, /did not activate/);
  assert.equal(fixture.data[SETTINGS_KEY].adultEnabled, true);

  fixture.fail();
  const failed = await fixture.send({ type: 'save-settings', changes: { allowedSites: ['example.com'] } });
  assert.equal(failed.ok, false);
  assert.deepEqual(fixture.data[SETTINGS_KEY].allowedSites, []);
  assert.deepEqual(fixture.rules(), []);
  assert.ok(fixture.enabled().includes('adult_sites'));

  await fixture.send({ type: 'save-settings', changes: { cosmeticEnabled: true } });
  assert.equal(fixture.scripts().length, 1);
  fixture.revoke();
  const revoked = await fixture.send({ type: 'get-settings' });
  assert.equal(revoked.settings.adultEnabled, false);
  assert.equal(revoked.settings.gamblingEnabled, false);
  assert.equal(revoked.settings.cosmeticEnabled, false);
  assert.equal(fixture.scripts().length, 0);
  assert.deepEqual(fixture.enabled(), ['web_ads', 'trackers']);
  assert.equal(fixture.data[STATUS_KEY].ok, true);
});

test('test results require the registered tab and actual blocked page; previews and real visits do not log', async () => {
  const fixture = makeChrome();
  await start(fixture);
  fixture.grant();
  await fixture.send({ type: 'save-settings', changes: { adultEnabled: true, gamblingEnabled: true } });
  const invalid = await fixture.send({ type: 'run-blocking-test', category: '__proto__' });
  assert.equal(invalid.ok, false);
  assert.equal(fixture.tabs.length, 0);
  await fixture.send({ type: 'run-blocking-test', category: 'adult' });
  assert.equal(fixture.tabs[0].url, 'https://adult.tinyshield.test/');
  const message = { type: 'blocked-page-ready', category: 'adult', rendered: true };
  await fixture.send(message, { url: 'chrome-extension://tinyshield-test/blocked-adult.html?preview=1', tab: { id: 42 } });
  await fixture.send(message, { url: 'chrome-extension://tinyshield-test/blocked-adult.html', tab: { id: 99 } });
  await fixture.send({ ...message, rendered: false }, { url: 'chrome-extension://tinyshield-test/blocked-adult.html', tab: { id: 42 } });
  assert.equal(fixture.session[TEST_STATE_KEY].adult.status, 'running');
  await fixture.send(message, { url: 'chrome-extension://tinyshield-test/blocked-adult.html', tab: { id: 42 } });
  assert.deepEqual(fixture.session[TEST_STATE_KEY].adult, { status: 'passed' });
  const result = await fixture.send({ type: 'get-diagnostics' });
  assert.equal(result.diagnostics.categories.adult.result, 'passed');
  assert.ok(!JSON.stringify(result.diagnostics).includes('tabId'));
  assert.ok(!JSON.stringify(fixture.data).includes('https://adult.tinyshield.test/'));
  const snapshot = JSON.stringify(fixture.session);
  await fixture.send({ ...message, category: 'gambling' }, { url: 'chrome-extension://tinyshield-test/blocked-gambling.html', tab: { id: 90 } });
  assert.equal(JSON.stringify(fixture.session), snapshot);
});

test('initialization failures are visible and repair succeeds without a sidebar API', async () => {
  const fixture = makeChrome({ sidebar: 'unavailable', startupFailure: true });
  const initial = await start(fixture);
  assert.equal(initial.status.ok, false);
  assert.match(initial.status.message, /indexing failure/);
  const repaired = await fixture.send({ type: 'repair-filters' });
  assert.equal(repaired.ok, true);
  assert.equal(repaired.status.ok, true);
  const diagnostics = await fixture.send({ type: 'get-diagnostics' });
  assert.equal(diagnostics.diagnostics.sidebarAvailable, false);
  assert.equal(diagnostics.diagnostics.checks.find(check => check.label === 'Filter activation').ok, true);
});

test('a sidebar API error does not mark working network protection as broken', async () => {
  const fixture = makeChrome({ sidebar: 'failing' });
  const initial = await start(fixture);
  assert.equal(initial.status.ok, true);
  assert.deepEqual(fixture.enabled(), ['web_ads', 'trackers']);
});

test('local page checks need no host grant and cannot count as a successful redirect', async () => {
  const fixture = makeChrome();
  await start(fixture);
  const invalid = await fixture.send({ type: 'run-page-check', category: '__proto__' });
  assert.equal(invalid.ok, false);
  assert.equal(fixture.tabs.length, 0);
  const check = await fixture.send({ type: 'run-page-check', category: 'adult' }, { tab: { windowId: 7 } });
  assert.equal(check.ok, true);
  assert.equal(fixture.tabs[0].windowId, 7);
  assert.equal(fixture.tabs[0].url, 'chrome-extension://tinyshield-test/blocked-adult.html?check=1');
  const message = { type: 'blocked-page-ready', category: 'adult', rendered: true, mode: 'page' };
  await fixture.send(message, { url: 'chrome-extension://tinyshield-test/blocked-adult.html', tab: { id: 42 } });
  await fixture.send(message, { url: fixture.tabs[0].url, tab: { id: 90 } });
  await fixture.send({ ...message, rendered: false }, { url: fixture.tabs[0].url, tab: { id: 42 } });
  assert.equal(fixture.session[TEST_STATE_KEY].pages.adult.status, 'running');
  await fixture.send(message, { url: fixture.tabs[0].url, tab: { id: 42 } });
  let diagnostics = (await fixture.send({ type: 'get-diagnostics' })).diagnostics;
  assert.equal(diagnostics.pageChecks.adult.result, 'passed');
  assert.equal(diagnostics.categories.adult.result, 'not-run');
  assert.equal(diagnostics.categories.adult.ready, false);
  fixture.grant();
  await fixture.send({ type: 'save-settings', changes: { adultEnabled: true } });
  await fixture.send({ type: 'run-blocking-test', category: 'adult' }, { tab: { windowId: 7 } });
  assert.equal(fixture.tabs[1].windowId, 7);
  await fixture.send(message, { url: fixture.tabs[1].url, tab: { id: 43 } });
  diagnostics = (await fixture.send({ type: 'get-diagnostics' })).diagnostics;
  assert.equal(diagnostics.categories.adult.result, 'running');
  assert.equal(diagnostics.pageChecks.adult.result, 'passed');
});

test('private-window tests stay in that window and do not inherit normal-window passes', async () => {
  const fixture = makeChrome({ privateWindow: true });
  fixture.session[TEST_STATE_KEY] = { adult: { status: 'passed' } };
  await start(fixture);
  let diagnostics = (await fixture.send({ type: 'get-diagnostics' })).diagnostics;
  assert.equal(diagnostics.privateWindow, true);
  assert.equal(diagnostics.privateBrowsingMode, 'split');
  assert.equal(diagnostics.categories.adult.result, 'not-run');
  await fixture.send({ type: 'run-page-check', category: 'gambling' }, { tab: { windowId: 9 } });
  assert.equal(fixture.tabs[0].windowId, 9);
  assert.equal(fixture.session[`${TEST_STATE_KEY}:private`].pages.gambling.status, 'running');
  await fixture.send({ type: 'blocked-page-ready', category: 'gambling', rendered: true, mode: 'page' }, { url: fixture.tabs[0].url, tab: { id: 42 } });
  diagnostics = (await fixture.send({ type: 'get-diagnostics' })).diagnostics;
  assert.equal(diagnostics.pageChecks.gambling.result, 'passed');
  assert.deepEqual(fixture.session[TEST_STATE_KEY], { adult: { status: 'passed' } });
});

test('settings changed in another context reconcile filtering, including pause and resume', async () => {
  const fixture = makeChrome({ privateWindow: true });
  await start(fixture);
  fixture.grant();
  fixture.changeSettings({ adultEnabled: true });
  await fixture.send({ type: 'get-settings' });
  assert.ok(fixture.enabled().includes('adult_sites'));
  fixture.changeSettings({ enabled: false });
  await fixture.send({ type: 'get-settings' });
  assert.deepEqual(fixture.enabled(), []);
  fixture.changeSettings({ enabled: true });
  const resumed = await fixture.send({ type: 'get-settings' });
  assert.ok(fixture.enabled().includes('adult_sites'));
  assert.equal(resumed.status.ok, true);
});
