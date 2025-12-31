const repostCheckbox = document.getElementById('makeReposts');
const postNowCheckbox = document.getElementById('postNow');
const scheduledDate = document.getElementById('scheduledDate');
const urlCardBox = document.getElementById('urlCard');
const content = document.getElementById('content');

const imageAttachmentSection = document.getElementById("imageAttachmentSection");
const linkAttachmentSection = document.getElementById("webLinkAttachmentSection");

function addOnUnloadBlocker() {
  window.onbeforeunload = function() {
    document.querySelectorAll(".fileDel").forEach((el) => {el.click();});
    return false;
  }
}
function clearOnUnloadBlocker() {
  window.onbeforeunload = null;
}

function resetForm() {
  repostCheckbox.checked = false;
  postNowCheckbox.checked = false;
  urlCardBox.value = "";
  toggleElementVisibleState(imageAttachmentSection, true);
  toggleElementVisibleState(linkAttachmentSection, true);
  showContentLabeler(false);
  setSelectDisable(true);
  showPostProgress(false);
  clearOnUnloadBlocker();
}

urlCardBox.addEventListener("paste", () => {
  showContentLabeler(true);
  toggleElementVisibleState(imageAttachmentSection, false);
});

urlCardBox.addEventListener("change", () => {
  const isNotEmpty = urlCardBox.value.length > 0;
  showContentLabeler(isNotEmpty);
  toggleElementVisibleState(imageAttachmentSection, !isNotEmpty);
});

let fileData = new Map();
let fileDropzone = new Dropzone("#fileUploads", { 
  url: "/post/upload", 
  autoProcessQueue: true,
  maxFilesize: 70000000,
  acceptedFiles: fileTypesSupported.toString()
});

fileDropzone.on("reset", () => {
  clearOnUnloadBlocker();
  showContentLabeler(false);
  toggleElementVisibleState(linkAttachmentSection, true);
});

fileDropzone.on("addedfile", file => {
  toggleElementVisibleState(linkAttachmentSection, false);
  const buttonHolder = Dropzone.createElement("<fieldset role='group' class='imgbtn'></fieldset>");
  const removeButton = Dropzone.createElement("<button class='fileDel outline btn-error' disabled><small>Remove file</small></button>");
  const addAltText = Dropzone.createElement("<button class='outline' disabled><small>Add Alt Text</small></button><br />");
  
  addAltText.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    const existingData = fileData.get(file.name);
    var askUserData = prompt("What is the alt text?", existingData.alt || "");
    try {
      existingData.alt = askUserData;
      fileData.set(file.name, existingData);
      if (askUserData === "" || askUserData === null) {
        addAltText.classList.remove("btn-success");
      } else {
        addAltText.classList.add("btn-success");
      }
    } catch (err) {
      console.error(err);
      pushToast("failed to set alt text for image, try again", false);
    }
  });

  // Listen to the click event
  removeButton.addEventListener("click", function(e) {
    // Make sure the button click doesn't submit the form:
    e.preventDefault();
    e.stopPropagation();

    // Remove the file
    fetch('/post/upload', {
        method: 'DELETE',
        body: JSON.stringify({"key": fileData.get(file.name).content })
    }).then(async response => {
      const data = await response.json();
      if (!data.success) {
        const errText = translateErrorObject(data.error, `Unknown Error`);
        pushToast(`Unable to delete file ${file.name}! ${errText}`, false);
      } else {
        fileData.delete(file.name);
        fileDropzone.removeFile(file);
        if (!removeButton.hasAttribute("bad"))
          pushToast(`Deleted file ${file.name}`, true);
      }
      if (fileData.length == 0) {
        toggleElementVisibleState(linkAttachmentSection, true);
      }
    });
  });
  if (imageTypes.includes(file.type))
    buttonHolder.appendChild(addAltText);

  buttonHolder.appendChild(removeButton);
  file.previewElement.appendChild(buttonHolder);
});
fileDropzone.on("success", function(file, response) {
  // show the labels
  showContentLabeler(true);
  const fileIsImage = imageTypes.includes(file.type);
  const fileIsVideo = videoTypes.includes(file.type);
  console.log(`Adding ${file.name} (${file.type}) to the fileData map with size: ${response.fileSize} at quality ${response.qualityLevel || 100}`);
  if (fileIsVideo) {
    // Attempt to process the video type
    const videoTag = document.createElement("video");
    videoTag.setAttribute("hidden", true);
    videoTag.setAttribute("src", URL.createObjectURL(file));
    videoTag.addEventListener("loadeddata", () => {
      const videoDuration = videoTag.duration;
      fileData.set(file.name, {content: response.data, type: 3, 
        height: videoTag.videoHeight, width: videoTag.videoWidth, duration: videoDuration });
      if (videoDuration > MAX_VIDEO_LENGTH) {
        const delButton = file.previewElement.querySelectorAll(".fileDel")[0];
        delButton.setAttribute("bad", true);
        delButton.click();
        pushToast(`${file.name} is too long for bsky by ${(videoDuration - MAX_VIDEO_LENGTH).toFixed(2)} seconds`, false);
      }
      videoTag.remove();
    });
    document.body.appendChild(videoTag);
  } else {
    fileData.set(file.name, {content: response.data, type: 1});
  }
  
  // Make the buttons pressable
  file.previewElement.querySelectorAll("button").forEach(el => {
    el.removeAttribute("disabled");
  });

  try {
    // attempt to write the file size value
    const fileSizeElement = file.previewElement.querySelector(".dz-size");
    const detailsArea = file.previewElement.querySelector(".dz-details");
    fileSizeElement.firstChild.innerHTML = fileDropzone.filesize(response.fileSize);
    // and the quality compression as well
    const fileQualityLevel = Dropzone.createElement(`<div class="dz-size"><span>Quality: ${response.qualityLevel || 100}%</span></div>`);
    detailsArea.insertBefore(fileQualityLevel, fileSizeElement);
  } catch (err) {
    console.error(err);
  }
  
  addOnUnloadBlocker();

  if (fileIsImage)
    this.createThumbnailFromUrl(file, response.data);
});

fileDropzone.on("error", function(file, msg) {
  pushToast(`Error: ${file.name} had error: "${msg.error}"`, false);
  fileDropzone.removeFile(file);
  if (fileData.length == 0) {
    toggleElementVisibleState(linkAttachmentSection, true);
  }
});

// Handle form submission
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  showPostProgress(true);
  const contentVal = content.value;
  const postNow = postNowCheckbox.checked;
  const scheduledDateVal = scheduledDate.value;
  // Handle conversion of date time to make sure that it is correct.
  let dateTime;
  try {
    dateTime = postNow ? new Date().toISOString() : new Date(scheduledDateVal).toISOString();
  } catch(dateErr) {
    pushToast("Invalid date", false);
    showPostProgress(false);
    return;
  }

  // if it is, then go about getting all the data for the form
  try {
    const postObject = {
        content: contentVal,
        scheduledDate: dateTime,
        makePostNow: postNow,
        repostData: undefined
    };

    // Add repost data if we should be making reposts
    if (repostCheckbox.checked) {
      postObject.repostData = {
        hours: document.getElementById("hoursInterval").value,
        times: document.getElementById("timesInterval").value
      };
    }

    const hasFiles = fileData.size > 0;
    const linkCardURL = urlCardBox.value;
    const hasWebEmbed = linkCardURL.length > 0;
    if (hasFiles || hasWebEmbed) {
      postObject.embeds = [];
      if (hasFiles) {
        fileData.forEach((value, key) => {
          postObject.embeds.push(value)
        });
      } else {
        // Attempt to fetch the web information
        const webDataObj = {
          uri: linkCardURL,
          type: 2
        };
        // Going to rondezoop this from bsky as I don't want to write my own atm
        const extractResponse = await fetch(`https://cardyb.bsky.app/v1/extract?url=${encodeURI(linkCardURL)}`);
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          if (extractData.error === "") {
            webDataObj.description = extractData.description;
            webDataObj.title = extractData.title;
            webDataObj.content = extractData.image;
          } else {
            console.error(extractData.error);
            pushToast("An error occurred with the URL card, please correct.", false);
            showPostProgress(false);
            return;
          }
        } else {
          pushToast("Unable to fetch URL card embed information...", false);
          showPostProgress(false);
          return;
        }
        postObject.embeds.push(webDataObj);
      }
      postObject.label = document.getElementById("contentLabels").value;
    }

    const payload = JSON.stringify(postObject);
    const response = await fetch('/post/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json' },
      body: payload
    });
    const data = await response.json();
    
    if (response.ok) {
      // Hide the selector
      showContentLabeler(false);
      // Remove all data in the dropzone as well
      fileDropzone.removeAllFiles();
      // Clear the file data map
      fileData.clear();
      resetCounter("count");
      
      if (postNow) {
        pushToast("Post created!", true);
      } else {
        pushToast("Scheduled post successfully!", true);
      }
      
      setSelectDisable(true);
      scheduledDate.setAttribute("required", "");
      document.getElementById('postForm').reset();
      resetForm();
      refreshPosts();
    } else {
      pushToast(translateErrorObject(data, data.error?.message || data.error || "An Error Occurred"), false);
    }
  } catch (err) {
    console.log(err);
    pushToast("An unknown error occurred", false);
  }
  showPostProgress(false);
});

// rounddown minutes
scheduledDate.addEventListener('change', (e) => {
  const date = new Date(scheduledDate.value);
  date.setMinutes(0 - date.getTimezoneOffset());
  scheduledDate.value = date.toISOString().slice(0,16);
});

repostCheckbox.addEventListener('click', (e) => {
  setSelectDisable(!repostCheckbox.checked);
});

postNowCheckbox.addEventListener('click', (e) => {
  if (postNowCheckbox.checked)
    scheduledDate.removeAttribute("required");
  else
    scheduledDate.setAttribute("required", "");
});

function setSelectDisable(disable) {
  document.querySelectorAll("select:not(#contentLabels)").forEach((el) => {
    if (disable)
      el.setAttribute("disabled", true);
    else
      el.removeAttribute("disabled");
  });
}

function showContentLabeler(shouldShow) {
  const contentLabelSelector = document.getElementById("content-label-selector");
  const contentLabelSelect = document.getElementById("contentLabels");

  if (!shouldShow && (fileData.length > 0 || urlCardBox.value.length > 0))
    return;

  if (shouldShow) {
    contentLabelSelector.setAttribute("class", "");
    contentLabelSelect.setAttribute("required", "");
  } else {
    contentLabelSelector.classList.add("hidden");
    contentLabelSelect.removeAttribute("required");
    contentLabelSelect.value = "";
  }
}

function toggleElementVisibleState(el, shouldShow) {
  if (shouldShow)
    el.classList.remove("hidden");
  else
    el.classList.add("hidden");
}

function showPostProgress(shouldShow) {
  const el = document.getElementById("makingPostRequest");
  el.setAttribute("aria-busy", shouldShow);
  if (shouldShow) {
    el.setAttribute("disabled", true);
    el.innerHTML = "Making Post...";
  } else {
    el.removeAttribute("disabled");
    el.innerHTML = "Schedule Post";
  }
}

function searchBSkyMentions(query, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${query}&limit=${MAX_AUTO_COMPLETE_NAMES}`);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      // Request good
      if (xhr.status === 200) {
        try {
          const returnData = JSON.parse(xhr.responseText);
          callback(returnData.actors);
          return;
        } catch(err) {
          console.error(`failed to parse bsky mention list ${err}`)
        }
      }
      console.error(`fetching bluesky mentionlist returned ${xhr.status}`);
      callback([]);
    }
  }
  xhr.send();
}

const mentionTribute = new Tribute({
  menuItemTemplate: function(item) {
    const avatarStr = item.original.avatar !== undefined ? `<img src="${item.original.avatar}">` : "";
    return `${avatarStr}<span><code>${item.original.displayName}</code><br /> <small>@${item.original.handle}</small></span>`;
  },
  values: function(text, cb) {
    searchBSkyMentions(text, item => cb(item));
  },
  noMatchTemplate: () => '<span class="acBskyHandle">No Match Found</span>',
  lookup: 'handle',
  fillAttr: 'handle',
  spaceSelectsMatch: true,
  menuItemLimit: MAX_AUTO_COMPLETE_NAMES,
  menuShowMinLength: 2
});

function tributeToElement(el, add=true) {
  if (add)
    mentionTribute.attach(el);
  else
    mentionTribute.detach(el);
}

// Handle character counting
addCounter("content", "count");
// Add mentions
tributeToElement(content);
resetForm();

