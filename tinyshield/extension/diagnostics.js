const $ = (id) => document.getElementById(id);
let diagnostics;
let busy = false;
let pollTimer;

function feedback(message, error = false) {
  $("diagnostic-feedback").textContent = message;
  $("diagnostic-feedback").classList.toggle("error", error);
}
async function send(type, extra = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...extra });
  if (!response?.ok) throw new Error(response?.message || "The browser could not complete this check.");
  return response;
}
function render() {
  if (!diagnostics) return;
  $("health-checks").replaceChildren(...diagnostics.checks.map((check) => {
    const item = document.createElement("li");
    item.className = check.ok ? "check-pass" : "check-fail";
    const label = document.createElement("strong");
    label.textContent = `${check.ok ? "✓" : "!"} ${check.label}`;
    const detail = document.createElement("span");
    detail.textContent = check.detail;
    item.append(label, detail);
    return item;
  }));
  for (const [category, state] of Object.entries(diagnostics.categories)) {
    document.querySelector(`[data-test="${category}"]`).disabled = busy || !state.ready;
    $(`${category}-ready`).textContent = state.detail;
    $(`${category}-result`).dataset.result = state.result;
    $(`${category}-result`).textContent = `${state.result === "passed" ? "Passed" : state.result === "unconfirmed" ? "Needs checking" : state.result === "running" ? "Running" : "Not tested"}: ${state.message}`;
    const page = diagnostics.pageChecks[category];
    document.querySelector(`[data-page-test="${category}"]`).disabled = busy || page.result === "running";
    $(`${category}-page-result`).dataset.result = page.result;
    $(`${category}-page-result`).textContent = `${page.result === "passed" ? "Passed" : page.result === "unconfirmed" ? "Needs checking" : page.result === "running" ? "Running" : "Not tested"}: ${page.message}`;
  }
  $("diagnostic-version").textContent = `Version ${diagnostics.version}`;
  $("diagnostic-context").textContent = diagnostics.privateWindow ? "Private window" : "Normal window";
  $("repair-filters").disabled = busy;
  $("refresh-checks").disabled = busy;
}
async function refresh() {
  clearTimeout(pollTimer);
  try {
    diagnostics = (await send("get-diagnostics")).diagnostics;
    render();
    if ([...Object.values(diagnostics.categories), ...Object.values(diagnostics.pageChecks)].some((state) => state.result === "running")) pollTimer = setTimeout(refresh, 1000);
  } catch (error) {
    document.querySelectorAll("[data-test], [data-page-test]").forEach((button) => { button.disabled = true; });
    feedback(error.message, true);
  }
}
$("refresh-checks").addEventListener("click", refresh);
$("repair-filters").addEventListener("click", async () => {
  busy = true; render();
  try { await send("repair-filters"); feedback("Filters reapplied and verified by your browser."); }
  catch (error) { feedback(error.message, true); }
  finally { busy = false; await refresh(); }
});
document.querySelectorAll("[data-test]").forEach((button) => {
  button.addEventListener("click", async () => {
    busy = true; render();
    try { await send("run-blocking-test", { category: button.dataset.test }); feedback("The test opened in a new tab. Return here to see its result."); }
    catch (error) { feedback(error.message, true); }
    finally { busy = false; await refresh(); }
  });
});
document.querySelectorAll("[data-page-test]").forEach((button) => {
  button.addEventListener("click", async () => {
    busy = true; render();
    try { await send("run-page-check", { category: button.dataset.pageTest }); feedback("The page check opened in a new tab. Return here to see its result."); }
    catch (error) { feedback(error.message, true); }
    finally { busy = false; await refresh(); }
  });
});
$("export-diagnostics").addEventListener("click", () => {
  if (!diagnostics) return;
  const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tinyshield-diagnostics.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback("Diagnostics exported. The file contains filter checks and test results, with no browsing history.");
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
window.addEventListener("pagehide", () => clearTimeout(pollTimer));
refresh();
