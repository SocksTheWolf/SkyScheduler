function clearSettingsData() {
  document.querySelectorAll("#changeInfo input").forEach((el) => el.value = "");
  document.querySelectorAll("#deleteAccount input").forEach((el) => el.value = "");
  document.getElementById("accountResponse").innerHTML = "";
  document.getElementById("accountDeleteResponse").innerHTML = "";
}

function setupSettings() {
  const changeInfoModal = document.getElementById("changeInfo");
  const deleteAccountModal = document.getElementById("deleteAccount");
  if (changeInfoModal) {
    changeInfoModal.addEventListener("close", clearSettingsData);
    addEasyModalOpen("settingsButton", changeInfoModal, "closeSettingsButton");
  }
  if (deleteAccountModal) {
    deleteAccountModal.addEventListener("close", clearSettingsData);
    addEasyModalOpen("deleteAccountButton", deleteAccountModal, "closeDeleteButton");
  }
}

addUsernameFieldWatchers();
setupSettings();
