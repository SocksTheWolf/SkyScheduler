/* Functions that are mostly used on the application side of things */
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

document.addEventListener("postDeleted", function() {
  pushToast("Post deleted", true);
});

document.addEventListener("postFailedDelete", function() {
  pushToast("Post failed to delete, try again", false);
  refreshPosts();
});

document.addEventListener("timeSidebar", function() {
  updateAllTimes();
  document.querySelectorAll(".addThreadPost[listen=false]").forEach(el => {
    addClickKeyboardListener(el, () => {
      const threadEvent = new CustomEvent('replyThreadCreate', {
        detail: {
          target: el.parentElement
      }});
      document.dispatchEvent(threadEvent);
    });
    el.setAttribute("listen", true);
  });
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