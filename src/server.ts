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

import { createSchema, Multisigs, Proposals, Signatures } from './db'
import { logger } from './logger'
import { getCollection } from './nfts'
import { getVoteCount, recordSignature } from './operations'

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

type VoteRequestBody = {
  address: string
  proposal: string // prop ID
  signature: string
  vault: string // vault address
}

server.post('/vote', async (req, reply) => {
  const { address, proposal, signature, vault } = req.body as VoteRequestBody
  if (!address || !proposal || !signature || !vault) {
    reply.code(400).send({ error: 'incomplete vote' })
    return
  }

  const { proposalId } = await recordSignature(address, signature, vault, proposal)
  req.log.info({ address, proposal, vault }, 'Recorded new vote')

  const count = await getVoteCount(proposalId)
  req.log.info({ count }, 'Fetched votes')

  reply.send({ votes: count })
})

type VotesQuery = { proposal: string; vault: string }

server.get('/votes', async (req, reply) => {
  const { proposal, vault } = req.query as VotesQuery
  if (!proposal || !vault) {
    reply.code(400).send({ error: 'missing proposal or vault' })
    return
  }

  const multisig: any = await Multisigs.query().where('address', vault).first()
  if (!multisig) {
    reply.code(404).send({ error: 'no vault found' })
    return
  }

  const prop: any = await Proposals.query().where('multisigId', multisig.id).where('propId', proposal).first()
  if (!prop) {
    reply.code(404).send({ error: 'no proposal found' })
    return
  }

  const count = await Signatures.query().where('proposalId', prop.id).resultSize()
  reply.send({ votes: count })
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
