(() => {
  // TinyShield YouTube ad-cleanup helper (experimental)
  const cleanPlayerResponse = (data) => {
    if (!data || typeof data !== "object") return data;
    delete data.adPlacements;
    delete data.playerAds;
    delete data.adSlots;
    delete data.adBreakHeartbeatParams;
    return data;
  };

  try {
    const origParse = JSON.parse;
    JSON.parse = function(...args) {
      const result = origParse.apply(this, args);
      return cleanPlayerResponse(result);
    };
  } catch (e) {}

  // Skip video ad if player is in ad-showing state
  const checkAd = () => {
    const video = document.querySelector("video");
    const moviePlayer = document.querySelector("#movie_player");
    if (moviePlayer && moviePlayer.classList.contains("ad-showing") && video) {
      const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button");
      if (skipBtn) {
        skipBtn.click();
      } else if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
      }
    }
  };

  setInterval(checkAd, 500);
})();
