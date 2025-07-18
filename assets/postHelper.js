const repostCheckbox = document.getElementById("makeReposts");
const postNowCheckbox = document.getElementById('postNow');
const scheduledDate = document.getElementById('scheduledDate');

let fileData = new Map();
let fileDropzone = new Dropzone("#imageUploads", { 
  url: "/post/upload", 
  autoProcessQueue: true,
  maxFilesize: 70000000,
  acceptedFiles: "image/*"
});

fileDropzone.on("reset", () => {
  document.getElementById("content-label-selector").classList.add("hidden");
});

fileDropzone.on("addedfile", file => {
  var buttonHolder = Dropzone.createElement("<fieldset role='group' class='imgbtn'></fieldset>");
  var removeButton = Dropzone.createElement("<button class='outline btn-error' disabled><small>Remove file</small></button>");
  var addAltText = Dropzone.createElement("<button class='outline' disabled><small>Add Alt Text</small></button><br />");
  
  addAltText.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    const existingData = fileData.get(file.name);
    var askUserData = prompt("What is the alt text?", existingData.alt);
    if (askUserData !== "") {
      try {
        existingData.alt = askUserData;
        fileData.set(file.name, existingData);
        addAltText.classList.add("btn-success");
      } catch(err) {
        pushToast("failed to set alt text for image, try again", false);
      }
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
    }).then(response => {
      fileData.delete(file.name);
      fileDropzone.removeFile(file);
    });
  });
  buttonHolder.appendChild(addAltText);
  buttonHolder.appendChild(removeButton);
  file.previewElement.appendChild(buttonHolder);
});
fileDropzone.on("success", function(file, response) {
  // show the labels
  document.getElementById("content-label-selector").setAttribute("class", "");

  console.log("Adding "+file.name+" to the fileData map with size: "+response.fileSize+" at quality "+response.qualityLevel);
  fileData.set(file.name, {content: response.data, alt: ""});

  // Make the buttons pressable
  file.previewElement.querySelectorAll("button").forEach(el => {
    el.removeAttribute("disabled");
  });

  try {
    // attempt to rewrite the file size value as well
    // TODO: Attempt to print out quality level as well???
    file.previewElement.querySelectorAll("[data-dz-size]")[0].innerHTML = fileDropzone.filesize(response.fileSize);
  }
  catch (err) {
    console.error(err);
  }
  
  this.createThumbnailFromUrl(file, response.data);
});

fileDropzone.on("error", function(file, msg) {
  pushToast("Error: "+file.name+" had error: '"+msg+"'", false);
  fileDropzone.removeFile(file);
});

// Handle character counting
addCounter("content", "count");

// Handle form submission
document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = document.getElementById('content').value;
  const postNow = postNowCheckbox.checked;
  const scheduledDateVal = scheduledDate.value;
  try {
    const postObject = {
        content,
        scheduledDate: postNow ? new Date().toISOString() : new Date(scheduledDateVal).toISOString(),
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

    // Only handle data here if we have images
    if (fileData.size > 0) {
      console.log("parsing images for upload");
      postObject.embeds = [];
      fileData.forEach((value, key) => {
        postObject.embeds.push(value)
      });
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
      document.getElementById("content-label-selector").classList.add("hidden");
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
      scheduledDate.setAttribute("required", true);
      document.getElementById('postForm').reset();
      refreshPosts();
    } else {
      pushToast(data.error?.message || data.error || data.message || 'An error occurred', false);
    }
  } catch (err) {
    pushToast("An error occurred", false);
  }
});

// rounddown minutes
scheduledDate.addEventListener('change', (e) => {
  const date = new Date(scheduledDate.value);
  date.setMinutes(0 - date.getTimezoneOffset());
  scheduledDate.value = date.toISOString().slice(0,16);
});

function setSelectDisable(disable) {
  document.querySelectorAll("select:not(#contentLabels)").forEach((el) => {
    if (disable)
      el.setAttribute("disabled", true);
    else
      el.removeAttribute("disabled");
  });
}

repostCheckbox.addEventListener('click', (e) => {
  setSelectDisable(!repostCheckbox.checked);
});

postNowCheckbox.addEventListener('click', (e) => {
  if (postNowCheckbox.checked)
    scheduledDate.removeAttribute("required");
  else
    scheduledDate.setAttribute("required", true);
});
