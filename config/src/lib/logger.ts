/**
 * Structured logging utility for production
 * Replaces console.log with environment-aware logging
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const logLevel = import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? 'debug' : 'warn');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const currentLogLevel: LogLevel = (logLevel in LOG_LEVELS) ? logLevel as LogLevel : 'warn';

// Format log message with timestamp and level
const formatMessage = (level: LogLevel, message: string, ...args: any[]): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (args.length > 0) {
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message), ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.info) {
      console.info(formatMessage('info', message), ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message), ...args);
    }
  },

  error: (message: string, ...args: any[]) => {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.error) {
      console.error(formatMessage('error', message), ...args);
    }
  },
};

export default logger;
