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
      settings?.cosmeticEnabled !== false &&
      !allowed;
    document.documentElement?.setAttribute(
      "data-tinyshield-cleanup",
      active ? "on" : "off",
    );
  };
  apply({ enabled: true, cosmeticEnabled: true });
  chrome.storage.local
    .get(KEY)
    .then((result) => apply(result[KEY] || { enabled: true, cosmeticEnabled: true }))
    .catch(() => apply({ enabled: true, cosmeticEnabled: true }));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]?.newValue)
      apply(changes[KEY].newValue);
  });
})();
