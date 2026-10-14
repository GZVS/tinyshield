import {
  SETTINGS_KEY,
  STATUS_KEY,
  WEBSITE_ORIGINS,
  DEFAULTS,
  cleanSettings,
  normalizeDomain,
  MAX_ALLOWED_SITES,
} from "./settings.js";
const $ = (id) => document.getElementById(id);
let settings = cleanSettings(DEFAULTS);
let busy = false;
let loaded = false;
let protectionHealthy = true;
let currentWindowId;
function feedback(message, error = false) {
  $("feedback").textContent = message;
  $("feedback").classList.toggle("error", error);
}
function render() {
  document.querySelectorAll("input[data-setting]").forEach((input) => {
    const key = input.dataset.setting;
    input.checked = Boolean(settings[key]);
    const isExtSub = key.startsWith("ext") && key !== "extensiveEnabled";
    input.disabled =
      busy ||
      (!settings.enabled && key !== "enabled") ||
      (isExtSub && !settings.extensiveEnabled);
  });
  if ($("protection")) {
    const active =
      protectionHealthy && settings.enabled &&
      (settings.adsEnabled ||
        settings.trackersEnabled ||
        settings.youtubeEnabled ||
        settings.adultEnabled ||
        settings.gamblingEnabled ||
        settings.cosmeticEnabled ||
        settings.extensiveEnabled);
    $("protection").dataset.active = String(active);
    $("protection").setAttribute("aria-pressed", String(settings.enabled));
    $("protection").setAttribute(
      "aria-label",
      settings.enabled
        ? "Pause all TinyShield protection"
        : "Resume TinyShield protection",
    );
    $("protection").disabled = busy;
    $("protection-label").textContent = !loaded
      ? "Checking protection…"
      : !protectionHealthy
      ? "Protection needs attention"
      : !settings.enabled
      ? "Protection is paused"
      : active
        ? "Protection is on"
        : "All filters are off";
  }
  if ($("allowed-sites")) {
    const list = $("allowed-sites");
    list.replaceChildren();
    $("allow-empty").hidden = settings.allowedSites.length > 0;
    for (const domain of settings.allowedSites) {
      const row = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = domain;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Remove";
      remove.setAttribute(
        "aria-label",
        `Remove ${domain} from allowed websites`,
      );
      remove.disabled = busy;
      remove.addEventListener("click", () =>
        save(
          {
            allowedSites: settings.allowedSites.filter(
              (site) => site !== domain,
            ),
          },
          `${domain} removed.`,
        ),
      );
      row.append(text, remove);
      list.append(row);
    }
  }
}
async function save(changes, message = "Settings saved.") {
  busy = true;
  render();
  try {
    const response = await chrome.runtime.sendMessage({
      type: "save-settings",
      changes,
    });
    if (!response?.ok)
      throw new Error(response?.message || "Could not apply filters.");
    settings = cleanSettings(response.settings);
    protectionHealthy = response.status?.ok !== false;
    feedback(message);
  } catch (error) {
    feedback(error.message, true);
  } finally {
    loaded = true;
    busy = false;
    render();
  }
}
document.querySelectorAll("input[data-setting]").forEach((input) => {
  input.addEventListener("change", async () => {
    const key = input.dataset.setting;
    const checked = input.checked;
    await save(
      { [key]: checked },
      checked ? "Filter enabled." : "Filter turned off.",
    );
  });
});
$("protection")?.addEventListener("click", () =>
  save(
    { enabled: !settings.enabled },
    settings.enabled ? "All filters paused." : "Protection resumed.",
  ),
);
$("settings-button")?.addEventListener("click", () =>
  chrome.runtime.openOptionsPage(),
);
$("open-panel")?.addEventListener("click", async () => {
  try {
    if (!chrome.sidePanel?.open || currentWindowId === undefined) throw new Error("Use Settings in this browser; the sidebar is unavailable.");
    await chrome.sidePanel.open({ windowId: currentWindowId });
  } catch (error) {
    feedback(error.message, true);
  }
});
$("allow-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const domain = normalizeDomain($("domain-input").value);
    if (settings.allowedSites.includes(domain))
      throw new Error("This domain is already allowed.");
    if (settings.allowedSites.length >= MAX_ALLOWED_SITES)
      throw new Error("Remove an allowed website before adding another.");
    await save(
      { allowedSites: [...settings.allowedSites, domain] },
      `${domain} and its subdomains are allowed through all TinyShield filters.`,
    );
    if (settings.allowedSites.includes(domain)) $("domain-input").value = "";
  } catch (error) {
    feedback(error.message, true);
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SETTINGS_KEY]?.newValue) {
    settings = cleanSettings(changes[SETTINGS_KEY].newValue);
    render();
  }
  if (changes[STATUS_KEY]?.newValue) {
    protectionHealthy = changes[STATUS_KEY].newValue.ok !== false;
    if (!protectionHealthy) feedback(changes[STATUS_KEY].newValue.message, true);
    render();
  }
});
(async () => {
  busy = true;
  render();
  try {
    const response = await chrome.runtime.sendMessage({ type: "get-settings" });
    if (!response?.ok)
      throw new Error(response?.message || "Could not load settings.");
    settings = cleanSettings(response.settings);
    protectionHealthy = response.status?.ok !== false;
    if (response.status?.ok === false) feedback(response.status.message, true);
  } catch (error) {
    protectionHealthy = false;
    feedback(error.message, true);
  } finally {
    loaded = true;
    busy = false;
    render();
  }
})();

if ($("open-panel")) {
  $("open-panel").hidden = !chrome.sidePanel?.open;
  $("open-panel").disabled = true;
  if (chrome.sidePanel?.open) chrome.windows.getCurrent().then((window) => {
    currentWindowId = window.id;
    $("open-panel").disabled = false;
  }).catch(() => { $("open-panel").hidden = true; });
}
