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
      settings?.extensiveEnabled === true &&
      settings?.extCosmetic !== false &&
      !allowed;
    document.documentElement?.setAttribute(
      "data-tinyshield-ext",
      active ? "on" : "off",
    );
  };
  apply({ enabled: false });
  chrome.storage.local
    .get(KEY)
    .then((result) => apply(result[KEY] || {}))
    .catch(() => apply({ enabled: false }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]?.newValue)
      apply(changes[KEY].newValue);
  });
})();
