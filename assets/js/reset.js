function handleResetLoad() {
  if (resetToken = new URLSearchParams(window.location.search).get("token")) {
    const resetTokenField = document.getElementById("resetToken");
    const submitButton = document.querySelector('button[type="submit"]');
    if (resetTokenField && submitButton) {
      resetTokenField.value = encodeURI(resetToken);
      submitButton.removeAttribute("disabled");
    }
    else
      pushToast("Page is malformed, please clear cache and refresh", false);
  } else {
    pushToast("Reset token is invalid! Request a new reset token to continue", false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  handleResetLoad();
});