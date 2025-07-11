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

document.addEventListener("accountUpdated", function(ev) {
  closeModal(document.getElementById("changeInfo"));
  document.getElementById("settingsData").reset();
  pushToast("Settings Updated!", true);
});

document.addEventListener("accountDeleted", function(ev) {
  pushToast("Account deleted!", true);
});

// Remove this bullshit unicode thing that gets injected on usernames if you copy them
// from the bsky website, why the fuck did they do this?
function addUnicodeRemoval() {
  const userEl = document.getElementById("username");
  userEl.value = "";
  userEl.addEventListener("change", ev => {
    ev.preventDefault();
    userEl.value = userEl.value.replace(/[^\x00-\x7F]/g, "");
  });
}
