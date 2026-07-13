function checkIsVideo(file) {
  if (file instanceof File) {
    return videoTypes.includes(file.type);
  }
  return videoFileExts.some(ext => file.includes(ext));
}

function openAltText(file, altTextButton, loadCallback, saveCallback) {
  // A bunch of DOM elements
  const altTextModal = document.getElementById("altTextDialog");
  const altTextField = document.getElementById("altTextField");
  const saveButton = document.getElementById("altTextSaveButton");
  const cancelButton = document.getElementById("altTextCancelButton");
  const mediaPlayerTag = document.getElementById("altMediaPlayer");
  const isFileInstance = file instanceof File;
  const previewContainer = document.getElementById("mediaPreview");
  const isVideo = checkIsVideo(file);
  const altTextPreviewURL = isFileInstance ? URL.createObjectURL(file) : `preview/file/${file}`;
  const filePreviewTag = (isVideo) ? document.createElement("video") : document.createElement("img");

  if (isVideo) {
    filePreviewTag.setAttribute("controls", true);
  }
  previewContainer.appendChild(filePreviewTag);

  // Handle page reset
  if (altTextModal.hasAttribute("hasReset") === false) {
    document.addEventListener("resetPost", () => {
      altTextField.value = "";
      filePreviewTag.src = "";
      resetCounter("altTextCount");
    });
    altTextModal.setAttribute("hasReset", true);
  }

  altTextField.value = loadCallback() || "";
  altTextField.selectionStart = altTextField.value.length;
  recountCounter("altTextCount");
  tributeToElement(altTextField);
  const handleSave = () => {
    const newAltTextData = altTextField.value;
    saveCallback(newAltTextData);
    if (newAltTextData === "") {
      altTextButton.classList.remove("has-alt-text");
    } else {
      altTextButton.classList.add("has-alt-text");
    }
    closeAltModal();
  };

  const unbindAltModal = () => {
    saveButton.replaceWith(saveButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));
    altTextModal.removeEventListener("close", unbindAltModal);
    filePreviewTag.src = "";
    if (isFileInstance)
      URL.revokeObjectURL(altTextPreviewURL);
    detachTribute(altTextField);
  }

  const closeAltModal = () => {
    unbindAltModal();
    closeModal(altTextModal);
    filePreviewTag.remove();
  };

  filePreviewTag.src = altTextPreviewURL;
  addClickKeyboardListener(saveButton, handleSave);
  addClickKeyboardListener(cancelButton, closeAltModal);
  altTextModal.addEventListener("close", unbindAltModal);
  openModal(altTextModal);
  altTextField.focus();
}

function openPostAltEditor(file) {
  const editorLocation = document.querySelector(`div[alteditfor="${file}"]`);
  const editorDataLocation = editorLocation.querySelector("input[data-alt]");
  openAltText(file, editorLocation.querySelector("a"), () => editorDataLocation.getAttribute("value"),
    (newAltValue) => {
      editorDataLocation.setAttribute("value", newAltValue);
  });
}