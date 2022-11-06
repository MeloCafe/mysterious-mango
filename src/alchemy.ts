import { Alchemy, Network } from 'alchemy-sdk'
import dotenv from 'dotenv'

dotenv.config()

const ALCHEMY_KEY = process.env.ALCHEMY_KEY
if (!ALCHEMY_KEY) {
  throw new Error('Alchemy key is required')
}

const settings = {
  apiKey: ALCHEMY_KEY,
  network: Network.ETH_MAINNET,
}

export const ALCHEMY_NFT_API_URL_MAINNET = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}`
export const ALCHEMY_NFT_API_URL_GOERLI = `https://eth-goerli.g.alchemy.com/nft/v2/${ALCHEMY_KEY}`

export const alchemy = new Alchemy(settings)

export function getAPIUrl(networkId: number) {
  // TODO: Support more.
  switch (networkId) {
    case 5:
      return ALCHEMY_NFT_API_URL_GOERLI
    case 1:
    default:
      return ALCHEMY_NFT_API_URL_MAINNET
  }
}
