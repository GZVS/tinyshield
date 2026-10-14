// TinyShield Surrogate: Amazon apstag (MIT)
(() => {
  const apstag = window.apstag || {};
  const noop = () => {};
  apstag.init = noop;
  apstag.fetchBids = (config, callback) => {
    if (typeof callback === "function") {
      try { callback([]); } catch (e) {}
    }
  };
  apstag.setDisplayBids = noop;
  apstag.targetingKeys = () => [];
  window.apstag = apstag;
})();
