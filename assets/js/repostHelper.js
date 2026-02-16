const repostForm = document.getElementById("repostForm");
const repostRecordURL = document.getElementById("repostRecordURL");

async function getAccountHandle(account) {
  if (account.match(/did\:plc\:/i)) {
    return account;
  }
  const lookupRequest = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${account}`);
  if (lookupRequest.ok) {
    const response = await lookupRequest.json();
    if (response.hasOwnProperty("did")) {
      return response.did;
    }
  }
  return null;
}

async function getPostCID(account, postid) {
  const cidResponse = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?collection=app.bsky.feed.post&repo=${account}&rkey=${postid}`);
  if (cidResponse.ok) {
    const response = await cidResponse.json();
    if (response.hasOwnProperty("cid"))
      return response.cid;
  }
  return null;
}

document.addEventListener("resetRepost", () => {
  repostForm.reset();
  repostForm.removeAttribute("disabled");
  showRepostProgress(false);
  repostRecordURL.value = "";
});

repostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showRepostProgress(true);
  const scheduledDateVal = document.getElementById("repostTime").value;
  const postRecordVal = repostRecordURL.value;
  let dateTime;
  try {
    dateTime = new Date(scheduledDateVal).toISOString();
  } catch(dateErr) {
    pushToast("Invalid date", false);
    showRepostProgress(false);
    return;
  }

  const postObject = {
    url: postRecordVal,
    scheduledDate: dateTime
  };

  // Add repost data if we should be making reposts
  const repostCycleOptions = document.getElementById("makeRepostOptions");
  if (repostCycleOptions.checked) {
    const repostValues = repostCycleOptions.parentElement.querySelectorAll("select");
    postObject.repostData = {
      hours: repostValues[0].value,
      times: repostValues[1].value
    };
  }

  const {account, postid} = ATPROTO_RECORD_REGEX.exec(postRecordVal)?.groups;
  if (account === undefined || postid === undefined) {
    pushToast("URL provided is invalid!", false);
    showRepostProgress(false);
    return;
  }
  const didResponse = await getAccountHandle(account);
  if (didResponse === null) {
    pushToast("Unable to infer account poster at this time", false);
    showRepostProgress(false);
    return;
  }
  postObject.uri = `at://${didResponse}/app.bsky.feed.post/${postid}`;
  const cidFetch = await getPostCID(didResponse, postid);
  if (cidFetch === null) {
    pushToast("Unable to infer post records at this time, double check URL", false);
    showRepostProgress(false);
    return;
  }
  postObject.cid = cidFetch;

  const payload = JSON.stringify(postObject);
  const response = await fetch('/post/create/repost', {
    method: 'POST',
    headers: {'Content-Type': 'application/json' },
    body: payload
  });
  const data = await response.json();

  if (response.ok) {
    pushToast(data.message, true);
    document.dispatchEvent(new Event("resetRepost"));
    refreshPosts();
  } else {
    // For postnow, we try again, immediate failures still add to the DB
    if (response.status === 406 && postNow) {
      document.dispatchEvent(new Event("resetRepost"));
      htmx.trigger("body", "accountViolations");
      refreshPosts();
    }
    pushToast(translateErrorObject(data, data.error?.message || data.error || "An Error Occurred"), false);
    showRepostProgress(false);
  }
});

function showRepostProgress(shouldShow) {
  const el = document.getElementById("makingRepostRequest");
  el.setAttribute("aria-busy", shouldShow);
  setElementDisabled(el, shouldShow);
  setElementDisabled(postForm, shouldShow);
  if (shouldShow) {
    el.textContent = "Scheduling Reposts...";
  } else {
    el.textContent = "Schedule Repost";
  }
}