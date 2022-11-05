import * as dotenv from 'dotenv'
import Fastify, { FastifyInstance } from 'fastify'

dotenv.config()

const server: FastifyInstance = Fastify({ logger: true })

server.get('/', async () => {
  return { message: 'lfg' }
})

// Start the server.
const start = async () => {
  try {
    const port = Number(process.env.PORT || 4000)

    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
