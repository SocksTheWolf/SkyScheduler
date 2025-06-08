import { html } from "hono/html";
import DashboardLayout from "../layout/dashboard-layout";
import { FILE_SIZE_LIMIT } from "../limits.d"

export default function Homepage() {
  return (
    <DashboardLayout title="Dashboard - Social Media Scheduler">
      <div class="p-6 border rounded-xl bg-white my-4 mx-4 sm:ml-0 h-[calc(75vh-2rem)] overflow-hidden">

        <form id="postForm" class="flex flex-col h-full">
          <h1 class="text-2xl font-bold mb-6">Schedule New Post</h1>
          <label class="form-control mb-4 flex flex-1 flex-col h-48">
            <div class="label">
              <span class="label-text">Content</span>
            </div>
            <textarea id="content" class="textarea textarea-bordered" rows={40} style="resize: none" placeholder="Post text here" required></textarea>
          </label>

          <div class="label">
            <span class="label-text">Images</span>
          </div>
          <div class="form-control flex flex-1 h-60 w-full input input-bordered mb-2">
            <div class="h-full w-full gap-2 form-control input" id="imageUploads"></div>
          </div>

          <div id="content-label-selector" class="hidden">
            <label class="input input-bordered flex items-center gap-2 mb-2">
              Content Label
              <select name="label" id="contentLabels">
                <option value="None">None</option>
                <option value="Suggestive">Suggestive</option>
                <option value="Nudity">Nudity (non-sexual nudity)</option>
                <option value="Adult">Adult (porn)</option>
                <option value="Graphic">Graphic Media (gore/violence)</option>
              </select>
            </label>
          </div>

          <div>
            <label class="input input-bordered flex items-center gap-2 mb-2">
              Schedule Date
              <input type="datetime-local" id="scheduledDate" class="grow" placeholder="" required />
            </label>
            <p class="text-sm mb-4 italic px-2 text-base-content">You can schedule posts in the future, hourly. Minutes are rounded down.</p>
          </div>

          <button type="submit" class="w-full btn btn-primary btn-outline mb-2">
            Schedule Post
          </button>
        </form>

        <div class="toast toast-bottom toast-end">
          <div id="error" class="alert alert-error text-sm text-white hidden">An error occurred</div>
          <div id="success" class="alert alert-success text-sm text-white hidden">Post scheduled successfully</div>
        </div>
      </div>

      <script>
      {html`
        let fileData = new Map();
        let fileDropzone = new Dropzone("#imageUploads", { 
          url: "/upload", 
          maxFilesize: 100, 
          autoProcessQueue: true,
          acceptedFiles: "image/*"
        });
        fileDropzone.on("addedfile", file => {
          document.getElementById("content-label-selector").setAttribute("class", "");

          // Create the remove button
          var removeButton = Dropzone.createElement("<button class='btn-outline btn'>Remove file</button>");
          var addAltText = Dropzone.createElement("<button class='btn-outline btn mr-2'>Add Alt Text</button>");
          
          addAltText.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            var askUserData = prompt("What is the alt text?");
            
            let existingData = fileData.get(file.name);
            existingData.alt = askUserData;
            fileData.set(file.name, existingData);
          });

          // Listen to the click event
          removeButton.addEventListener("click", function(e) {
            // Make sure the button click doesn't submit the form:
            e.preventDefault();
            e.stopPropagation();
            
            // Remove the file
            fetch('/upload', {
                method: 'DELETE',
                body: JSON.stringify({"key": fileData.get(file.name).content })
            }).then(response => {
              fileData.delete(file.name);
              fileDropzone.removeFile(file);
            });
          });
          file.previewElement.appendChild(addAltText);
          file.previewElement.appendChild(removeButton);
        });
        fileDropzone.on("success", function(file, response) {
          fileData.set(file.name, {content: response.data, alt: ""});
          this.createThumbnailFromUrl(file, response.data);
        });
      `}
      </script>

      <script>
        {html`
        // Handle form submission
        document.getElementById('postForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const content = document.getElementById('content').value;
          const scheduledDate = document.getElementById('scheduledDate').value;

          try {
            let postObject = {
                content,
                scheduledDate: new Date(scheduledDate).toISOString()
            };
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
            console.log(payload);
            const response = await fetch('/posts', {
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
              
              document.getElementById('success').classList.remove('hidden');
              document.getElementById('error').classList.add('hidden');
              document.getElementById('postForm').reset();
              loadPosts();
            } else {
              document.getElementById('error').textContent = data.error?.message || data.error || 'An error occurred';
              document.getElementById('error').classList.remove('hidden');
              document.getElementById('success').classList.add('hidden');
            }
          } catch (err) {
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('success').classList.add('hidden');
          }
        });

        // roundup minutes
        function roundMinutes(date) {
          const minutes = date.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 60) * 60;
          date.setMinutes(roundedMinutes);
          return date.toISOString().slice(0,16);
        }

        document.getElementById('scheduledDate').addEventListener('change', (e) => {
          const date = new Date(e.target.value);
          e.target.value = roundMinutes(date);
        });

        `}
      </script>
    </DashboardLayout>
  );
}