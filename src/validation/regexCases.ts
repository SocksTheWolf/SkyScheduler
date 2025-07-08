// from https://regexpattern.com/domain-name/
export const usernameRegex = /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/i;

export const appPasswordRegex = /([0-9a-z]{4}-){3}[0-9a-z]{4}/i;
