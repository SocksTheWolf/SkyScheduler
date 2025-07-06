function pushToast(msg, isSuccess) {
  Toastify({
    text: msg,
    style: {
      background: isSuccess ? 'green' : 'red'
    }
  }).showToast();
}

document.addEventListener("showDeleteMsg", function(evt) {
  pushToast("Post deleted", true);
});