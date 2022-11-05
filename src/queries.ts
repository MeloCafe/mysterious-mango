import { Multisigs } from './db'

export const createMultisig = (collection: string) => {
  return Multisigs.query().insert({ collection })
}
