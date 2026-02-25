// Change this value to break out of any caching that might be happening
// for the runtime scripts (ex: main.js & postHelper.js)
export const CURRENT_SCRIPT_VERSION: string = "1.5.7";

export const getAppScriptStr = (scriptName: string) => `/js/${scriptName}.min.js?v=${CURRENT_SCRIPT_VERSION}`;

// Eventually make this automatically generated.
export const mainScriptStr: string = getAppScriptStr("main");
export const dashboardScriptStr: string = getAppScriptStr("app");
export const settingsScriptStr: string = getAppScriptStr("settings");