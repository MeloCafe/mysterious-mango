import * as dotenv from 'dotenv'
import Knex from 'knex'
import { knexSnakeCaseMappers, Model } from 'objection'

dotenv.config()

const knex = Knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DB_CONNECTION,
    ssl: process.env.NODE_ENV !== 'development',
  },
  ...knexSnakeCaseMappers(),
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
      table.string('address').unique()
      table.string('collection')
      table.timestamps(true, true, true)
    })
  }

  if (!(await knex.schema.hasTable('proposals'))) {
    await knex.schema.createTable('proposals', (table) => {
      table.increments('id').primary()
      table.string('prop_id').notNullable()
      table.integer('start_block')
      table.integer('deadline')
      table.string('title')
      table.string('description')
      table.timestamps(true, true, true)
      table.integer('multisig_id').references('multisigs.id')
    })
  }

  if (!(await knex.schema.hasTable('signatures'))) {
    await knex.schema.createTable('signatures', (table) => {
      table.increments('id').primary()
      table.string('address')
      table.string('data')
      table.timestamps(true, true, true)
      table.integer('proposal_id').references('proposals.id')
    })
  }
}
