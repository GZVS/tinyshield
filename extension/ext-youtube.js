(() => {
  // TinyShield YouTube High-Speed Ad Skipper & Shield
  let wasMuted = false;
  let isSpeedBoosted = false;

  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-slot button",
    "button.ytp-ad-skip-button",
    ".ytp-ad-overlay-close-button",
    ".ytp-ad-overlay-close-container button",
  ];

  const handleVideoAd = () => {
    const moviePlayer = document.querySelector("#movie_player, .html5-video-player");
    const video = document.querySelector("video");

    const isAdShowing =
      moviePlayer?.classList.contains("ad-showing") ||
      moviePlayer?.classList.contains("ad-interrupting") ||
      Boolean(document.querySelector(".ytp-ad-player-overlay, .video-ads .ytp-ad-module"));

    if (isAdShowing && video) {
      // 1. Mute audio during ad so the user hears nothing
      if (!video.muted) {
        wasMuted = false;
        video.muted = true;
      }

      // 2. Click any skip button immediately
      for (const selector of SKIP_SELECTORS) {
        const btn = document.querySelector(selector);
        if (btn && typeof btn.click === "function") {
          btn.click();
          break;
        }
      }

      // 3. Fast-forward and jump to end of ad
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.playbackRate = 16;
        isSpeedBoosted = true;
        video.currentTime = video.duration;
      }
    } else if (isSpeedBoosted && video) {
      // Restore normal playback speed and audio when ad ends
      isSpeedBoosted = false;
      video.playbackRate = 1;
      if (!wasMuted) {
        video.muted = false;
      }
    }

    // 4. Close any overlay / banner ads
    const overlayClose = document.querySelector(".ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container button");
    if (overlayClose && typeof overlayClose.click === "function") {
      overlayClose.click();
    }

    // 5. Dismiss any anti-adblock modals & resume playback
    const enforcement = document.querySelector("ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)");
    if (enforcement) {
      enforcement.remove();
      if (video && video.paused) {
        video.play();
      }
    }
  };

  // Run at 50ms interval for instantaneous response
  setInterval(handleVideoAd, 50);

  // Also hook MutationObserver on document
  const observer = new MutationObserver(handleVideoAd);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    });
  }
})();
