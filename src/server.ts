import Fastify, { FastifyInstance } from 'fastify'
import { validateHeaderName } from 'http'

import { createSchema } from './db'
import { logger } from './logger'
import { getCollection } from './nfts'
import { createNonce, getPendingNonce } from './queries'
import { validateSignature } from './web3'

const server: FastifyInstance = Fastify({ logger })

server.get('/', async () => {
  return { message: 'lfg' }
})

/**
 * Sign in with Ethereum handling.
 */

type NonceRequestBody = { address: string }

server.post('/nonce', async (req, reply) => {
  const address = (req.body as NonceRequestBody).address
  if (!address) {
    reply.code(400).send({ error: 'missing address' })
    return
  }

  // Check for existing pending nonces.
  const pending = (await getPendingNonce(address)) as any

  if (pending) {
    req.log.info({ address }, 'Found existing pending nonce for address')
    const message = `${pending.message} ${pending.value}`
    reply.send({ message })
  }

  // Generate a new nonce and return the message.
  const message = await createNonce(address)
  req.log.info({ address }, 'Generated nonce for address')

  reply.send(message)
})

type SIWERequestBody = { address: string; message: string }

server.post('/siwe', async (req, reply) => {
  const { address, message } = req.body as SIWERequestBody
  if (!address || !message) {
    reply.code(400).send({ error: 'missing address or message' })
    return
  }

  const pending = (await getPendingNonce(address)) as any
  if (!pending) {
    reply.code(400).send({ error: 'no pending nonce found' })
    return
  }

  const valid = validateSignature(address, pending.message, pending.value, message)
  if (!valid) {
    reply.code(401).send({ error: 'invalid signature' })
    return
  }
})

/**
 * Fetches collection information from OpenSea.
 */

type CollectionRequestQuery = { address: string }

server.get('/collection', async (req, reply) => {
  const address = (req.query as CollectionRequestQuery).address
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
