const repostCheckbox = document.getElementById('makeReposts');
const postNowCheckbox = document.getElementById('postNow');
const scheduledDate = document.getElementById('scheduledDate');

const recordUrlBox = document.getElementById('recordBox');
const content = document.getElementById('content');
const postForm = document.getElementById('postForm');
const threadField = document.getElementById('threadInfo');
const cancelThreadBtn = document.getElementById('cancelThreadPost');
const postFormTitle = document.getElementById('postFormTitle')
let hasFileLimit = false;
let fileData = new Map();

/* Sections for handling UI changes and modifications */
const sectionRetweet = document.getElementById('section-retweet');
const sectionSchedule = document.getElementById('section-postSchedule');
const sectionImageAttach = document.getElementById("section-imageAttachment");
const sectionLinkAttach = document.getElementById("section-weblink");

function addOnUnloadBlocker() {
  window.onbeforeunload = function() {
    document.querySelectorAll(".fileDel").forEach((el) => {el.click();});
    return undefined;
  }
}
function clearOnUnloadBlocker() {
  window.onbeforeunload = null;
}

let fileDropzone = new Dropzone("#fileUploads", {
  url: "/post/upload",
  autoProcessQueue: true,
  /* We process this ourselves */
  addRemoveLinks: false,
  maxFiles: FILE_DROP_MAX_FILES,
  dictMaxFilesExceeded: "max files",
  maxFilesize: FILE_DROP_MAX_SIZE,
  maxThumbnailFilesize: FILE_DROP_MAX_THUMB_SIZE,
  acceptedFiles: fileTypesSupported.toString()
});

// Fires whenever a post is made or the form needs to reset
document.addEventListener("resetPost", () => {
  postForm.reset();
  postForm.removeAttribute("disabled");
  // reset sections
  setElementVisible(sectionImageAttach, true);
  setElementVisible(sectionLinkAttach, true);
  setElementVisible(sectionRetweet, true);
  setElementVisible(sectionSchedule, true);
  setElementVisible(cancelThreadBtn.parentElement, false);
  postFormTitle.innerText = "Schedule New Post";
  // remove thread info data
  if (threadField.hasAttribute("parentpost")) {
    const postHighlight = getPostListElement(threadField.getAttribute("parentpost"));
    if (postHighlight) {
      postHighlight.classList.remove("highlight");
    }
  }
  threadField.removeAttribute("rootpost");
  threadField.removeAttribute("parentpost");
  threadField.removeAttribute("postid");
  showContentLabeler(false);
  setSelectDisable(repostCheckbox.parentElement, true);
  setElementRequired(scheduledDate, true);
  setElementVisible(scheduledDate, true);
  setElementVisible(scheduledDate.nextElementSibling, true);
  showPostProgress(false);
  clearOnUnloadBlocker();
  repostCheckbox.checked = false;
  postNowCheckbox.checked = false;
  hasFileLimit = false;
  document.getElementById('urlCard').value = "";
  recordUrlBox.value = "";
  resetCounter("count");
  setTimeout(scrollTop, 400);

  // Remove all data in the dropzone as well
  fileDropzone.removeAllFiles();
  // Clear the file data map
  fileData.clear();
});

fileDropzone.on("reset", () => {
  hasFileLimit = false;
  clearOnUnloadBlocker();
  showContentLabeler(false);
  setElementVisible(sectionLinkAttach, true);
});

fileDropzone.on("addedfile", file => {
  if (hasFileLimit === true) {
    fileDropzone.removeFile(file);
    pushToast("Maximum number of files reached", false);
    return;
  }
  setElementVisible(sectionLinkAttach, false);
  const buttonHolder = Dropzone.createElement("<fieldset role='group' class='imgbtn'></fieldset>");
  const removeButton = Dropzone.createElement("<button class='fileDel outline btn-error' disabled><small>Remove file</small></button>");
  const addAltText = Dropzone.createElement("<button class='outline' disabled><small>Add Alt Text</small></button><br />");

  addAltText.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openAltText(file, addAltText, () => {
      return fileData.get(file.name).alt;
    }, (newAltText) => {
      const existingData = fileData.get(file.name);
      existingData.alt = newAltText;
      fileData.set(file.name, existingData);
    });
  });

  // Listen to the click event
  removeButton.addEventListener("click", function(e) {
    // Make sure the button click doesn't submit the form:
    e.preventDefault();
    e.stopPropagation();

    // Remove the file
    fetch('/post/upload', {
        method: 'DELETE',
        keepalive: true,
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
        setElementVisible(sectionLinkAttach, true);
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
    const videoObjectURL = URL.createObjectURL(file);
    const cleanupVideoTag = () => {
      videoTag.removeAttribute("src");
      URL.revokeObjectURL(videoObjectURL);
      videoTag.remove();
    };
    videoTag.setAttribute("hidden", true);
    videoTag.setAttribute("src", videoObjectURL);
    videoTag.addEventListener("loadeddata", () => {
      const videoDuration = videoTag.duration;
      if (videoDuration > MAX_VIDEO_LENGTH) {
        pushToast(`${file.name} is too long for bsky by ${(videoDuration - MAX_VIDEO_LENGTH).toFixed(2)} seconds`, false);
        deleteFileOnError();
      } else {
        fileData.set(file.name, {content: response.data, type: 3,
          height: videoTag.videoHeight, width: videoTag.videoWidth, duration: videoDuration });
        hasFileLimit = true;
      }
      cleanupVideoTag();
    });
    videoTag.addEventListener("error", () => {
      pushToast(`Unable to process ${file.name}, decoder error occurred`);
      deleteFileOnError();
      cleanupVideoTag();
    });
    document.body.appendChild(videoTag);
  } else if (fileIsGif) {
    const imgObj = new Image();
    const gifImgURL = URL.createObjectURL(file);
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
      if (imgObj.src === "")
        return;

      const videoDuration = getGifDuration(await file.arrayBuffer());
      // cache the image width and height before cleanup
      const imageWidth = imgObj.width, imageHeight = imgObj.height;
      // Cleanup the gif processing stuffs
      imgObj.src = "";
      URL.revokeObjectURL(gifImgURL);
      if (videoDuration === null) {
        pushToast(`${file.name} duration could not be processed`, false);
        deleteFileOnError();
      } else if (videoDuration > MAX_VIDEO_LENGTH) {
        pushToast(`${file.name} is over the maximum video duration by ${(videoDuration - MAX_VIDEO_LENGTH).toFixed(2)} seconds`, false);
        deleteFileOnError();
      } else if (videoDuration >= MAX_GIF_LENGTH) {
        pushToast(`${file.name} is over the maximum length for a gif by ${(videoDuration - MAX_GIF_LENGTH).toFixed(2)} seconds`, false);
        deleteFileOnError();
      } else {
        fileData.set(file.name, { content: response.data, type: 3, height: imageHeight, width: imageWidth, duration: videoDuration });
        hasFileLimit = true;
      }
    };
    // Force the file to load.
    imgObj.src = gifImgURL;
  } else {
    fileData.set(file.name, {content: response.data, type: 1});
  }

  // Make the buttons pressable
  file.previewElement.querySelectorAll("button").forEach(el => setElementDisabled(el, false));

  try {
    // attempt to write the file size value
    const uploadedFileSize = fileDropzone.filesize(response.fileSize);
    const fileSizeElement = file.previewElement.querySelector(".dz-size");
    const detailsArea = file.previewElement.querySelector(".dz-details");
    fileSizeElement.firstChild.innerHTML = uploadedFileSize;
    // and the quality compression as well
    const fileQualityLevel = Dropzone.createElement(`<div class="dz-size"><span>Quality: ${response.qualityLevel || 100}%</span></div>`);
    detailsArea.insertBefore(fileQualityLevel, fileSizeElement);
    // add a tooltip to the filename field
    file.previewElement.querySelector(".dz-filename").setAttribute("title", file.name);
    // thumbnail swap in
    if (fileIsVideo) {
      this.emit('thumbnail', file, '/thumbs/video.png');
    } else if (uploadedFileSize > FILE_DROP_MAX_THUMB_SIZE) {
      if (fileIsImage) {
        this.emit('thumbnail', file, '/thumbs/image.png');
      } else if (fileIsGif) {
        this.emit('thumbnail', file, '/thumbs/gif.png');
      }
    }
  } catch (err) {
    console.error(err);
  }

  addOnUnloadBlocker();
});

fileDropzone.on("error", function(file, msg) {
  if (msg.error !== undefined) {
    pushToast(`Error: ${file.name} had error: "${msg.error}"`, false);
  } else if (msg !== "max files") {
    console.error(`file error was ${msg}`);
    pushToast(`Error: ${file.name} had an unexpected error`, false);
  }

  fileDropzone.removeFile(file);
  if (fileData.length == 0) {
    setElementVisible(sectionLinkAttach, true);
  }
});

fileDropzone.on("uploadprogress", function(file, progress, bytesSent) {
  const progressObject = file.previewElement.querySelector(".dz-upload");
  progressObject.innerHTML = `${progress}%`;
  if ((progress === 100 || bytesSent == file.size) && progressObject) {
    progressObject.innerHTML = "Processing...please wait. This may take a bit!";
  }
});

fileDropzone.on("maxfilesexceeded", () => {
  pushToast("The maximum amount of files for this post has been reached!", false);
});

// Handle form submission
postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showPostProgress(true);
  const contentVal = content.value;
  const postNow = postNowCheckbox.checked;
  const scheduledDateVal = scheduledDate.value;
  const isThreadPost = threadField.hasAttribute("rootpost") && threadField.hasAttribute("parentpost");
  // Handle conversion of date time to make sure that it is correct.
  let dateTime;
  try {
    dateTime = isThreadPost || postNow ? new Date().toISOString() : new Date(scheduledDateVal).toISOString();
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
        repostData: undefined,
        rootPost: undefined,
        parentPost: undefined,
    };

    // Add repost data if we should be making reposts
    if (repostCheckbox.checked) {
      const repostValues = repostCheckbox.parentElement.querySelectorAll("select");
      postObject.repostData = {
        hours: repostValues[0].value,
        times: repostValues[1].value
      };
    }

    // Add thread data if it exists
    if (isThreadPost) {
      postObject.parentPost = threadField.getAttribute("parentpost");
      postObject.rootPost = threadField.getAttribute("rootpost");
      // make sure to remove any invalid combinations
      postObject.makePostNow = false;
      postObject.repostData = undefined;
    }

    const hasFiles = fileData.size > 0;
    const linkCardURL = document.getElementById('urlCard').value;
    const recordURL = recordUrlBox.value;
    const hasWebEmbed = linkCardURL.length > 0;
    const hasRecord = recordURL.length > 0;
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
    if (hasRecord) {
      if (postObject.embeds === undefined)
        postObject.embeds = [];

      const recordObj = {
        content: recordURL,
        type: 4
      }
      postObject.embeds.push(recordObj);
    }

    const payload = JSON.stringify(postObject);
    const response = await fetch('/post/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json' },
      body: payload
    });
    const data = await response.json();

    if (response.ok) {
      pushToast(data.message, true);
      document.dispatchEvent(new Event("resetPost"));
      refreshPosts();
      if (data.id) {
        // TODO: this really should wait for refreshPosts to end
        setTimeout(function(){scrollToPost(data.id)}, 1600);
      }
    } else {
      // For postnow, we try again, immediate failures still add to the DB
      if (response.status === 406 && postNow) {
        document.dispatchEvent(new Event("resetPost"));
        htmx.trigger("body", "accountViolations");
        refreshPosts();
      }
      pushToast(translateErrorObject(data, data.error?.message || data.error || "An Error Occurred"), false);
    }
  } catch (err) {
    console.log(err);
    pushToast("An unknown error occurred", false);
  }
  showPostProgress(false);
});

function convertTimeValueLocally(number) {
  const date = new Date(number);
  date.setMinutes(0 - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
}

function setSelectDisable(nodeBase, disable) {
  nodeBase.querySelectorAll("select:not(#contentLabels)").forEach(
    (el) => setElementDisabled(el, disable));
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

function showPostProgress(shouldShow) {
  const el = document.getElementById("makingPostRequest");
  el.setAttribute("aria-busy", shouldShow);
  setElementDisabled(el, shouldShow);
  setElementDisabled(postForm, shouldShow);
  setElementDisabled(cancelThreadBtn, shouldShow);
  if (shouldShow) {
    el.textContent = "Making Post...";
  } else {
    el.textContent = "Schedule Post";
  }
}

// HTMX will call this
document.addEventListener("editPost", function(event) {
  const postid = event.detail.value;
  const editField = document.getElementById(`edit${postid}`);
  const editForm = document.getElementById(`editPost${postid}`);
  const cancelButton = editForm.querySelector(".cancelEditButton");

  addCounter(`edit${postid}`, `editCount${postid}`, MAX_LENGTH);
  tributeToElement(editField);

  const cancelEditField = (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      cancelButton.click();
    }
  };

  editField.addEventListener("tribute-active-true", () => {
    editField.removeEventListener("keydown", cancelEditField);
  });
  editField.addEventListener("tribute-active-false", () => {
    editField.addEventListener("keydown", cancelEditField);
  });

  editField.addEventListener("keydown", cancelEditField);
  editForm.querySelectorAll(".editPostAlt").forEach((altEl) => {
    addClickKeyboardListener(altEl, () => {
      openPostAltEditor(encodeURIComponent(altEl.getAttribute("data-file")) || "");
    });
  });

  addKeyboardListener(cancelButton, () => cancelButton.click());

  editField.selectionStart = editField.value.length;
  editField.focus();
});

document.addEventListener("replyThreadCreate", function(ev) {
  const postDOM = ev.detail.target;
  // check attributes
  if (!postDOM.hasAttribute("data-root")) {
    pushToast("Invalid operation occurred", false);
    return;
  }

  const rootID = postDOM.getAttribute("data-root");
  if (threadField.hasAttribute("rootpost")) {
    const currentEdit = threadField.getAttribute("rootpost");
    if (rootID != currentEdit)
      pushToast("You are already threading a post, please cancel/submit it before continuing", false);
    return;
  }

  threadField.setAttribute("rootpost", rootID);
  const parentID = postDOM.hasAttribute("data-item") ? postDOM.getAttribute("data-item") : rootID;
  threadField.setAttribute("parentpost", parentID);
  const postHighlight = getPostListElement(parentID);
  if (postHighlight) {
    postHighlight.classList.add("highlight");
  }

  setElementVisible(cancelThreadBtn.parentElement, true);
  setElementVisible(sectionRetweet, false);
  setElementVisible(sectionSchedule, false);

  postFormTitle.innerText = "Schedule New Thread Reply";
});

function runPageReactors() {
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
    dateScheduler.setAttribute("min", convertTimeValueLocally(Date.now()));

    if (scheduledPostNowBox) {
      addClickKeyboardListener(scheduledPostNowBox, () => {
        const isChecked = scheduledPostNowBox.checked;
        setElementRequired(dateScheduler, !isChecked);
        setElementVisible(dateScheduler, !isChecked);
        setElementVisible(dateScheduler.nextElementSibling, !isChecked);
      }, keys, false);
    }
  });

  const urlCardBox = document.getElementById('urlCard');
  urlCardBox.addEventListener("paste", () => {
    showContentLabeler(true);
    setElementVisible(sectionImageAttach, false);
  });

  urlCardBox.addEventListener("input", (ev) => {
    const isNotEmpty = ev.target.value.length > 0;
    showContentLabeler(isNotEmpty);
    setElementVisible(sectionImageAttach, !isNotEmpty);
  });

  // Handle character counting
  addCounter("content", "count", MAX_LENGTH);
  addCounter("altTextField", "altTextCount", MAX_ALT_LENGTH);
  // Add mentions
  tributeToElement(content);
  // add event for the cancel button
  if (cancelThreadBtn) {
    addClickKeyboardListener(cancelThreadBtn, () =>
      {document.dispatchEvent(new Event("resetPost")) });
  }
  document.dispatchEvent(new Event("timeSidebar"));
  document.dispatchEvent(new Event("resetPost"));
}

document.addEventListener("DOMContentLoaded", () => {
  runPageReactors();
  new PicoTabs('[role="tablist"]');
});