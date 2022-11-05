import Fastify, { FastifyInstance } from 'fastify'

import { createSchema } from './db'

const server: FastifyInstance = Fastify({ logger: true })

server.get('/', async () => {
  return { message: 'lfg' }
})

// Start the server.
const start = async () => {
  try {
    server.log.info('migrating database')
    await createSchema()
    server.log.info('database initialized')

    const port = Number(process.env.PORT || 4000)

    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
