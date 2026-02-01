// Change this value to break out of any caching that might be happening
// for the runtime scripts (ex: main.js & postHelper.js)
export const CURRENT_SCRIPT_VERSION: string = "1.3.8";

export const getAppScriptStr = (scriptName: string) => `/js/${scriptName}.min.js?v=${CURRENT_SCRIPT_VERSION}`;

// Eventually make this automatically generated.
export const postHelperScriptStr: string = getAppScriptStr("postHelper");
export const repostHelperScriptStr: string = getAppScriptStr("repostHelper");
export const mainScriptStr: string = getAppScriptStr("main");
export const settingsScriptStr: string = getAppScriptStr("settings");

export const appScriptStrs = [postHelperScriptStr, repostHelperScriptStr, mainScriptStr, settingsScriptStr];