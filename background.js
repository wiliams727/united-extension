const EDITOR_URL = "editor.html";
const WINDOW_NAME = "edge-notepad-window";

chrome.action.onClicked.addListener(async () => {
  // If already open, focus it.
  const windows = await chrome.windows.getAll({ populate: true });
  const existing = windows.find(w =>
    w.type === "popup" &&
    w.tabs?.some(t => t.url && t.url.includes(EDITOR_URL))
  );

  if (existing?.id) { 
    await chrome.windows.update(existing.id, { focused: true });
    return;
  }

  // Otherwise create a new popup window.
  await chrome.windows.create({
    url: chrome.runtime.getURL(EDITOR_URL),
    type: "popup",
    width: 700,
    height: 800,
    focused: true
  });
});
