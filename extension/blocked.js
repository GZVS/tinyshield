const category = document.body.dataset.category;
const preview = new URLSearchParams(location.search).has("preview");
const pageCheck = new URLSearchParams(location.search).get("check") === "1";
if (preview) document.getElementById("blocked-note").textContent = "Preview only — no website was blocked.";
else if (pageCheck) document.getElementById("blocked-note").textContent = "Page check only — no website was blocked.";

document.getElementById("go-back").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else location.replace(chrome.runtime.getURL("options.html"));
});

// A registered test tab can confirm rendering; normal blocked visits create no logs.
if (!preview) {
  const shield = document.querySelector(".large-shield");
  shield.decode().then(async () => {
    const rendered = document.querySelector("h1")?.textContent === "This site is blocked"
      && document.querySelector(".reason")?.textContent.trim() === (category === "adult" ? "Adult content" : category === "gambling" ? "Gambling" : "Dangerous site")
      && document.getElementById("github-link")?.href === "https://github.com/GZVS"
      && shield.naturalWidth > 0;
    await chrome.runtime.sendMessage({ type: "blocked-page-ready", category, rendered, mode: pageCheck ? "page" : "redirect" });
  }).catch(() => { /* The static page still works if the worker is unavailable. */ });
}
