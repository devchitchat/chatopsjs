import { Command, createMessageResponse, createTextResponse } from '../../src/index.js'

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
          items: tickets.reduce((acc, current) =>{
            acc.push({label: 'title', value: current.title })
            acc.push({label: 'time', value: current.time})
            return acc
          }, [])
        }
      ]
    })
  }))

  const tickets = []
  robot.commands.register(new Command({
    id: 'tickets.create',
    aliases: ['ticket.create'],
    description: 'Create a support ticket',
    args: {
      title: { type: 'string', required: true }
    },
    permissions: ['tickets:write'],
    confirm: {
      mode: 'required',
      message: 'Create ticket? Reply with "yes" to confirm or "no" to cancel.'
    },
    handler: async ctx => {
      tickets.push({title: ctx.args.title, time: new Date()})
      return createTextResponse(`Created ticket ${ctx.args.title}`)
    }
  }))

}
