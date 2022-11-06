import { Multisigs, Proposals, Signatures } from './db'

export async function recordSignature(address: string, data: string, vault: string, proposal: string) {
  // TODO: validate the signature/address.

  // Try and get vault, create if none.
  let multisig: any = await Multisigs.query().where('address', vault).first()
  if (!multisig) {
    multisig = await Multisigs.query().insert({ address: vault }).returning('*')
  }

  // Try and get proposal, create if none.
  let prop: any = await Proposals.query().where('multisigId', multisig.id).where('propId', proposal).first()
  if (!prop) {
    prop = await Proposals.query()
      .insert({
        propId: proposal,
        multisigId: multisig.id,
      })
      .returning('*')
  }

  // See if this address has signed this proposal.
  let sig: any = await Signatures.query().where('address', address).where('proposalId', prop.id).first()
  if (sig) {
    throw new Error('already signed')
  }

  // If not, insert.
  sig = await Signatures.query()
    .insert({
      address,
      data,
      proposalId: prop.id,
    })
    .returning('*')

  return {
    proposalId: prop.id,
    vaultId: multisig.id,
  }
}

export async function getVoteCount(proposalId: number): Promise<number> {
  const query = Signatures.query().where('proposalId', proposalId)
  return query.resultSize()
}
