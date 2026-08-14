export const minifyOptions = {
  js: {
    type: "terser",
    terser: {
      mangle: {
        toplevel: true,
        reserved: [
          "pushToast",
          "addKeyboardListener",
          "addClickKeyboardListener",
          "easySetup",
          "addUsernameFieldWatchers",
          "translateErrorObject",
          "openAltText",
          "openPostAltEditor",
          "updateUsername"
        ]
      }
    }
  }
};