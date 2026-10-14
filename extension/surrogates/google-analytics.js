// TinyShield Surrogate: Google Analytics (MIT)
(() => {
  const noop = () => {};
  const ga = function() {
    for (let i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] === "function") {
        try { arguments[i](); } catch (e) {}
      }
    }
  };
  ga.q = [];
  ga.l = Date.now();
  ga.loaded = true;
  ga.create = () => ({ get: noop, set: noop, send: noop });
  ga.getByName = () => null;
  ga.getAll = () => [];
  ga.remove = noop;
  window.ga = window.ga || ga;
  window._gaq = window._gaq || [];
  window._gaq.push = function(args) {
    if (typeof args === "function") {
      try { args(); } catch (e) {}
    }
  };
})();
