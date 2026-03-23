import { Command, createMessageResponse } from '../src/index.js'

export default async robot => {
  robot.commands.register(new Command({
    id: 'tickets.list',
    aliases: ['ticket.list'],
    description: 'List open tickets',
    handler: async () => createMessageResponse({
      fallbackText: 'Open tickets: api-latency, broken-login',
      blocks: [
        {
          type: 'section',
          text: 'Open tickets'
        },
        {
          type: 'facts',
          items: [
            { label: '1', value: 'api-latency' },
            { label: '2', value: 'broken-login' }
          ]
        }
      ]
    })
  }))
}
