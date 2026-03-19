import { createCommand, definePlugin } from '../../../src/index.js'

export default definePlugin({
  name: 'tickets',
  version: '1.0.0',
  commands: [
    createCommand({
      id: 'tickets.list',
      aliases: ['ticket.list'],
      description: 'List tickets',
      execute: async () => null
    })
  ]
})
