const repostCheckbox = document.getElementById('makeReposts');
const postNowCheckbox = document.getElementById('postNow');
const scheduledDate = document.getElementById('scheduledDate');
const urlCardBox = document.getElementById('urlCard');
const content = document.getElementById('content');
let hasFileLimit = false;
let fileData = new Map();

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

urlCardBox.addEventListener("paste", () => {
  showContentLabeler(true);
  setElementVisible(imageAttachmentSection, false);
});

urlCardBox.addEventListener("change", () => {
  const isNotEmpty = urlCardBox.value.length > 0;
  showContentLabeler(isNotEmpty);
  setElementVisible(imageAttachmentSection, !isNotEmpty);
});

let fileDropzone = new Dropzone("#fileUploads", { 
  url: "/post/upload", 
  autoProcessQueue: true,
  maxFilesize: 70000000,
  acceptedFiles: fileTypesSupported.toString()
});

// Fires whenever a post is made or the form needs to reset
document.addEventListener("resetPost", () => {
  document.getElementById('postForm').reset();
  setElementVisible(imageAttachmentSection, true);
  setElementVisible(linkAttachmentSection, true);
  showContentLabeler(false);
  setSelectDisable(true);
  setElementRequired(scheduledDate, true);
  showPostProgress(false);
  clearOnUnloadBlocker();
  repostCheckbox.checked = false;
  postNowCheckbox.checked = false;
  hasFileLimit = false;
  urlCardBox.value = "";
  resetCounter("count");

  // Remove all data in the dropzone as well
  fileDropzone.removeAllFiles();
  // Clear the file data map
  fileData.clear();
});

fileDropzone.on("reset", () => {
  hasFileLimit = false;
  clearOnUnloadBlocker();
  showContentLabeler(false);
  setElementVisible(linkAttachmentSection, true);
});

fileDropzone.on("addedfile", file => {
  if (hasFileLimit === true) {
    fileDropzone.removeFile(file);
    pushToast("Maximum number of files reached", false);
    return;
  }
  setElementVisible(linkAttachmentSection, false);
  const buttonHolder = Dropzone.createElement("<fieldset role='group' class='imgbtn'></fieldset>");
  const removeButton = Dropzone.createElement("<button class='fileDel outline btn-error' disabled><small>Remove file</small></button>");
  const addAltText = Dropzone.createElement("<button class='outline' disabled><small>Add Alt Text</small></button><br />");
  
  addAltText.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openAltText(file, addAltText);
  });

  // Listen to the click event
  removeButton.addEventListener("click", function(e) {
    // Make sure the button click doesn't submit the form:
    e.preventDefault();
    e.stopPropagation();

    // Remove the file
    fetch('/post/upload', {
        method: 'DELETE',
        body: JSON.stringify({"content": fileData.get(file.name).content })
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
        setElementVisible(linkAttachmentSection, true);
      }
    });
  });
  if (imageTypes.includes(file.type))
    buttonHolder.appendChild(addAltText);

  buttonHolder.appendChild(removeButton);
  file.previewElement.appendChild(buttonHolder);
});
fileDropzone.on("success", function(file, response) {
  const deleteFileOnError = () => {
    const delButton = file.previewElement.querySelectorAll(".fileDel")[0];
    delButton.setAttribute("bad", true);
    delButton.click();
  };
  // show the labels
  showContentLabeler(true);
  const fileIsImage = imageTypes.includes(file.type);
  const fileIsVideo = videoTypes.includes(file.type);
  const fileIsGif = gifTypes.includes(file.type);
  console.log(`Adding ${file.name} (${file.type}) to the fileData map with size: ${response.fileSize} at quality ${response.qualityLevel || 100}`);
  if (fileIsVideo) {
    // Attempt to process the video type
    const videoTag = document.createElement("video");
    videoTag.setAttribute("hidden", true);
    videoTag.setAttribute("src", URL.createObjectURL(file));
    videoTag.addEventListener("loadeddata", () => {
      const videoDuration = videoTag.duration;
      if (videoDuration > MAX_VIDEO_LENGTH) {
        pushToast(`${file.name} is too long for bsky by ${(videoDuration - MAX_VIDEO_LENGTH).toFixed(2)} seconds`, false);
        deleteFileOnError();
      } else {
        fileData.set(file.name, {content: response.data, type: 3, height: videoTag.videoHeight, width: videoTag.videoWidth, duration: videoDuration });
        hasFileLimit = true;
      }
      videoTag.remove();
    });
    videoTag.addEventListener("error", () => {
      pushToast(`Unable to process ${file.name}, decoder error occurred`);
      deleteFileOnError();
      videoTag.remove();
    });
    document.body.appendChild(videoTag);
  } else if (fileIsGif) {
    const imgObj = new Image();
    // This is in seconds, I can't really explain it without trying to go into the gif format myself.
    // from https://stackoverflow.com/a/74236879
    const getGifDuration = (ab) => {
      const uint8 = new Uint8Array(ab);
      let duration = 0;
      try {
        for (let i = 0, len = uint8.length; i < len; i++) {
          if (uint8[i] == 0x21
            && uint8[i + 1] == 0xF9
            && uint8[i + 2] == 0x04
            && uint8[i + 7] == 0x00) 
          {
            const delay = (uint8[i + 5] << 8) | (uint8[i + 4] & 0xFF)
            duration += delay < 2 ? 10 : delay
          }
        }
        return duration / 100;
      } catch(err) {
        console.error(`Unable to read gif file, got error ${err}`);
        return null;
      }
    }
    imgObj.onload = async () => {
      const videoDuration = getGifDuration(await file.arrayBuffer());
      if (videoDuration === null) {
        pushToast(`${file.name} duration could not be processed`, false);
        deleteFileOnError();
      } else if (videoDuration > MAX_VIDEO_LENGTH) {
        pushToast(`${file.name} is too long for bsky by ${(videoDuration - MAX_VIDEO_LENGTH).toFixed(2)} seconds`, false);
        deleteFileOnError();
      } else {
        fileData.set(file.name, { content: response.data, type: 3, height: imgObj.height, width: imgObj.width, duration: videoDuration });
        hasFileLimit = true;
      }
    };
    // Force the file to load.
    imgObj.src = URL.createObjectURL(file);
  } else {
    fileData.set(file.name, {content: response.data, type: 1});
  }
  
  // Make the buttons pressable
  file.previewElement.querySelectorAll("button").forEach(el => setElementDisabled(el, false));

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
    setElementVisible(linkAttachmentSection, true);
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
      if (postNow) {
        pushToast("Post created!", true);
      } else {
        pushToast("Scheduled post successfully!", true);
      }      
      document.dispatchEvent(new Event("resetPost"));
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
  setElementRequired(scheduledDate, !postNowCheckbox.checked);
});

function setSelectDisable(disable) {
  document.querySelectorAll("select:not(#contentLabels)").forEach((el) => setElementDisabled(el, disable));
}

function showContentLabeler(shouldShow) {
  const contentLabelSelector = document.getElementById("content-label-selector");
  const contentLabelSelect = document.getElementById("contentLabels");

  if (!shouldShow && (fileData.length > 0 || urlCardBox.value.length > 0))
    return;

  setElementVisible(contentLabelSelector, shouldShow);
  setElementRequired(contentLabelSelect, shouldShow);
  if (!shouldShow)
    contentLabelSelect.value = "";
}

function showPostProgress(shouldShow) {
  const el = document.getElementById("makingPostRequest");
  el.setAttribute("aria-busy", shouldShow);
  setElementDisabled(el, shouldShow);
  if (shouldShow) {
    el.innerHTML = "Making Post...";
  } else {
    el.innerHTML = "Schedule Post";
  }
}

function openAltText(file, altTextButton) {
  // A bunch of DOM elements
  const altTextModal = document.getElementById("altTextDialog");
  const altTextField = document.getElementById("altTextField");
  const altTextImgPreview = document.getElementById("altThumbImg");
  const saveButton = document.getElementById("altTextSaveButton");
  const cancelButton = document.getElementById("altTextCancelButton");

  // Handle page reset
  if (altTextModal.hasAttribute("hasReset") === false) {
    document.addEventListener("resetPost", () => {
      altTextField.value = "";
      altTextImgPreview.src = "";
      resetCounter("altTextCount");
    });
    altTextModal.setAttribute("hasReset", true);
  }

  const existingData = fileData.get(file.name);
  altTextField.value = existingData.alt || "";
  recountCounter("altTextCount");
  tributeToElement(altTextField);
  const handleSave = (ev) => {
    ev.preventDefault();
    const newAltTextData = altTextField.value;
    existingData.alt = newAltTextData;
    fileData.set(file.name, existingData);
    if (newAltTextData === "") {
      altTextButton.classList.remove("btn-success");
    } else {
      altTextButton.classList.add("btn-success");
    }
    //console.log(`Updated alt data for ${file.name} which is ${newAltTextData}`);
    closeAltModal();
  };

  const unbindAltModal = () => {
    saveButton.removeEventListener("click", handleSave);
    cancelButton.removeEventListener("click", closeAltModal);
    altTextModal.removeEventListener("close", unbindAltModal);
    altTextImgPreview.src = "";
    detachTribute(altTextField);
  }

  const closeAltModal = () => {
    unbindAltModal();
    closeModal(altTextModal);
  };

  altTextImgPreview.src = URL.createObjectURL(file);
  saveButton.addEventListener("click", handleSave);
  cancelButton.addEventListener("click", closeAltModal);
  altTextModal.addEventListener("close", unbindAltModal);
  openModal(altTextModal);
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

function tributeToElement(el) {
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
    menuShowMinLength: MIN_CHAR_AUTO_COMPLETE_NAMES,
    menuContainer: el.parentNode
  });

  el.addEventListener("detach", () => {
    mentionTribute.detach(el);
  });
  mentionTribute.attach(el);
}

function detachTribute(el) {
  el.dispatchEvent(new Event("detach"));
}

// Handle character counting
addCounter("content", "count", MAX_LENGTH);
addCounter("altTextField", "altTextCount", MAX_ALT_LENGTH);
// Add mentions
tributeToElement(content);
document.dispatchEvent(new Event("resetPost"));

