// =============================================================
// src/config/logger.js — Winston Logger
// =============================================================

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Console format for development
const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let log = `${ts} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

const transports = [
  // Console
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat,
    ),
    silent: process.env.NODE_ENV === 'test',
  }),
];

// File transports only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    // Error log
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      format: combine(errors({ stack: true }), timestamp(), json()),
    }),
    // Combined log
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      maxSize: '50m',
      format: combine(errors({ stack: true }), timestamp(), json()),
    }),
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp()),
  transports,
  exitOnError: false,
});

module.exports = logger;
