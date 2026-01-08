function handleResetLoad() {
  if (resetToken = new URLSearchParams(window.location.search).get("token")) {
    document.getElementById("resetToken").value = encodeURI(resetToken);
    const submitButton = document.getElementById("submitButton");
    submitButton.removeAttribute("disabled");
  } else {
    pushToast("Reset token is invalid! Request a new reset token to continue", false);
  }
}
handleResetLoad();