import winston, { transports } from "winston";

const logLevel = process.env.LOG_LEVEL || "info";

export const winstonLoggerOpts: winston.LoggerOptions = {
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "bullmq-exporter" },
  transports: [
    new transports.Console({
      level: logLevel,
    }),
  ],
};

const logger = winston.createLogger(winstonLoggerOpts);

export default logger;
