import {
  createCommand,
  createTextResponse
} from '../src/index.js'

export default createCommand({
  id: 'tickets.create',
  aliases: ['ticket.create'],
  description: 'Create a support ticket',
  args: {
    title: {
      type: 'string',
      required: true
    }
  },
  permissions: ['tickets:write'],
  confirm: {
    mode: 'required',
    message: 'Create ticket? Reply with "yes" to confirm or "no" to cancel.'
  },
  execute: async ctx => createTextResponse(`Created ticket ${ctx.args.title}`)
})
