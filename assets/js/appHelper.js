/* Functions & vars that are mostly used on the application side of things */
var contentTabs = null;
var refreshTimer;
function getPostListElement(itemID) {
  return document.getElementById(`post-${itemID}`);
}

function formatDate(date) {
  const useDate = (date instanceof Date) ? date : new Date(date);
  return useDate.toLocaleString(undefined, {
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

    const timestampDate = new Date(el.innerText);
    el.setAttribute("data-originaltime", timestampDate.toISOString());
    el.setAttribute("data-convertedtime", convertTimeValueLocally(timestampDate));
    el.textContent = formatDate(timestampDate);
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

function refreshPostTimer() {
  console.log("ready to set post timer now");
  clearTimeout(refreshTimer);
  // Call refresh posts every hour
  refreshTimer = setInterval(refreshPosts, 3600000);
  // refresh the post once
  refreshPosts();
}

function setPostTimerForNearestHour() {
  clearTimeout(refreshTimer);
  // set up timer to update the post list
  const timeUntilNextHour = 3600000 - new Date().getTime() % 3600000;
  console.log(`Will run refresh timer in ${timeUntilNextHour}ms`);
  refreshTimer = setTimeout(refreshPostTimer, timeUntilNextHour);
}

function refreshPosts() {
  htmx.trigger("body", "refreshPosts");
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

function scrollToPost(id) {
  const postElement = getPostListElement(id);
  if (postElement) {
    postElement.scrollIntoView({behavior: "smooth", container: "nearest", block: "nearest", inline: "start" });
  }
}

function scrollContentTop() {
  document.getElementById("appView").scrollIntoView();
}

document.addEventListener("scrollContentTop", function() {
  scrollContentTop();
});

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
  const type = ev.detail.value ? "Retweet" : "Post";
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

document.addEventListener("updateTimestamps", function() {
  updateAllTimes();
});

document.addEventListener("sidebarButtons", function() {
  sidebarButtonListener(".addThreadPost", "replyThreadCreate");
  sidebarButtonListener(".addRepostsButton", "addNewRepost");
});

document.addEventListener("showRepostPopover", function() {
  const popover = document.getElementById("repostDataPopover");

  // controls to close the popover
  addClickKeyboardListener(document.getElementById("click-close"), function() {
    popover.hidePopover();
  });

  // add confirmation notices to all reposts
  document.querySelectorAll(".repost-editor-item").forEach((el) => {
    if (!el.lastElementChild.hasAttribute("hx-confirm")) {
      const cleanedTimestamp = el.firstElementChild.innerText;
      el.lastElementChild.setAttribute("hx-confirm",
        `Are you sure you want to delete the repost series at ${cleanedTimestamp}?`);
    }
  });

  // force open the popover
  popover.showPopover();

  // Clean up the popover when it goes away (add event listener after open)
  popover.addEventListener("beforetoggle", function(ev) {
    ev.preventDefault();
    // Force get rid of all of these holders
    document.querySelectorAll("#repostDataPopoverHolder").forEach((el) => {
      document.body.removeChild(el);
    });
    refreshPosts();
  });
});

document.addEventListener("repostScheduleDeleted", function() {
  pushToast("Schedule deleted", true);
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

function localTimeChange(date) {
  date.setMinutes(0 - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
}

function convertTimeValueLocally(number) {
  // this is a destructive operation,
  // so we'll take whatever the input is and make a new object
  localTimeChange(new Date(number));
}

function getScheduleTimeForNextHour() {
  // set current time to value of now + 1 hour
  const curDate = new Date();
  curDate.setHours(curDate.getHours() + 1);
  return localTimeChange(curDate);
}

function showContentLabeler(shouldShow) {
  const contentLabelSelector = document.getElementById("content-label-selector");
  const contentLabelSelect = document.getElementById("contentLabels");
  const urlEmbedBox = document.getElementById('urlCard');

  if (!shouldShow && (fileData.length > 0 || urlEmbedBox.value.length > 0))
    return;

  setElementVisible(contentLabelSelector, shouldShow);
  setElementRequired(contentLabelSelect, shouldShow);
  if (!shouldShow)
    contentLabelSelect.value = "";
}

function setSelectDisable(nodeBase, disable) {
  nodeBase.querySelectorAll("select:not(#contentLabels)").forEach(
    (el) => setElementDisabled(el, disable));
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

  // Mobile scroll button functionality
  if (scrollBtn = document.querySelector(".scrollBtn")) {
    addClickKeyboardListener(scrollBtn, (e) => {
      e.preventDefault();
      scrollContentTop();
    });
  }

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
  // add event for cancel future scheduled retweet
  if (cancelScheduledRepostsBtn) {
    addClickKeyboardListener(cancelScheduledRepostsBtn, () =>
      {document.dispatchEvent(new Event("resetRepost")) });
  }
  // fire the events to keep our data nice and updated
  document.dispatchEvent(new Event("updateTimestamps"));
  document.dispatchEvent(new Event("sidebarButtons"));
  // Clean all pages to defaults
  document.dispatchEvent(new Event("resetPost"));
  document.dispatchEvent(new Event("resetRepost"));
};

// go.
document.addEventListener("DOMContentLoaded", () => {
  setupDashboard();
  setPostTimerForNearestHour();

  contentTabs = new PicoTabs('[role="tablist"]');

  if (URLBooster = new URLSearchParams(window.location.search)) {
    if (URLBooster.has("retweet")) {
      contentTabs.switchTab("dashtabs", 1);
      scrollContentTop();
    } else if (URLBooster.has("post")) {
      contentTabs.switchTab("dashtabs", 0);
      scrollContentTop();
    }
  }
  // if we have violations scroll over to them
  if (violationBar = document.getElementById("violationBar")) {
    violationBar.scrollIntoView();
  }
});