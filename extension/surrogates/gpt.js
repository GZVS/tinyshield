// TinyShield Surrogate: Google Publisher Tag / gpt.js (MIT)
(() => {
  const noop = () => {};
  const service = {
    addEventListener: noop,
    enableServices: noop,
    setTargeting: () => service,
    clearTargeting: () => service,
    setCategoryExclusion: () => service,
    clearCategoryExclusions: () => service,
    collapseEmptyDivs: () => service
  };
  const slot = {
    addService: () => slot,
    defineSizeMapping: () => slot,
    setTargeting: () => slot,
    setCollapseEmptyDiv: () => slot,
    clearTargeting: () => slot,
    setCategoryExclusion: () => slot,
    clearCategoryExclusions: () => slot,
    renderEnded: noop
  };
  const googletag = window.googletag || {};
  googletag.cmd = googletag.cmd || [];
  googletag.defineSlot = () => slot;
  googletag.defineOutOfPageSlot = () => slot;
  googletag.display = noop;
  googletag.enableServices = noop;
  googletag.destroySlots = noop;
  googletag.pubads = () => service;
  googletag.pubadsReady = true;
  googletag.sizeMapping = () => ({ addSize: () => ({ build: () => [] }), build: () => [] });
  googletag.companionAds = () => service;
  window.googletag = googletag;
  if (Array.isArray(googletag.cmd)) {
    while (googletag.cmd.length > 0) {
      const fn = googletag.cmd.shift();
      if (typeof fn === "function") {
        try { fn(); } catch (e) {}
      }
    }
  }
  googletag.cmd.push = function(fn) {
    if (typeof fn === "function") {
      try { fn(); } catch (e) {}
    }
    return 1;
  };
})();
