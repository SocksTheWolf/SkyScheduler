import { createMiddleware } from "hono/factory";
import { html } from "hono/html";
import { APP_NAME } from "../appInfo";
import type { BaseContext, NextMiddleware } from "../types";
import { isInMaintenance } from "../utils/helpers";

interface MaintenanceProps {
  html?: boolean;
}

export const maintenanceMiddleware = (prop: MaintenanceProps) => {
  return createMiddleware(async (c: BaseContext, next: NextMiddleware) => {
    if (isInMaintenance(c.env)) {
      const msg = `${APP_NAME} is currently in maintenance, please try again in a moment...`;
      c.header("HX-Trigger", `{"rateLimitNotice": "${msg}"}`);
      if (prop.html) {
        return c.html(html`<b class="btn-error">${msg}</b>`, 429);
      } else {
        return c.json({ok: false, msg: msg}, 429);
      }
    }
    await next();
  });
};

export const maintainMiddleware = maintenanceMiddleware({});
export const maintainMiddlewareHTML = maintenanceMiddleware({html: true});