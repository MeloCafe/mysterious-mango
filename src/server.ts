import Fastify, { FastifyInstance } from 'fastify'

import { createSchema } from './db'
import { logger } from './logger'
import { getCollection } from './nfts'

import {
  setup_generic_prover_and_verifier,
  create_proof,
  StandardExampleProver,
  StandardExampleVerifier,
  verify_proof,
} from '@noir-lang/barretenberg/dest/client_proofs'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { acir_from_bytes } from '@noir-lang/noir_wasm'

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

function path_to_uint8array(path: string) {
  const buffer = readFileSync(path)
  return new Uint8Array(buffer)
}

async function getProver() {
  const path = resolve(__dirname, './circuit.acir')
  console.log('path of the circuit', path)
  const acirByteArray = path_to_uint8array(path)
  const acir = acir_from_bytes(acirByteArray)
  console.log('circuit', acir)

  return setup_generic_prover_and_verifier(acir)
}

server.get('/proof/governor/:governor/proposal/:proposal_id', async (req, reply) => {
  console.info('getting the prover')

  let prover: StandardExampleProver
  let verifier: StandardExampleVerifier
  try {
    ;[prover, verifier] = await getProver()
  } catch (error) {
    console.error('Failed to get circuit', error)
    return
  }

  console.log('got the prover', prover)

  const { governor, proposal_id } = req.params as any

  console.info({ params: req.params })

  const program_input = {
    governor,
    proposal_id,
    votes: [1, 2],

    return: [governor, proposal_id],
  }

  const acirByteArray = path_to_uint8array(resolve(__dirname, './circuit.acir'))
  const acir = acir_from_bytes(acirByteArray)

  try {
    const proof: Buffer = await create_proof(prover, acir, program_input)

    const verified = await verify_proof(verifier, proof)
    if (!verified) {
      reply.statusCode = 400
      reply.send({ error: 'invalid proof' })
    } else {
      reply.send({ proof: proof.toString('hex') })
    }
  } catch (error) {
    console.error({ error }, 'failed to generate proof')
  }
})

// Start the server.
const start = async () => {
  try {
    server.log.info('migrating database')
    await createSchema()
    server.log.info('database initialized')

    const port = Number(process.env.PORT || 4000)

    await server.register(require('@fastify/cors'), { origin: '*' })
    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
