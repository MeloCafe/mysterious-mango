/**
 * Alchemy integration for retrieving NFT data.
 */

import got from 'got'

import { ALCHEMY_NFT_API_URL } from './alchemy'
import { logger } from './logger'
import { NFTCollection, NFTTokenType } from './types'

export const getCollection = async (address: string): Promise<NFTCollection | undefined> => {
  try {
    const params = new URLSearchParams({ contractAddress: address })
    const url = `${ALCHEMY_NFT_API_URL}/getContractMetadata?${params.toString()}`
    const data = (await got.get(url).json()) as any

    logger.info({ collection: data }, 'Fetched collection')

    const collection: NFTCollection = {
      address,
      name: data.contractMetadata.name,
      symbol: data.contractMetadata.symbol,
      supply: Number(data.contractMetadata.totalSupply || '0'),
      imageUrl: data.contractMetadata.openSea?.imageUrl,
      description: data.contractMetadata.openSea?.description,
      type: data.contractMetadata.tokenType as NFTTokenType,
    }

    return collection
  } catch (err) {
    logger.error({ address, err }, 'Error fetching collection')
    return undefined
  }
}
