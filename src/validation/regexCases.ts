// from https://stackoverflow.com/a/18494710
export const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/i;

export const appPasswordRegex = /([0-9a-z]{4}-){3}[0-9a-z]{4}/i;
