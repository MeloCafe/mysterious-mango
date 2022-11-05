import Fastify, { FastifyInstance } from 'fastify'

import { createSchema } from './db'
import { logger } from './logger'
import { getCollection } from './nfts'

const server: FastifyInstance = Fastify({ logger })

server.get('/', async () => {
  return { message: 'lfg' }
})

server.get('/collection', async (req, reply) => {
  const address = (req.query as any).address
  if (!address) {
    reply.code(400).send({ error: 'missing address' })
    return
  }

  const collection = await getCollection(address)
  if (!collection) {
    reply.code(500).send({ error: 'collection fetch failed' })
    return
  }

  reply.send({ collection })
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
