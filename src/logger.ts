import dotenv from 'dotenv'
import pino, { Logger } from 'pino'

dotenv.config()

let logger: Logger

if (process.env.NODE_ENV === 'development') {
  logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  })
} else {
  logger = pino({
    level: 'info',
  })
}

export { logger }
