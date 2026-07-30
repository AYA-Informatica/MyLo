import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'gray',
  },
};

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`,
  ),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json(),
);

const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: fileFormat,
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

winston.addColors(customLevels.colors);
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [consoleTransport, errorFileTransport, combinedFileTransport],
  exitOnError: false,
});

export const requestLogger = (req: Request): void => {
  const { method, url, ip, headers } = req;
  logger.http(`${method} ${url} - IP: ${ip} - User-Agent: ${headers['user-agent']}`);
};

export const errorLogger = (error: Error, context?: string): void => {
  logger.error(`${context ? `[${context}] ` : ''}${error.message}`, { stack: error.stack });
};

export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export const logPerformance = (label: string, startTime: [number, number]): void => {
  const diff = process.hrtime(startTime);
  const time = diff[0] * 1e3 + diff[1] * 1e-6;
  logger.debug(`Performance: ${label} - ${time.toFixed(2)}ms`);
};

export const logStartup = (port: number, env: string): void => {
  logger.info(`Server started on port ${port} in ${env} mode`);
  logger.info(`Local: http://localhost:${port}/health`);
  logger.info(`Local: http://localhost:${port}/docs`);
  logger.info('Press CTRL+C to stop server');
};

export const cleanOldLogs = (days = 30): void => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  fs.readdir(logDir, (err, files) => {
    if (err) {
      logger.error(`Error reading log directory: ${err.message}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(logDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          logger.error(`Error getting file stats: ${err.message}`);
          return;
        }

        if (stats.isFile() && stats.mtime < cutoffDate) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error(`Error deleting old log file: ${err.message}`);
              return;
            }
            logger.verbose(`Deleted old log file: ${file}`);
          });
        }
      });
    });
  });
};

export const infoLogger = (message: string, context?: string): void => {
  logger.info(`${context ? `[${context}] ` : ''}${message}`);
};

export { logger };
