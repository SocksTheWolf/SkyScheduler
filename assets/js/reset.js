document.addEventListener("DOMContentLoaded", () => {
  const searchParams = new URLSearchParams(window.location.search);
  const resetToken = searchParams.get("token");
  if (resetToken !== null) {
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
});