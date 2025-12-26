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

document.addEventListener("showDeleteMsg", function(evt) {
  pushToast("Post deleted", true);
});

document.addEventListener("timeSidebar", function(ev) {
  updateAllTimes();
});

document.addEventListener("accountUpdated", function(ev) {
  closeModal(document.getElementById("changeInfo"));
  document.getElementById("settingsData").reset();
  const violations = document.getElementById("violationBar");
  if (violations) {
    violations.setAttribute("hidden", "true");
  }
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
  if (userEl !== null) {
    userEl.value = "";
    userEl.addEventListener("change", ev => {
      ev.preventDefault();
      userEl.value = userEl.value.replace(/[^\x00-\x7F]/g, "");
    });
  }
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

function resetCounter(counter) {
  const counterEl = document.getElementById(counter);
  counterEl.innerHTML = 0 + "/" + MAX_LENGTH;
  counterEl.classList.remove('tooLong');
}

function redirectAfterDelay(url) {
  setTimeout(function() {
    window.location.href = url;
  }, 2000);
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
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingBar.removeAttribute("hidden");
    let postObject = {};
    document.querySelectorAll("input").forEach((el) => {
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

      // Hide loading bar after delay
      setTimeout(function() {
        loadingBar.setAttribute("hidden", true);
      }, 1000);

      if (response.ok)
        successCallback();
      else {
        const data = await response.json();
        pushToast(translateErrorObject(data, data.msg), false);
      }
    } catch (err) {
      pushToast("An error occurred", false);
      console.error(err);
    }
  });
}

function easySetup(url, successMessage, successLocation) {
  addUnicodeRemoval();
  rawSubmitHandler(url, function() {
    pushToast(successMessage, true);
    redirectAfterDelay(successLocation);
  });
}