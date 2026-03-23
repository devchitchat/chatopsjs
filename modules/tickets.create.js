import { Command, createTextResponse } from '../src/index.js'

export default async robot => {
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
    handler: async ctx => createTextResponse(`Created ticket ${ctx.args.title}`)
  }))
}
