function pushToast(msg, isSuccess) {
  Toastify({
    text: msg,
    style: {
      background: isSuccess ? 'green' : 'red'
    }
  }).showToast();
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

function updateAllTimes() {
  document.querySelectorAll(".timestamp").forEach(el => {
    if (el.hasAttribute("corrected"))
      return;
    
    el.innerHTML = formatDate(el.innerHTML);
    el.setAttribute("corrected", true);
  });
}

document.addEventListener("showDeleteMsg", function(evt) {
  pushToast("Post deleted", true);
});

document.addEventListener("timeSidebar", function(ev) {
  updateAllTimes();
});