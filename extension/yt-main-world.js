(() => {
  // Zenith Guard YouTube Core Interceptor (runs in page's MAIN world context)
  const cleanData = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    delete obj.adPlacements;
    delete obj.playerAds;
    delete obj.adSlots;
    delete obj.adBreakHeartbeatParams;
    delete obj.adPlacementRenderer;
    delete obj.interstitial;

    // Clean streaming player response
    if (obj.playerResponse && typeof obj.playerResponse === "object") {
      cleanData(obj.playerResponse);
    }
    return obj;
  };

  // 1. Hook JSON.parse
  try {
    const originalParse = JSON.parse;
    JSON.parse = function (...args) {
      const data = originalParse.apply(this, args);
      return cleanData(data);
    };
  } catch (e) {}

  // 2. Hook window.fetch
  try {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

      if (url.includes("/youtubei/v1/player") || url.includes("/youtubei/v1/next")) {
        try {
          const clone = response.clone();
          const json = await clone.json();
          cleanData(json);
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch (err) {
          return response;
        }
      }
      return response;
    };
  } catch (e) {}

  // 3. Hook XMLHttpRequest for player endpoint
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._url = url;
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      if (typeof this._url === "string" && this._url.includes("/youtubei/v1/player")) {
        this.addEventListener("readystatechange", function () {
          if (this.readyState === 4 && this.status === 200) {
            try {
              const data = JSON.parse(this.responseText);
              cleanData(data);
              Object.defineProperty(this, "responseText", { value: JSON.stringify(data) });
              Object.defineProperty(this, "response", { value: JSON.stringify(data) });
            } catch (e) {}
          }
        });
      }
      return origSend.apply(this, args);
    };
  } catch (e) {}

  // 4. Hook ytInitialPlayerResponse
  try {
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get() {
        return _ytInitialPlayerResponse;
      },
      set(val) {
        _ytInitialPlayerResponse = cleanData(val);
      },
    });
    if (_ytInitialPlayerResponse) {
      _ytInitialPlayerResponse = cleanData(_ytInitialPlayerResponse);
    }
  } catch (e) {}
})();
