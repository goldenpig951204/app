const winston = require("winston");
require("winston-daily-rotate-file");
const moment = require("moment");
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.simple(),
  winston.format.splat(),
  winston.format.printf(
    (msg) =>
      `[${msg.level}] ${moment
        .utc(msg.timestamp)
        .format("DD/MM/YYYY hh:mm:ss")} ${msg.message}`
  )
);

const transport = new winston.transports.DailyRotateFile({
  filename: "logs/semrush-%DATE%.log",
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: false,
  maxSize: "500k",
  maxFiles: "7d", // Auto delete the log after 7 days
});

const semrushLog = winston.createLogger({
  format: productionFormat,
  transports: [transport],
});

const serverLog = winston.createLogger({
  format: productionFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/server-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: false,
      maxSize: "500k",
      maxFiles: "7d", // Auto delete the log after 7 days
    }),
  ],
});

const ahrefLog = winston.createLogger({
  format: productionFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/ahref-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: false,
      maxSize: "500k",
      maxFiles: "7d", // Auto delete the log after 7 days
    }),
  ],
});

module.exports = {
  semrushLog,
  serverLog,
  ahrefLog,
};
