import { createCommand } from '../../../src/index.js'

export const command = createCommand({
  id: 'alerts.ack',
  description: 'Acknowledge an alert',
  execute: async () => null
})
