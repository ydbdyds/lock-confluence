const STORAGE_KEY_MANUAL = "manualOverride";

const $ = (id) => document.getElementById(id);

const setBool = (el, v) => {
  el.textContent = v ? "是" : "否";
  el.classList.toggle("on", v);
  el.classList.toggle("off", !v);
};

const refresh = async () => {
  const { manualOverride = "auto" } = await chrome.storage.local.get([STORAGE_KEY_MANUAL]);
  $("btnAuto").classList.toggle("active", manualOverride === "auto");
  $("btnOn").classList.toggle("active", manualOverride === "on");
  $("btnOff").classList.toggle("active", manualOverride === "off");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    const status = await chrome.tabs.sendMessage(tab.id, { type: "get-status" });
    if (status) {
      $("lockState").textContent = status.locked ? "已锁定" : "未锁定";
      $("lockState").classList.toggle("on", status.locked);
      $("lockState").classList.toggle("off", !status.locked);
      setBool($("urlHint"), status.urlLooksLikeEdit);
      setBool($("domHint"), status.editorDomPresent);
    }
  } catch {
    $("lockState").textContent = "未注入（非 Confluence 页面）";
    $("lockState").classList.add("off");
    $("urlHint").textContent = "—";
    $("domHint").textContent = "—";
  }
};

const setMode = async (mode) => {
  await chrome.storage.local.set({ [STORAGE_KEY_MANUAL]: mode });
  refresh();
};

document.addEventListener("DOMContentLoaded", () => {
  $("btnAuto").addEventListener("click", () => setMode("auto"));
  $("btnOn").addEventListener("click", () => setMode("on"));
  $("btnOff").addEventListener("click", () => setMode("off"));
  refresh();
});
