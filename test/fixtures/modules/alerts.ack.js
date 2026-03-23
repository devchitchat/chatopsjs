import { Command } from '../../../src/index.js'

export default async robot => {
  robot.commands.register(new Command({
    id: 'alerts.ack',
    description: 'Acknowledge an alert',
    handler: async () => null
  }))
}
