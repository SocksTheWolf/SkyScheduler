/* Functions & vars that are mostly used on the application side of things */
var contentTabs = null;
function getPostListElement(itemID) {
  return document.getElementById(`post-${itemID}`);
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

    el.textContent = formatDate(el.innerText);
    el.setAttribute("corrected", true);
  });
  document.querySelectorAll(".repostTimesLeft").forEach(el => {
    if (el.hasAttribute("data-tooltip"))
      return;

    if (el.firstElementChild.className == "repostInfoData") {
      const repostInformation = el.firstElementChild.innerText;
      if (repostInformation.length > 0)
        el.setAttribute("data-tooltip", repostInformation);
    }
  });
}

function scrollToPost(id) {
  const postElement = getPostListElement(id);
  if (postElement) {
    postElement.scrollIntoView({behavior: "smooth", container: "nearest", block: "nearest", inline: "start" });
  }
}

function refreshPostTimer() {
  console.log("ready to set post timer now");
  // Call refresh posts every hour
  setInterval(refreshPosts, 3600000);
  // refresh the post once
  refreshPosts();
}

function refreshPosts() {
  htmx.trigger("body", "refreshPosts");
}

document.addEventListener("scrollTop", function() {
  scrollTop();
});

document.addEventListener("scrollListTop", function() {
  scrollToObject(document.getElementById("posts"));
});

document.addEventListener("scrollListToPost", function(ev) {
  scrollToPost(ev.detail);
});

document.addEventListener("postDeleted", function(ev) {
  const type = ev.detail ? "Repost" : "Post";
  pushToast(`${type} deleted`, true);
});

document.addEventListener("postFailedDelete", function() {
  pushToast("Post failed to delete, try again", false);
  refreshPosts();
});

function sidebarButtonListener(className, eventName) {
  document.querySelectorAll(`${className}[listen=false]`).forEach(el => {
    addClickKeyboardListener(el, () => {
      const buttonEvent = new CustomEvent(eventName, {
        detail: {
          target: el.parentElement
      }});
      document.dispatchEvent(buttonEvent);
    });
    el.setAttribute("listen", true);
  });
}

document.addEventListener("timeSidebar", function() {
  updateAllTimes();
  sidebarButtonListener(".addThreadPost", "replyThreadCreate");
  sidebarButtonListener(".addRepostsButton", "addNewRepost");
});

document.addEventListener("postUpdatedNotice", function() {
  pushToast("Post updated successfully!", true);
})

document.addEventListener("accountUpdated", function(ev) {
  closeModal(document.getElementById("changeInfo"));
  document.getElementById("settingsData").reset();
  pushToast("Settings Updated!", true);
});

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

function addEasyModalOpen(buttonID, modalEl, closeButtonID) {
  addClickKeyboardListener(document.getElementById(buttonID), () => {
    clearSettingsData();
    openModal(modalEl);
  });
  addClickKeyboardListener(document.getElementById(closeButtonID), () => {
    closeModal(modalEl);
  });
}

function setElementRequired(el, required) {
  if (required)
    el.setAttribute("required", true);
  else
    el.removeAttribute("required");
}

function isElementVisible(el) {
  return !el.classList.contains("hidden");
}

function setElementVisible(el, shouldShow) {
  if (shouldShow)
    el.classList.remove("hidden");
  else
    el.classList.add("hidden");
}

function setElementDisabled(el, disabled) {
  if (disabled)
    el.setAttribute("disabled", true);
  else
    el.removeAttribute("disabled");
}

function convertTimeValueLocally(number) {
  const date = new Date(number);
  date.setMinutes(0 - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
}

function getScheduleTimeForNextHour() {
  // set current time to value of now + 1 hour
  const curDate = new Date();
  curDate.setHours(curDate.getHours() + 1);
  return convertTimeValueLocally(curDate);
}

function setupDashboard() {
  const keys = ["Enter", " "];
  document.querySelectorAll(".autoRepostBox").forEach(el => {
    addClickKeyboardListener(el, (e) => {
      setSelectDisable(e.target.parentElement, !e.target.checked);
    }, keys, false);
    if (el.getAttribute("startchecked") == "true") {
      setSelectDisable(el.parentElement, false);
    }
  });

  // find the post time scheduler object
  document.querySelectorAll(".scheduledDateBlock").forEach(el => {
    const dateScheduler = el.querySelector(".timeSelector");
    const scheduledPostNowBox = el.querySelector(".postNow");

    // rounddown minutes
    dateScheduler.addEventListener('change', () => {
      dateScheduler.value = convertTimeValueLocally(dateScheduler.value);
    });

    // push a minimum date to make it easier (less chance of typing 2025 by accident)
    dateScheduler.setAttribute("min", getScheduleTimeForNextHour());

    if (scheduledPostNowBox) {
      addClickKeyboardListener(scheduledPostNowBox, () => {
        const isChecked = scheduledPostNowBox.checked;
        setElementRequired(dateScheduler, !isChecked);
        setElementVisible(dateScheduler, !isChecked);
        setElementVisible(dateScheduler.nextElementSibling, !isChecked);
      }, keys, false);
    }
  });

  // look for the url card box and setup listeners
  const urlCardBox = document.getElementById('urlCard');
  if (urlCardBox) {
    urlCardBox.addEventListener("paste", () => {
      showContentLabeler(true);
      setElementVisible(sectionImageAttach, false);
    });

    urlCardBox.addEventListener("input", (ev) => {
      const isNotEmpty = ev.target.value.length > 0;
      showContentLabeler(isNotEmpty);
      setElementVisible(sectionImageAttach, !isNotEmpty);
    });
  } else {
    console.warn("Missing URLCard box");
  }

  // Handle character counting
  addCounter("content", "count", MAX_LENGTH);
  addCounter("altTextField", "altTextCount", MAX_ALT_LENGTH);

  // Add mentions to the main post field
  tributeToElement(content);
  // add event for the cancel thread button
  if (cancelThreadBtn) {
    addClickKeyboardListener(cancelThreadBtn, () =>
      {document.dispatchEvent(new Event("resetPost")) });
  }
  // fire the events to keep our data nice and updated
  document.dispatchEvent(new Event("timeSidebar"));
  // Clean all pages to defaults
  document.dispatchEvent(new Event("resetPost"));
  document.dispatchEvent(new Event("resetRepost"));
};

// go.
document.addEventListener("DOMContentLoaded", () => {
  setupDashboard();
  // set up timer to update the post list
  const timeUntilNextHour = 3600000 - new Date().getTime() % 3600000;
  console.log(`Will run refresh timer in ${timeUntilNextHour}ms`);
  setTimeout(refreshPostTimer, timeUntilNextHour);

  contentTabs = new PicoTabs('[role="tablist"]');
});