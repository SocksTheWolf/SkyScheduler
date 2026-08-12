const repostForm = document.getElementById("repostForm");
const repostTitle = document.getElementById("repostTitle");
const repostTitleSection = document.getElementById("repostTitleSection");
const repostRecordURL = document.getElementById("repostRecordURL");
const repostCycleOptions = document.getElementById("makeRepostOptions");
const existingPostId = document.getElementById("postBaseInfo");
const retweetFields = document.getElementById("retweetFields");
const repostTime = document.getElementById("repostTime");

document.addEventListener("resetRepost", () => {
  repostForm.reset();
  repostForm.removeAttribute("disabled");
  showRepostProgress(false);
  setElementVisible(retweetFields, true);
  setElementVisible(repostTitleSection, true);
  setElementDisabled(repostTitle, false);
  setElementDisabled(cancelScheduledRepostsBtn, false);
  repostTitle.value = "";
  repostRecordURL.value = "";
  setSelectDisable(repostCycleOptions.parentElement, true);
  setElementVisible(cancelScheduledRepostsBtn.parentElement, false);
  repostCycleOptions.checked = false;
  repostTime.value = "";
  setNextAvailMinPostingTime(repostTime, true);
  if (existingPostId.hasAttribute("data-id")) {
    const highlight = getPostListElement(existingPostId.getAttribute("data-id"));
    if (highlight) {
      highlight.classList.remove("highlight-repost");
    }
  }
  existingPostId.removeAttribute("data-id");
});

repostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showRepostProgress(true);
  const scheduledDateVal = repostTime.value;
  const postRecordVal = repostRecordURL.value;
  const invalidPostURL = () => {
    pushToast("Invalid post URL", false);
    showRepostProgress(false);
  }
  try {
    new URL(postRecordVal);
  } catch(urlErr) {
    invalidPostURL();
    return;
  }
  let dateTime;
  try {
    dateTime = new Date(scheduledDateVal).toISOString();
  } catch(dateErr) {
    pushToast("Invalid date", false);
    showRepostProgress(false);
    return;
  }

  const postObject = {
    scheduledDate: dateTime,
    data: {
      type: 0
    }
  };

  if (existingPostId.hasAttribute("data-id")) {
    postObject.data = {
      type: 2,
      id: existingPostId.getAttribute("data-id")
    }
  } else {
    postObject.data = {
      url: postRecordVal,
      type: 1
    };
    // Push any names we have for the post here too
    if (repostTitle.value !== "" && isElementVisible(repostTitleSection)) {
      postObject.data.content = repostTitle.value;
    }
    // Check to see if url can match with our regex
    if (!ATPROTO_RECORD_REGEX.test(postRecordVal)) {
      invalidPostURL();
      return;
    }
    // test will tell us if this group will fail
    const {account, postid} = ATPROTO_RECORD_REGEX.exec(postRecordVal).groups;
    if (account === undefined || postid === undefined) {
      invalidPostURL();
      return;
    }
    const didResponse = await getAccountHandle(account);
    if (didResponse === null) {
      pushToast("Unable to infer account poster at this time", false);
      showRepostProgress(false);
      return;
    }
    postObject.data.uri = `at://${didResponse}/app.bsky.feed.post/${postid}`;
    const cidFetch = await getPostCID(didResponse, postid);
    if (cidFetch === null) {
      pushToast("Unable to infer post records at this time, double check URL", false);
      showRepostProgress(false);
      return;
    }
    postObject.data.cid = cidFetch;
  }

  // Add repost data if we should be making reposts
  if (repostCycleOptions.checked) {
    const repostValues = repostCycleOptions.parentElement.querySelectorAll("select");
    postObject.repostData = {
      hours: repostValues[0].value,
      times: repostValues[1].value
    };
  }

  const payload = JSON.stringify(postObject);
  const response = await fetch('/post/create/repost', {
    method: 'POST',
    headers: {'Content-Type': 'application/json' },
    body: payload
  });
  const data = await response.json();

  if (response.ok) {
    pushToast(data.msg, true);
    document.dispatchEvent(new Event("resetRepost"));
    setTimeout(scrollContentTop, 400);
    refreshPosts();
  } else {
    pushToast(translateErrorObject(data, data.error?.message || data.error || "An Error Occurred"), false);
    showRepostProgress(false);
  }
});

document.addEventListener("addNewRepost", (ev) => {
  if (document.getElementById("makingRepostRequest").hasAttribute("aria-busy")) {
    return;
  }
  // reset us first
  document.dispatchEvent(new Event("resetRepost"));

  const postHeader = ev.detail.target;
  const postURIHolder = postHeader.parentElement.querySelector(".postLink:not([hidden])");
  const postBodyHolder = postHeader.parentElement.querySelector(".postText");
  const postFooterTime = postHeader.parentElement.querySelector(".timestamp");
  const isScheduled = postHeader.hasAttribute("data-scheduled");
  let canPost = false;
  if (postURIHolder) {
    setElementVisible(repostTitleSection, true);
    setElementDisabled(repostTitle, false);
    const postURI = postURIHolder.getAttribute("href");
    const isExistingRepost = postHeader.hasAttribute("data-repost");
    if (isExistingRepost) {
      repostTitle.value = (postBodyHolder) ? postBodyHolder.innerText.trim() : "";
    } else {
      setElementVisible(repostTitleSection, false);
      setElementDisabled(repostTitle, true);
      repostTitle.value = "";
    }
    repostRecordURL.value = postURI;
    canPost = true;
  } else if (isScheduled) {
    const postId = postHeader.getAttribute("data-item");
    existingPostId.setAttribute("data-id", postId);
    const highlight = getPostListElement(postId);
    if (highlight) {
      highlight.classList.add("highlight-repost");
    }
    setElementVisible(retweetFields, false);
    setElementVisible(cancelScheduledRepostsBtn.parentElement, true);
    canPost = true;
  }
  if (contentTabs !== null && canPost) {
    contentTabs.switchTab("dashtabs", 1);
    scrollToObject(repostRecordURL);
    scrollContentTop();
    // Set the schedule time for nice UX reasons
    let newTimeValue = null;
    if (!isScheduled)
      newTimeValue = getNextAvailPostingTime(true);
    else if (postFooterTime.hasAttribute("data-convertedtime"))
      newTimeValue = postFooterTime.getAttribute("data-convertedtime");

    if (newTimeValue !== null) {
      repostTime.setAttribute("min", newTimeValue);
      repostTime.value = newTimeValue;
    }
  } else {
    pushToast("cannot add reposts to this post", false);
  }
});


function showRepostProgress(shouldShow) {
  const el = document.getElementById("makingRepostRequest");
  if (shouldShow) {
    el.setAttribute("aria-busy", true);
  } else {
    el.removeAttribute("aria-busy");
  }
  setElementDisabled(el, shouldShow);
  setElementDisabled(postForm, shouldShow);
  setElementDisabled(cancelScheduledRepostsBtn, shouldShow);
  if (shouldShow) {
    el.textContent = "Scheduling Retweets...";
  } else {
    el.textContent = "Schedule Retweet";
  }
}