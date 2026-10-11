import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, cleanSettings, enabledRulesets } from '../extension/settings.js';
import { TESTS, blockingChecks, sameRulesets, testStateKey } from '../extension/diagnostics-core.js';

const active = cleanSettings({ ...DEFAULTS, adultEnabled: true, gamblingEnabled: true });
const actual = enabledRulesets(active, true);

test('diagnostics require permission, protection, enabled rules and no exception before navigation', () => {
  assert.equal(blockingChecks(active, true, actual, { ok: true }).categories.adult.ready, true);
  for (const diagnostic of [
    blockingChecks(active, false, actual, { ok: true }),
    blockingChecks({ ...active, enabled: false }, true, [], { ok: true }),
    blockingChecks(active, true, ['web_ads', 'trackers'], { ok: true }),
    blockingChecks(active, true, actual, { ok: false, message: 'Startup failed' }),
    blockingChecks({ ...active, allowedSites: ['tinyshield.test'] }, true, actual, { ok: true }),
    blockingChecks(active, true, actual.filter(id => id !== 'trackers'), { ok: true }),
  ]) assert.equal(diagnostic.categories.adult.ready, false);
});

test('unconfirmed and successful rendering remain distinct; exported results omit tab IDs', () => {
  const pending = { adult: { status: 'running', startedAt: 100, tabId: 5 } };
  const waiting = blockingChecks(active, true, actual, { ok: true }, pending, 11000);
  assert.equal(waiting.categories.adult.result, 'running');
  const timeout = blockingChecks(active, true, actual, { ok: true }, pending, 13001);
  assert.equal(timeout.categories.adult.result, 'unconfirmed');
  const passed = blockingChecks(active, true, actual, { ok: true }, { adult: { status: 'passed' } });
  assert.equal(passed.categories.adult.result, 'passed');
  assert.ok(!JSON.stringify(waiting).includes('tabId'));
  assert.ok(!JSON.stringify(waiting).includes('startedAt'));
});

test('ruleset confirmation ignores ordering but rejects missing or duplicate IDs', () => {
  assert.equal(sameRulesets(['adult_sites', 'web_ads'], ['web_ads', 'adult_sites']), true);
  assert.equal(sameRulesets(['web_ads', 'web_ads'], ['web_ads', 'adult_sites']), false);
  assert.equal(sameRulesets([], actual), false);
  assert.equal(new URL(`https://${TESTS.adult.domain}/`).hostname, 'adult.tinyshield.test');
});

test('page check timeouts and private session keys do not leak into redirect success', () => {
  const pending = { pages: { adult: { status: 'running', startedAt: 100, tabId: 8 } } };
  const timeout = blockingChecks(active, true, actual, { ok: true }, pending, 13001);
  assert.equal(timeout.pageChecks.adult.result, 'unconfirmed');
  assert.equal(timeout.categories.adult.result, 'not-run');
  const pagePass = blockingChecks(active, true, actual, { ok: true }, { pages: { adult: { status: 'passed' } } });
  assert.equal(pagePass.pageChecks.adult.result, 'passed');
  assert.equal(pagePass.categories.adult.result, 'not-run');
  assert.ok(!JSON.stringify(timeout).includes('tabId'));
  assert.ok(!JSON.stringify(timeout).includes('startedAt'));
  assert.notEqual(testStateKey(false), testStateKey(true));
});
