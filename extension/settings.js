export const SETTINGS_KEY = "tinyShieldSettings";
export const STATUS_KEY = "tinyShieldStatus";
export const MAX_ALLOWED_SITES = 200;
export const WEBSITE_ORIGINS = ["http://*/*", "https://*/*"];
export const DEFAULTS = Object.freeze({
  enabled: true,
  adsEnabled: true,
  trackersEnabled: true,
  cosmeticEnabled: true,
  youtubeEnabled: false,
  adultEnabled: false,
  gamblingEnabled: false,
  extensiveEnabled: true,
  extAds: true,
  extTrackers: true,
  extThreats: true,
  extAnnoyances: true,
  extUrlCleaning: true,
  extSurrogates: true,
  extCosmetic: true,
  extYouTube: false,
  allowedSites: [],
});
export const RULESET_IDS = [
  "web_ads",
  "trackers",
  "youtube_ads",
  "adult_sites",
  "gambling_sites",
  "ext_ads",
  "ext_trackers",
  "ext_threats",
  "ext_annoyances",
  "ext_privacy",
  "ext_surrogates",
];

export function normalizeDomain(input) {
  const text = String(input || "").trim();
  if (!text) throw new Error("Enter a website domain.");
  let url;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    throw new Error("Enter a valid domain, like example.com.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Enter only the domain, such as example.com.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname.includes(".") ||
    hostname.length > 253 ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname
      .split(".")
      .some(
        (label) =>
          !label ||
          label.length > 63 ||
          !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
  )
    throw new Error("Enter a valid website domain, like example.com.");
  return hostname;
}

export function cleanSettings(value = DEFAULTS) {
  const sites = [];
  for (const input of Array.isArray(value.allowedSites)
    ? value.allowedSites
    : []) {
    if (typeof input !== "string") continue;
    try {
      const domain = normalizeDomain(input);
      if (!sites.includes(domain)) sites.push(domain);
    } catch {
      /* Invalid legacy entries are ignored. */
    }
    if (sites.length === MAX_ALLOWED_SITES) break;
  }
  return {
    enabled: value.enabled !== false,
    adsEnabled: value.adsEnabled !== false,
    trackersEnabled: value.trackersEnabled !== false,
    cosmeticEnabled: value.cosmeticEnabled !== false,
    youtubeEnabled: value.youtubeEnabled === true,
    adultEnabled: value.adultEnabled === true,
    gamblingEnabled: value.gamblingEnabled === true,
    extensiveEnabled: value.extensiveEnabled !== false,
    extAds: value.extAds !== false,
    extTrackers: value.extTrackers !== false,
    extThreats: value.extThreats !== false,
    extAnnoyances: value.extAnnoyances !== false,
    extUrlCleaning: value.extUrlCleaning !== false,
    extSurrogates: value.extSurrogates !== false,
    extCosmetic: value.extCosmetic !== false,
    extYouTube: value.extYouTube === true,
    allowedSites: sites,
  };
}

export function enabledRulesets(settings) {
  if (!settings.enabled) return [];
  const rulesets = [
    ...(settings.adsEnabled ? ["web_ads"] : []),
    ...(settings.trackersEnabled ? ["trackers"] : []),
    ...(settings.youtubeEnabled ? ["youtube_ads"] : []),
    ...(settings.adultEnabled ? ["adult_sites"] : []),
    ...(settings.gamblingEnabled ? ["gambling_sites"] : []),
  ];
  if (settings.extensiveEnabled) {
    if (settings.extAds !== false) rulesets.push("ext_ads");
    if (settings.extTrackers !== false) rulesets.push("ext_trackers");
    if (settings.extThreats !== false) rulesets.push("ext_threats");
    if (settings.extAnnoyances !== false) rulesets.push("ext_annoyances");
    if (settings.extUrlCleaning !== false) rulesets.push("ext_privacy");
    if (settings.extSurrogates !== false) rulesets.push("ext_surrogates");
  }
  return rulesets;
}

export function buildAllowRules(sites) {
  return sites.slice(0, MAX_ALLOWED_SITES).flatMap((domain, index) => [
    {
      id: 100000 + index,
      priority: 10000,
      action: { type: "allowAllRequests" },
      condition: { requestDomains: [domain], resourceTypes: ["main_frame"] },
    },
    {
      id: 101000 + index,
      priority: 10000,
      action: { type: "allow" },
      condition: {
        initiatorDomains: [domain],
        excludedResourceTypes: ["main_frame"],
      },
    },
  ]);
}
