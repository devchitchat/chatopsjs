import {
  createCommand,
  createNativeResponse
} from '../src/index.js'

export default createCommand({
  id: 'alerts.ack',
  description: 'Acknowledge an alert',
  execute: async () => createNativeResponse({
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
})
