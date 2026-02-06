const STORAGE_KEY = "edge_notepad_text";

// --- Delvepoint: auto-select search options on the reSearch page ---
const RESEARCH_PATH_INCLUDES = "/Luna/DSUIServicesApplicationUI/searchTypes/reSearch";

function isReSearchPage() {
  return location.href.includes(RESEARCH_PATH_INCLUDES);
}

function setSelectByOptionText(selectEl, wantedText) {
  const options = Array.from(selectEl.options);
  const match = options.find(o => (o.textContent || "").trim() === wantedText);
  if (!match) return false;

  selectEl.value = match.value;

  // Trigger the site's dynamic UI updates
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function setSelectByValue(selectEl, wantedValue) {
  const options = Array.from(selectEl.options);
  const match = options.find(o => o.value === wantedValue);
  if (!match) return false;

  selectEl.value = wantedValue;
  selectEl.dispatchEvent(new Event("input", { bubbles: true }));
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function autoConfigureSearchFlow() {
  if (!isReSearchPage()) return;

  // Step 1: Search Group = People
  const group = document.querySelector("#searchTypeGroup");
  if (!group) return;

  // If already set, don't spam events
  if (group.value !== "People") {
    const okGroup = setSelectByValue(group, "People");
    if (!okGroup) return;
  }

  // Step 2: Search Type = Advanced Person Search Plus (appears dynamically)
  const type = document.querySelector("#searchTypeHash");
  if (!type) return;

  // Only select if not already chosen
  const wantedTypeText = "Advanced Person Search Plus";
  const currentText = (type.options[type.selectedIndex]?.textContent || "").trim();
  if (currentText !== wantedTypeText) {
    const okType = setSelectByOptionText(type, wantedTypeText);
    if (!okType) return;
  }

  // Step 3: Click Next (appears dynamically)
  const nextBtn = document.querySelector("#nextBtn");
  if (!nextBtn) return;

  // Click only once per page load
  if (document.documentElement.dataset.dpAutoNextClicked === "1") return;
  document.documentElement.dataset.dpAutoNextClicked = "1";

  nextBtn.click();
}


// Keep the exact spacing style you already use
function buildSkipTemplate({ name = "", address = "", ssn = "", dob = "", age = "", phones = "" }) {
  return (
    "NAME\n" +
    (name ? `${name}\n` : "\n") +
    "\n" +
    "ADDRESS\n" +
    (address ? `${address}\n` : "\n") +
    "\n" +
    "CLAIM\n\n\n" +
    "SSN #\n" +
    (ssn ? `${ssn}\n` : "\n") +
    "\n" +
    "DOB \n" +
    (dob ? `${dob}\n` : "\n") +
    "\n" +
    "AGE\n" +
    (age ? `${age}\n` : "\n") +
    "\n\n" +
    "WORK\n\n\n" +
    "REF/RELATIVES\n\n\n\n" +
    "PRIME/CELL\n" +
    (phones ? `${phones}\n` : "\n")
  );
}

function ensureTemplate(text) {
  // If user already has something, keep it. If empty, create blank template.
  if (typeof text === "string" && text.trim().length > 0) return text;
  return buildSkipTemplate({});
}

function normalizeText(s) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function getHeaderCriteriaValues(personEl) {
  // In your markup, the header criteriaPointData holds: Name, SSN, DOB
  const header = personEl.querySelector(".index-card.searchMain > .card-header");
  if (!header) return { name: "", ssn: "", dob: "", age: "" };

  const values = Array.from(header.querySelectorAll(".criteriaPointData"))
    .map(el => normalizeText(el.textContent))
    .filter(Boolean);

  const name = values[0] || "";
  const ssn = values[1] || "";
  const dob = values[2] || "";

  // Age appears in header text like "(51)" after DOB.
  // Grab the first (...) that looks like a number.
  const headerText = header.textContent || "";
  const ageMatch = headerText.match(/\((\d{1,3})\)/);
  const age = ageMatch ? ageMatch[1] : "";

  return { name, ssn, dob, age };
}

function getFirstAddress(personEl) {
  // First address is the first .summary-card.address .full .criteriaPointData
  const addr = personEl.querySelector(".summary-card.address .full .criteriaPointData");
  return normalizeText(addr?.textContent || "");
}

function getPhones(personEl) {
  // Each phone line has .summary-card.phones .full .criteriaPointData
  const phoneEls = Array.from(personEl.querySelectorAll(".summary-card.phones .full .criteriaPointData"));
  const numbers = phoneEls
    .map(el => normalizeText(el.textContent))
    .filter(Boolean);

  // Deduplicate while preserving order
  const seen = new Set();
  const unique = [];
  for (const n of numbers) {
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
  }

  // Put each number on its own line under PRIME/CELL
  return unique.join("\n");
}

function replacePrimeCellSection(text, phonesBlock) {
  
  const re = /(^PRIME\/CELL\s*\n)([\s\S]*)$/m;
  if (re.test(text)) {
    return text.replace(re, (_, head) => {
      const body = phonesBlock ? `${phonesBlock}\n` : "\n";
      return head + body;
    });
  }
  // If label not found, just append it (fallback)
  return text.trimEnd() + `\n\nPRIME/CELL\n${phonesBlock}\n`;
}

// Adds the "Creeate Skip" button for the person
function injectButtonsIntoPerson(personEl) {
  if (personEl.dataset.skipButtonsInjected === "1") return;

  // Get person card header
  const cardHeader = personEl.querySelector(".index-card.searchMain > .card-header");
  if (!cardHeader) { 
    console.log("Error loading header")
    return;
  } 

  // Put buttons in the existing card-tools area (right side)
  let tools = cardHeader.querySelector(".card-tools");
  if (!tools) {
    tools = document.createElement("span");
    tools.className = "card-tools";
    cardHeader.appendChild(tools);
  }


  // Create skip button
  const createSkipBtn = document.createElement("button");
  createSkipBtn.type = "button";
  createSkipBtn.textContent = "Create Skip";
  createSkipBtn.style.cssText =
    "margin-left:8px;padding:4px 8px;font-size:12px;border:1px solid rgba(255, 0, 0, 0.45);border-radius:8px;background:transparent;cursor:pointer;";
  createSkipBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    const { name, ssn, dob, age } = getHeaderCriteriaValues(personEl);
    const address = getFirstAddress(personEl);
    const phones = getPhones(personEl);

    const newText = buildSkipTemplate({
      name,
      address,
      ssn,
      dob,
      age,
      phones
    });

    await chrome.storage.local.set({ [STORAGE_KEY]: newText });
    createSkipBtn.textContent = "Saved!";
    setTimeout(() => (createSkipBtn.textContent = "Add to Skip"), 900);
  });

  tools.appendChild(createSkipBtn);

  personEl.dataset.skipButtonsInjected = "1";
}

// Scan site for all people
function scanAndInject() {
  const people = document.querySelectorAll('div[id^="person_"]');
  people.forEach(injectButtonsIntoPerson);
}

// Initial pass
scanAndInject();
autoConfigureSearchFlow();

// If results load dynamically, keep watching
const observer = new MutationObserver(() => {
  scanAndInject();
  autoConfigureSearchFlow();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
