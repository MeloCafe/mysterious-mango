export type NFTTokenType = 'ERC721' | 'ERC1155'

export interface NFTCollection {
  address: string
  name?: string
  symbol?: string
  supply?: number
  imageUrl?: string
  description?: string
  type: NFTTokenType
}
