import { Command } from '../../../src/index.js'

export default async robot => {
  robot.commands.register(new Command({
    id: 'tickets.list',
    aliases: ['ticket.list'],
    description: 'List tickets',
    handler: async () => null
  }))
}
