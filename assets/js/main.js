/* Functions that can be used anywhere on the website. */
function pushToast(msg, isSuccess) {
  var newToast = Toastify({
    text: msg,
    stopOnFocus: false,
    ariaLive: true,
    avatar: !isSuccess ? "/icons/warning.svg" : "/icons/success.svg",
    duration: !isSuccess ? 10000 : Toastify.defaults.duration,
    style: {
      "padding-left": "12px",
      background: isSuccess ? 'green' : 'red'
    },
    close: false,
    onClick: () => {
      newToast.hideToast();
    },
  });
  newToast.showToast();
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToObject(el) {
  if (el) {
    el.scroll({top:0, behavior:'smooth'});
    const tabInvalidate = el.querySelector(".invalidateTab");
    if (tabInvalidate) {
      tabInvalidate.focus();
      tabInvalidate.blur();
    }
  }
}

function addKeyboardListener(el, callback, keys=["Enter", " "], preventDefault=true) {
  el.addEventListener("keydown", (ev) => {
    if (keys.includes(ev.key)) {
      if (preventDefault)
        ev.preventDefault();
      callback(ev);
    }
  });
}
function addClickKeyboardListener(el, callback, keys=["Enter", " "], preventDefault=true) {
  el.addEventListener("click", (ev) => {
    if (preventDefault)
      ev.preventDefault();
    callback(ev);
  });
  addKeyboardListener(el, callback, keys, preventDefault);
}

function pushDeletedAccountToast() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('deleted')) {
    pushToast("Account deleted!", true);
  }
}
setTimeout(pushDeletedAccountToast, 1500);

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

function redirectAfterDelay(url, customDelay=0) {
  setTimeout(function() {
    window.location.href = url;
  }, customDelay != 0 ? customDelay : 1200);
}

function translateErrorObject(obj, defaultString) {
  let errData = defaultString;
  // If we have a json object in the error message field
  var hasJsonErr = false;
  try {
    errData = JSON.parse(obj.message || obj.msg);
    hasJsonErr = true;
  } catch {
    if (obj.message !== null && obj.message !== undefined)
      errData = obj.message;
    else if (obj.msg !== null && obj.msg !== undefined)
      errData = obj.msg;
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

function easySetup(url, successMessage, successLocation, customDelay=0) {
  addUsernameFieldWatchers();
  rawSubmitHandler(url, function() {
    pushToast(successMessage, true);
    if (successLocation !== "")
      redirectAfterDelay(successLocation, customDelay);
  });
}
