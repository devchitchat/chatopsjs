import { Command, createNativeResponse } from '../src/index.js'

export default async robot => {
  robot.commands.register(new Command({
    id: 'alerts.ack',
    description: 'Acknowledge an alert',
    handler: async () => createNativeResponse({
      fallbackText: 'Alert acknowledged',
      provider: 'discord',
      payload: {
        embeds: [
          {
            title: 'Alert acknowledged',
            description: 'The on-call alert has been acknowledged.',
            color: 5763719
          }
        ]
      }
    })
  }))
}
