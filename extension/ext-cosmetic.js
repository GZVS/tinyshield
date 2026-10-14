(() => {
  const KEY = "tinyShieldSettings";
  const apply = (settings) => {
    const host = location.hostname.toLowerCase();
    const allowed =
      Array.isArray(settings?.allowedSites) &&
      settings.allowedSites.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      );
    const active =
      settings?.enabled !== false &&
      settings?.extensiveEnabled !== false &&
      settings?.extCosmetic !== false &&
      !allowed;
    document.documentElement?.setAttribute(
      "data-tinyshield-ext",
      active ? "on" : "off",
    );
  };
  apply({ enabled: true, extensiveEnabled: true, extCosmetic: true });
  chrome.storage.local
    .get(KEY)
    .then((result) => apply(result[KEY] || { enabled: true, extensiveEnabled: true, extCosmetic: true }))
    .catch(() => apply({ enabled: true, extensiveEnabled: true, extCosmetic: true }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]?.newValue)
      apply(changes[KEY].newValue);
  });
})();
