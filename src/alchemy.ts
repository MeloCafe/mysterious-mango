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

export const ALCHEMY_NFT_API_URL = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_KEY}`

export const alchemy = new Alchemy(settings)
