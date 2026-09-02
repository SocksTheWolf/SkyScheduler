// like the appScripts file, this is used to allow us to cachepunch
// via a version query string
const CURRENT_STYLE_VERSION = "2.0.9";

export const getAppStyleStr = (styleName: string) =>
  `/css/${styleName}.min.css?v=${CURRENT_STYLE_VERSION}`;

export const mainStyleStr: string = getAppStyleStr("stylesheet");
export const dashboardStyleStr: string = getAppStyleStr("dashboard");
export const dependModsStyleStr: string = getAppStyleStr("depmods");
