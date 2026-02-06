const STORAGE_KEY = "edge_notepad_text";
const editor = document.getElementById("editor");
const statusEl = document.getElementById("status");
const newSkipBtn = document.getElementById("newSkipBtn");
const exportSkipBtn = document.getElementById("exportSkipBtn");

let saveTimer = null;

// EXACT template (keeps your spacing using \n lines)
const NEW_SKIP_TEMPLATE =
  "NAME\n\n\n" +
  "ADDRESS\n\n\n" +
  "CLAIM\n\n\n" +
  "SSN #\n\n\n" +
  "DOB \n\n\n" +
  "AGE\n\n\n" +
  "WORK\n\n\n" +
  "REF/RELATIVES\n\n\n" +
  "PRIME/CELL\n\n\n";

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function loadText() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  const text = result[STORAGE_KEY] ?? "";
  editor.value = text;
  setStatus(text ? "Loaded" : "Ready");
}

async function saveTextNow() {
  const text = editor.value;
  await chrome.storage.local.set({ [STORAGE_KEY]: text });
  setStatus("Saved");
  setTimeout(() => setStatus("Ready"), 800);
}

function scheduleSave() {
  setStatus("Typing...");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTextNow().catch(() => setStatus("Save failed"));
  }, 400);
}

// New Skip button: wipe + replace with template (and save immediately)
newSkipBtn.addEventListener("click", async () => {
  editor.value = NEW_SKIP_TEMPLATE;
  editor.focus();
  editor.setSelectionRange(0, 0); // cursor at top
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: editor.value });
    setStatus("New Skip loaded");
    setTimeout(() => setStatus("Ready"), 800);
  } catch {
    setStatus("Save failed");
  }
});

editor.addEventListener("input", scheduleSave);

window.addEventListener("beforeunload", () => {
  chrome.storage.local.set({ [STORAGE_KEY]: editor.value });
});

loadText().catch(() => setStatus("Load failed"));
