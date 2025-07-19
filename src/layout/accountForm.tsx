import { html } from "hono/html";

export default function ProcessAccountForm(props: any) {
  const loadingText:string = props.text;
  const delayRedirect:number = 2000;
  return (
    <center>
      <span aria-busy="true" id="loading" hidden>{loadingText}</span>
      <script type="text/javascript">
      {html`
        function redirectAfterDelay(url) {
          setTimeout(function() {
            window.location.href = url;
          }, ${delayRedirect});
        }
        function rawSubmitHandler(url, successCallback) {
          const loadingBar = document.getElementById("loading");
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            loadingBar.removeAttribute("hidden");
            let postObject = {};
            document.querySelectorAll("input").forEach((el) => {
              postObject[el.name] = el.value;
            });
            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                 },
                body: JSON.stringify(postObject)
              });

              // Hide loading bar after delay
              setTimeout(function() {
                loadingBar.setAttribute("hidden", true);
              }, ${delayRedirect/2});

              if (response.ok)
                successCallback();
              else {
                const data = await response.json();
                pushToast(data.msg || data.message, false);
              }
            } catch (err) {
              pushToast("An error occurred", false);
              console.error(err);
            }
          });
        }
        function easySetup(url, successMessage, successLocation) {
          addUnicodeRemoval();
          rawSubmitHandler(url, function() {
            pushToast(successMessage, true);
            redirectAfterDelay(successLocation);
          });
        }
      `}
      </script>
    </center>
  );
}