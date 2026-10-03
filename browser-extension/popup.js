document.addEventListener("DOMContentLoaded", async () => {
  const tokenInput = document.getElementById("apiToken");
  const saveBtn = document.getElementById("saveBtn");
  const statusBadge = document.getElementById("statusBadge");

  const { apiToken } = await chrome.storage.local.get(["apiToken"]);
  if (apiToken) {
    tokenInput.value = apiToken;
    statusBadge.textContent = "Active";
    statusBadge.style.background = "#065f46";
    statusBadge.style.color = "#34d399";
  } else {
    statusBadge.textContent = "Token Needed";
    statusBadge.style.background = "#7f1d1d";
    statusBadge.style.color = "#f87171";
  }

  saveBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    await chrome.storage.local.set({ apiToken: token, apiBaseUrl: "http://127.0.0.1:8001" });
    saveBtn.textContent = "Saved!";
    setTimeout(() => {
      saveBtn.textContent = "Save Settings";
    }, 1500);
  });
});
