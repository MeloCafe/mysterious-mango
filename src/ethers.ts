import { hashMessage, recoverAddress } from 'ethers/lib/utils'

export const validateSignature = (address: string, message: string, nonce: string, signed: string): boolean => {
  const hash = hashMessage(`${message} ${nonce}`)
  return recoverAddress(hash, signed) === address
}
