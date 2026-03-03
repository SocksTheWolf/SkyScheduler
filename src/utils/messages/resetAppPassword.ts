import { APP_NAME } from "../../siteinfo";

export function resetAppPasswordMessage() {
  return `Hey there! This is an automated message to let you know
  that your ${APP_NAME} account is no longer automatically posting.

  This occurs when your BSky App Password either expires or gets deleted.
  If you did not mean to do this, log back onto ${APP_NAME} and provide
  an updated BSky app password in the "Account Settings" section of the
  dashboard.

  This message can only be seen by you. If you no longer want to use
  ${APP_NAME} or don't need to for awhile, no worries! This bot will
  only send you this message once (unless you password expires again).`;
};