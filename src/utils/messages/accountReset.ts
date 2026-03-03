import { APP_NAME, SITE_URL } from "../../siteinfo";

export function createPasswordResetMessage(url: string, token: string) {
  return `Your ${APP_NAME} password reset url is:
${SITE_URL}/reset-password/${token}

This URL will expire in about an hour.

If you did not request a password reset, please ignore this message.`;
};