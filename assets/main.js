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

function refreshPosts() {
  document.getElementById("refresh-posts-force").click();
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

document.addEventListener("refreshPosts", function(ev) {
  refreshPosts();
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

function addCounter(textField, counter) {
  const textEl = document.getElementById(textField);
  const counterEl = document.getElementById(counter);

  Countable.on(textEl, counter => {
    counterEl.innerHTML = counter.all + "/" + MAX_LENGTH; 
    // Show red color if the text field is too long, this will not be super accurate on items containing links, but w/e
    // The other thing to note is that this app will attempt to split up long text into a tweet thread for you.
    if (counter.all > MAX_LENGTH) {
      counterEl.classList.add('tooLong');
    } else {
      counterEl.classList.remove('tooLong');
    }
  });
}
