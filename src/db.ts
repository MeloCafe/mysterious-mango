import * as dotenv from 'dotenv'
import Knex from 'knex'
import { Model } from 'objection'

dotenv.config()

const knex = Knex({
  client: 'pg',
  connection: process.env.DB_CONNECTION,
})

Model.knex(knex)

/**
 * MODELS
 */

export class Multisigs extends Model {
  static get tableName(): string {
    return 'multisigs'
  }
}

export class Proposals extends Model {
  static get tableName(): string {
    return 'proposals'
  }

  static get relationMappings() {
    return {
      children: {
        relation: Model.BelongsToOneRelation,
        modelClass: Multisigs,
        join: {
          from: 'proposals.multisigId',
          to: 'multisigs.id',
        },
      },
    }
  }
}

export class Signatures extends Model {
  static get tableName(): string {
    return 'signatures'
  }

  static get relationMappings() {
    return {
      children: {
        relation: Model.BelongsToOneRelation,
        modelClass: Proposals,
        join: {
          from: 'signatures.proposalId',
          to: 'proposals.id',
        },
      },
    }
  }
}

// TODO: Move this to knex migrations.
export async function createSchema() {
  if (!(await knex.schema.hasTable('multisigs'))) {
    await knex.schema.createTable('multisigs', (table) => {
      table.increments('id').primary()
      table.string('collection')
      table.timestamps(true, true, true)
    })
  }

  if (!(await knex.schema.hasTable('proposals'))) {
    await knex.schema.createTable('proposals', (table) => {
      table.increments('id').primary()
      table.integer('startBlock')
      table.integer('deadline')
      table.string('text')
      table.timestamps(true, true, true)
      table.integer('multisigId').references('multisigs.id')
    })
  }

  if (!(await knex.schema.hasTable('signatures'))) {
    await knex.schema.createTable('signatures', (table) => {
      table.increments('id').primary()
      table.string('address')
      table.string('data')
      table.timestamps(true, true, true)
      table.integer('proposalId').references('proposals.id')
    })
  }
}
