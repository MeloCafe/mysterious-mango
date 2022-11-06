import {
  create_proof,
  setup_generic_prover_and_verifier,
  StandardExampleProver,
  StandardExampleVerifier,
  verify_proof,
} from '@noir-lang/barretenberg/dest/client_proofs'
import { acir_from_bytes } from '@noir-lang/noir_wasm'
import Fastify, { FastifyInstance } from 'fastify'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { createSchema } from './db'
import { logger } from './logger'
import { getCollection } from './nfts'

const server: FastifyInstance = Fastify({ logger })

server.get('/', async () => {
  return { message: 'lfg' }
})

type CollectionQueryParams = { address: string; chainId: string }

server.get('/collection', async (req, reply) => {
  const { address, chainId } = req.query as CollectionQueryParams
  if (!address) {
    reply.code(400).send({ error: 'missing address' })
    return
  }

  // Default to mainnet.
  const networkId = chainId ? Number(chainId) : 1
  const collection = await getCollection(address, networkId)
  if (!collection) {
    reply.code(500).send({ error: 'collection fetch failed' })
    return
  }

  reply.send({ collection })
})

let acir: any
function getAcir() {
  if (acir) return acir
  const path = resolve(__dirname, './circuit.acir')
  const buffer = readFileSync(path)
  const acirByteArray = new Uint8Array(buffer)
  acir = acir_from_bytes(acirByteArray)
  return acir
}

async function getProver() {
  const acir = getAcir()

  return setup_generic_prover_and_verifier(acir)
}

server.get('/proof/governor/:governor/proposal/:proposal_id', async (req, reply) => {
  let prover: StandardExampleProver
  let verifier: StandardExampleVerifier
  try {
    ;[prover, verifier] = await getProver()
  } catch (error) {
    console.error('Failed to get circuit', error)
    return
  }

  const { governor, proposal_id } = req.params as { governor: string; proposal_id: string }

  const program_input = {
    governor,
    proposal_id,

    return: [governor, proposal_id],
  }

  const acir = getAcir()

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

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await server.register(require('@fastify/cors'), { origin: '*' })
    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
