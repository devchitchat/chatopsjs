import { createTextResponse } from '../../src/index.js'
import { createDiscordAdapter } from './adapter.js'
import { createDiscordExampleRuntime } from './runtime.js'

export async function runAdapterApp({
  token = process.env.DISCORD_TOKEN,
  prefix = process.env.DISCORD_PREFIX ?? '!'
} = {}) {
  if (!token) {
    throw new Error('Missing DISCORD_TOKEN')
  }

  let discordJs

  try {
    discordJs = await import('discord.js')
  } catch {
    throw new Error('Missing dependency "discord.js". Run "bun install" before starting the Discord adapter.')
  }

  const { Client, Events, GatewayIntentBits } = discordJs

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  })

  const adapter = createDiscordAdapter({
    prefix,
    resolveChannel(event) {
      return client.channels.fetch(event.channel.id)
    }
  })

  const runtime = await createDiscordExampleRuntime({ adapter })
  const pendingConfirmations = new Map()

  function createPendingKey(event) {
    return `${event.actor.id}:${event.channel.id}`
  }

  async function deliverResult(event, result) {
    if (!result?.response) {
      return
    }

    await adapter.deliver({
      event,
      response: result.response
    })
  }

  client.once(Events.ClientReady, readyClient => {
    console.log(`Discord adapter connected as ${readyClient.user.tag}`)
    console.log(`Prefix: ${prefix}`)
  })

  client.on(Events.MessageCreate, async message => {
    try {
      const normalized = adapter.createEvent(message)
      if (!normalized) {
        return
      }

      const pendingKey = createPendingKey(normalized)
      const lowerText = normalized.text.toLowerCase()

      if (pendingConfirmations.has(pendingKey) && ['yes', 'y', 'no', 'n'].includes(lowerText)) {
        if (['no', 'n'].includes(lowerText)) {
          pendingConfirmations.delete(pendingKey)
          await adapter.deliver({
            event: normalized,
            response: createTextResponse('Cancelled pending command')
          })
          return
        }

        const pendingEvent = pendingConfirmations.get(pendingKey)
        pendingConfirmations.delete(pendingKey)
        const confirmed = await runtime.handleEvent({
          ...pendingEvent,
          confirmation: {
            approved: true
          }
        })
        await deliverResult(normalized, confirmed)
        return
      }

      const result = await runtime.handleEvent(normalized)

      if (!result.ok && result.error?.code === 'confirmation_required') {
        pendingConfirmations.set(pendingKey, normalized)
      }

      await deliverResult(normalized, result)
    } catch (error) {
      console.error('Discord adapter failed to handle message', error)
    }
  })

  await client.login(token)
}
