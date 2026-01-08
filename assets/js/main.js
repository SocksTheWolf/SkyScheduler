function pushToast(msg, isSuccess) {
  Toastify({
    text: msg,
    duration: !isSuccess ? 10000 : Toastify.defaults.duration,
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

document.addEventListener("postDeleted", function() {
  pushToast("Post deleted", true);
});

document.addEventListener("postFailedDelete", function() {
  pushToast("Post failed to delete, try again", false);
  refreshPosts();
});

document.addEventListener("timeSidebar", function() {
  updateAllTimes();
});

document.addEventListener("postUpdatedNotice", function() {
  pushToast("Post updated successfully!", true);
})

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

const domainRegex = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const linkRegex = /(?:^.*\/profile\/)([0-9a-zA-Z\-\.]+)(?:\/post\/\w+)?(?:\/)?$/g;
function updateUsername(val) {
  // Remove this bullshit unicode thing that gets injected on usernames if you copy them
  // from the bsky website, why the fuck did they do this?
  let inputData = val.replace(/[^\x00-\x7F]/g, "").replace("@", "");
  // prevent the did:plc: logic from appearing in the field
  if (inputData.includes("did:plc:")) {
    pushToast("Invalid link posted, does not have handle in it", false);
    return "";
  }
  // Convert urls into handles
  var matches = linkRegex.exec(inputData);
  if (matches != null && matches.length >= 2) {
    // was a URL, convert to handle
    return matches[1];
  }
  // was something else, check if we need to add .bsky.social
  if (!inputData.match(domainRegex)) {
    const newName = inputData + ".bsky.social";
    if (newName.match(domainRegex)) {
      return newName;
    }
  }
  return inputData;
}
function addUsernameFieldWatchers() {
  const userEl = document.getElementById("username");
  if (userEl !== null) {
    userEl.value = "";
    userEl.addEventListener("change", ev => {
      ev.preventDefault();
      userEl.value = updateUsername(userEl.value);
    });

    userEl.addEventListener("paste", ev => {
      ev.preventDefault();
      userEl.value = updateUsername(ev.clipboardData.getData("text"));
    });
  }
}
function addCounter(textField, counter, maxLength) {
  const textEl = document.getElementById(textField);
  const counterEl = document.getElementById(counter);
  if (counterEl) {
    // escape out of adding a counter more than once
    if (counterEl.hasAttribute("counting"))
      return;

    const handleCount = (counter) => {
      counterEl.innerHTML = `${counter.all}/${maxLength}`;
      // Show red color if the text field is too long, this will not be super accurate on items containing links, but w/e
      if (counter.all > maxLength) {
        counterEl.classList.add('tooLong');
      } else {
        counterEl.classList.remove('tooLong');
      }
    };

    Countable.on(textEl, handleCount);
    counterEl.setAttribute("counting", true);
    counterEl.addEventListener("reset", () => {
      counterEl.innerHTML = `0/${maxLength}`;
      counterEl.classList.remove('tooLong');
    });
    counterEl.addEventListener("recount", () => {
      Countable.count(textEl, handleCount);
    });
  }
}

function recountCounter(counter) {
  const counterEl = document.getElementById(counter);
  counterEl.dispatchEvent(new Event("recount"));
}

function resetCounter(counter) {
  const counterEl = document.getElementById(counter);
  counterEl.dispatchEvent(new Event("reset"));
}

function redirectAfterDelay(url) {
  setTimeout(function() {
    window.location.href = url;
  }, 1200);
}

function translateErrorObject(obj, defaultString) {
  let errData = defaultString;
  // If we have a json object in the error message field
  var hasJsonErr = false;
  try {
    errData = JSON.parse(obj.message);
    hasJsonErr = true;
  } catch {
    if (obj.message !== null)
      errData = obj.message;
  }
  // Check to see if we even have anything.
  if (hasJsonErr) {
    var combinedErrors = "";
    for (error of errData)
      combinedErrors += `${error.message}\n`;
    errData = combinedErrors;
  }
  return `Error Occurred!\n----\n${errData}`;
}

function rawSubmitHandler(url, successCallback) {
  const loadingBar = document.getElementById("loading");
  const loginForm = document.getElementById('loginForm');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingBar.removeAttribute("hidden");
    submitButton.setAttribute("disabled", true);
    let postObject = {};
    document.querySelectorAll("input").forEach((el) => {
      if (el.getAttribute("type") === "checkbox")
        postObject[el.name] = el.checked;
      else
        postObject[el.name] = el.value;
    });
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postObject)
      });
      loadingBar.setAttribute("hidden", true);

      if (response.ok) {
        successCallback();
        return;
      } else {
        const data = await response.json();
        pushToast(translateErrorObject(data, data.msg), false);
      }
    } catch (err) {
      pushToast("An error occurred", false);
      console.error(err);
    }
    loadingBar.setAttribute("hidden", true);
    submitButton.removeAttribute("disabled");
  });
}

function easySetup(url, successMessage, successLocation) {
  addUsernameFieldWatchers();
  rawSubmitHandler(url, function() {
    pushToast(successMessage, true);
    redirectAfterDelay(successLocation);
  });
}

function addEasyModalOpen(buttonID, modalEl, closeButtonID) {
  document.getElementById(buttonID).addEventListener("click", (ev) => {
    ev.preventDefault();
    clearSettingsData();
    openModal(modalEl);
  });
  document.getElementById(closeButtonID).addEventListener("click", (ev) => {
    ev.preventDefault();
    closeModal(modalEl);
  });
}