
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV !== 'production'?"debug":"http",
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'errors.log', level: 'error' })
    ],
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    )


});

export default {
    error: (message: string) => logger.log('error', message),
    warn: (message: string) => logger.log('warn', message),
    info: (message: string) => logger.log('info', message),
    http: (message: string) => logger.log('http', message),
    verbose: (message: string) => logger.log('verbose', message),
    debug: (message: string) => logger.log('debug', message),
    silly: (message: string) => logger.log('silly', message),
    logger
}