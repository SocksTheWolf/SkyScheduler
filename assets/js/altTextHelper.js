function openAltText(file, altTextButton, loadCallback, saveCallback) {
  // A bunch of DOM elements
  const altTextModal = document.getElementById("altTextDialog");
  const altTextField = document.getElementById("altTextField");
  const altTextImgPreview = document.getElementById("altThumbImg");
  const saveButton = document.getElementById("altTextSaveButton");
  const cancelButton = document.getElementById("altTextCancelButton");
  const isFileInstance = file instanceof File;
  const altTextPreviewImgURL = isFileInstance ? URL.createObjectURL(file) : `preview/file/${file}`;

  // Handle page reset
  if (altTextModal.hasAttribute("hasReset") === false) {
    document.addEventListener("resetPost", () => {
      altTextField.value = "";
      altTextImgPreview.src = "";
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
      altTextButton.classList.remove("btn-success");
    } else {
      altTextButton.classList.add("btn-success");
    }
    closeAltModal();
  };

  const unbindAltModal = () => {
    saveButton.replaceWith(saveButton.cloneNode(true));
    cancelButton.replaceWith(cancelButton.cloneNode(true));
    altTextModal.removeEventListener("close", unbindAltModal);
    altTextImgPreview.src = "";
    if (isFileInstance)
      URL.revokeObjectURL(altTextPreviewImgURL);
    detachTribute(altTextField);
  }

  const closeAltModal = () => {
    unbindAltModal();
    closeModal(altTextModal);
  };

  altTextImgPreview.src = altTextPreviewImgURL;
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