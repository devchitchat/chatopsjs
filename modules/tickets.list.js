import {
  createCommand,
  createMessageResponse
} from '../src/index.js'

export default createCommand({
  id: 'tickets.list',
  aliases: ['ticket.list'],
  description: 'List open tickets',
  execute: async () => createMessageResponse({
    fallbackText: 'Open tickets: api-latency, broken-login',
    blocks: [
      {
        type: 'section',
        text: 'Open tickets'
      },
      {
        type: 'facts',
        items: [
          {
            label: '1',
            value: 'api-latency'
          },
          {
            label: '2',
            value: 'broken-login'
          }
        ]
      }
    ]
  })
})
