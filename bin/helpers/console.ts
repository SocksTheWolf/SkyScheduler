// very, very, very, quick and dirty log level system
export enum LogLevel {
  debug,
  log,
  warn,
  error
};

let current_log_level: LogLevel = LogLevel.log;

function makeLog(l: LogLevel, text: string) {
  if (l >= current_log_level) {
    switch (l) {
      case LogLevel.debug:
        console.debug(text);
      break;
      default:
      case LogLevel.log:
        console.log(text);
      break;
      case LogLevel.warn:
        console.warn(text);
      break;
      case LogLevel.error:
        console.error(text);
      break;
    }
  }
}

export const log = (text: string) => { makeLog(LogLevel.log, text); };
export const debug = (text: string) => { makeLog(LogLevel.debug, text); };
export const warn = (text: string) => { makeLog(LogLevel.warn, text); };
export const error = (text: string) => { makeLog(LogLevel.error, text); };
export const setLevel = (setTo: LogLevel) => {
  current_log_level = setTo;
};
export const getLevel = () => current_log_level;