import * as app from "./index";
import buildStaticSite from "./utils/build";

await buildStaticSite(app.default.getApp());