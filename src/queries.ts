import { Multisig, Nonce } from './db'

const SIWE_MESSAGE = 'Welcome to melon mode'

/**
 * Multisigs
 */

export const createMultisig = (collection: string) => {
  return Multisig.query().insert({ collection })
}

/**
 * Nonces
 */

export const getPendingNonce = async (address: string) => {
  const res = await Nonce.query().where('address', address).where('used', false)
  return res[0]
}

export const createNonce = async (address: string) => {
  const timestamp = String(new Date().getTime())
  const message = SIWE_MESSAGE

  await Nonce.query().insert({
    address,
    message,
    value: timestamp,
  })

  return { message: `${message} ${timestamp}` }
}
