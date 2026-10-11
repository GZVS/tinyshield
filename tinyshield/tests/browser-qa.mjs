// Run locally after `npm install` and `npx playwright install chromium`.
// Requires a computer that can launch Chromium. No live adult/gambling sites are visited.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv.includes('--target=edge') ? 'edge' : 'chrome';
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'tinyshield-qa-'));
const extension = path.join(temporary, 'extension');
const output = path.resolve(process.env.QA_OUTPUT || path.join(root, '..', `tinyshield-browser-qa-${target}`));
await fs.cp(path.join(root, 'extension'), extension, { recursive: true });
await fs.mkdir(output, { recursive: true });

// Test-only manifest grants host access so automated QA does not click Chrome's
// permission dialog. Production keeps access optional. Verify denial/grant manually.
const manifestPath = path.join(extension, 'manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.version_name = `${manifest.version} (${target === 'edge' ? 'Microsoft Edge' : 'Chrome'})`;
manifest.host_permissions = ['http://*/*', 'https://*/*'];
await fs.writeFile(manifestPath, JSON.stringify(manifest));
let context;
const results = [];
const errors = [];
const consoleErrors = [];
const captureErrors = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
};
try {
  context = await chromium.launchPersistentContext(path.join(temporary, 'profile'), {
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : { channel: 'chromium' }),
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  context.on('page', captureErrors);
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 45000 });
  const origin = worker.url().replace('/background.js', '');
  const page = await context.newPage();
  await page.goto(`${origin}/popup.html`);
  await page.waitForFunction(() => !document.getElementById('protection').disabled);
  assert.equal(await page.title(), 'TinyShield');
  assert.equal(await page.getByRole('checkbox', { name: 'Block adult sites', exact: true }).isChecked(), false);
  await page.getByRole('checkbox', { name: 'Block ads', exact: true }).uncheck();
  await page.waitForFunction(() => !document.getElementById('protection').disabled);
  assert.ok(!(await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets())).includes('web_ads'));
  await page.getByRole('checkbox', { name: 'Block ads', exact: true }).check();
  await page.waitForFunction(() => !document.getElementById('protection').disabled);
  const activated = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'save-settings', changes: { adultEnabled: true, gamblingEnabled: true } }));
  assert.equal(activated.ok, true, activated.message);
  const enabled = await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
  assert.ok(enabled.includes('adult_sites') && enabled.includes('gambling_sites'));
  results.push('PASS: production static category lists indexed and enabled by Chromium');

  // Hypothetical matching tests do not send a request to any listed website.
  for (const category of ['adult', 'gambling']) {
    const rules = JSON.parse(await fs.readFile(path.join(extension, `rules-${category}.json`), 'utf8'));
    const domains = rules.flatMap(rule => rule.condition.requestDomains).filter(domain => !domain.endsWith('.tinyshield.test'));
    for (const index of [0, Math.floor(domains.length / 2), domains.length - 1]) {
      const match = await worker.evaluate(url => chrome.declarativeNetRequest.testMatchOutcome({ url, type: 'main_frame' }), `https://${domains[index]}/`);
      assert.ok(match.matchedRules.some(rule => rule.rulesetId === `${category}_sites`));
    }
  }
  results.push('PASS: hypothetical adult/gambling domain matches');

  const donation = page.getByRole('link', { name: 'Donate via PayPal' });
  assert.equal(await donation.getAttribute('href'), 'https://www.paypal.com/paypalme/Zacharidis');
  await page.locator('#protection').click();
  await page.waitForFunction(() => !document.getElementById('protection').disabled);
  assert.deepEqual(await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets()), []);
  await page.locator('#protection').click();
  await page.waitForFunction(() => !document.getElementById('protection').disabled);
  await page.screenshot({ path: path.join(output, '01-controls-1280x800.png') });
  results.push('PASS: toggle interaction, global pause/resume and donation destination');

  await page.goto(`${origin}/options.html`);
  await page.waitForFunction(() => !document.querySelector('input[data-setting="enabled"]').disabled);
  await page.screenshot({ path: path.join(output, '02-settings-1280x800.png') });
  await page.getByRole('textbox', { name: 'Website domain' }).fill('example.com/path');
  await page.getByRole('button', { name: 'Add website', exact: true }).click();
  assert.match(await page.locator('#feedback').innerText(), /only the domain/);
  await page.getByRole('textbox', { name: 'Website domain' }).fill('example.com');
  await page.getByRole('button', { name: 'Add website', exact: true }).click();
  await page.getByRole('button', { name: 'Remove example.com from allowed websites' }).waitFor();
  await page.locator('#allow-form').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, '03-exceptions-1280x800.png') });
  await page.getByRole('button', { name: 'Remove example.com from allowed websites' }).click();
  results.push('PASS: settings domain validation and add/remove exceptions');

  // Use the shipped static rules and built-in UI, with no injected redirect fixture.
  await page.goto(`${origin}/diagnostics.html`);
  for (const category of ['adult', 'gambling']) {
    await page.waitForFunction(category => !document.querySelector(`[data-page-test="${category}"]`).disabled, category);
    const nextPage = context.waitForEvent('page');
    await page.locator(`[data-page-test="${category}"]`).click();
    const local = await nextPage;
    await local.waitForURL(`${origin}/blocked-${category}.html?check=1`, { timeout: 15000 });
    assert.equal(await local.getByRole('heading', { name: 'This site is blocked' }).count(), 1);
    assert.match(await local.locator('#blocked-note').innerText(), /Page check only/);
    await page.waitForFunction(async category => {
      const response = await chrome.runtime.sendMessage({ type: 'get-diagnostics' });
      return response.diagnostics.pageChecks[category].result === 'passed'
        && response.diagnostics.categories[category].result === 'not-run';
    }, category);
    await local.close();
  }
  results.push('PASS: local-page checks render without counting as website redirects');
  for (const category of ['adult', 'gambling']) {
    await page.waitForFunction(category => !document.querySelector(`[data-test="${category}"]`).disabled, category);
    const nextPage = context.waitForEvent('page');
    await page.locator(`[data-test="${category}"]`).click();
    const blocked = await nextPage;
    await blocked.waitForURL(`${origin}/blocked-${category}.html`, { timeout: 15000 });
    assert.equal(await blocked.title(), 'Site blocked — TinyShield');
    assert.equal(await blocked.getByRole('heading', { name: 'This site is blocked' }).count(), 1);
    assert.equal((await blocked.locator('.reason').innerText()).trim(), category === 'adult' ? 'Adult content' : 'Gambling');
    assert.ok(await blocked.locator('.large-shield').evaluate(image => image.complete && image.naturalWidth > 0));
    assert.equal(await blocked.getByRole('link', { name: 'Visit GZVS on GitHub' }).getAttribute('href'), 'https://github.com/GZVS');
    await page.waitForFunction(async category => {
      const response = await chrome.runtime.sendMessage({ type: 'get-diagnostics' });
      return response.diagnostics.categories[category].result === 'passed';
    }, category);
    await blocked.screenshot({ path: path.join(output, category === 'adult' ? '04-adult-blocked-1280x800.png' : '05-gambling-blocked-1280x800.png') });
    await blocked.close();
  }
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('adult-result').dataset.result === 'passed' && document.getElementById('gambling-result').dataset.result === 'passed');
  await page.screenshot({ path: path.join(output, '06-blocking-tests-1280x800.png') });
  results.push('PASS: shipped static rules redirect both test domains and confirm visible rendering');

  // Pausing and exceptions must bypass the sentinel through the same production rules.
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'save-settings', changes: { enabled: false } }));
  let match = await worker.evaluate(() => chrome.declarativeNetRequest.testMatchOutcome({ url: 'https://adult.tinyshield.test/', type: 'main_frame' }));
  assert.equal(match.matchedRules.length, 0);
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'save-settings', changes: { enabled: true, allowedSites: ['tinyshield.test'] } }));
  const blockedTest = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'run-blocking-test', category: 'adult' }));
  assert.equal(blockedTest.ok, false);
  match = await worker.evaluate(() => chrome.declarativeNetRequest.testMatchOutcome({ url: 'https://adult.tinyshield.test/', type: 'main_frame' }));
  assert.ok(match.matchedRules.some(rule => rule.ruleId === 100000));
  assert.ok(!match.matchedRules.some(rule => rule.rulesetId === 'adult_sites'));
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'save-settings', changes: { allowedSites: [] } }));
  results.push('PASS: pause and website exceptions prevent category redirects');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/options.html`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  results.push('PASS: narrow layout and page console health');
  results.push(`Tested in Playwright Chromium with ${target} manifest; actual Chrome/Edge optional permission UI and policies require manual checks.`);
  await fs.writeFile(path.join(output, 'QA-results.txt'), results.join('\n') + '\n');
  console.log(results.join('\n'));
  console.log(`Live screenshots: ${output}`);
} catch (error) {
  await fs.writeFile(path.join(output, 'QA-failure.txt'), `${error.message}\nPage errors: ${JSON.stringify(errors)}\nConsole errors: ${JSON.stringify(consoleErrors)}\n`);
  throw error;
} finally {
  await context?.close();
  await fs.rm(temporary, { recursive: true, force: true });
}
