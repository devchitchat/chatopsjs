import { describe, expect, test } from 'bun:test'

import {
  createDiscordAdapter,
  createDiscordMessageEvent
} from '../../examples/discord/adapter.js'
import {
  createMessageResponse,
  createNativeResponse,
  createTextResponse
} from '../../src/index.js'

describe('discord adapter', () => {
  test('normalizes a Discord message into a runtime event', () => {
    const event = createDiscordMessageEvent({
      adapterName: 'discord',
      message: {
        id: 'm-1',
        content: '!tickets.create --title "Broken login"',
        author: {
          id: 'u-1',
          bot: false
        },
        member: {
          permissions: {
            has(permission) {
              return permission === 'ManageMessages'
            }
          }
        },
        channelId: 'c-1',
        guildId: 'g-1'
      },
      prefix: '!'
    })

    expect(event).toEqual({
      adapter: 'discord',
      type: 'message',
      text: 'tickets.create --title "Broken login"',
      actor: {
        id: 'u-1',
        permissions: ['discord.permission.ManageMessages', 'tickets:write']
      },
      channel: {
        id: 'c-1',
        guildId: 'g-1'
      },
      rawEvent: {
        messageId: 'm-1'
      }
    })
  })

  test('ignores bot messages and messages without the configured prefix', () => {
    const botEvent = createDiscordMessageEvent({
      message: {
        content: '!tickets.list',
        author: {
          id: 'bot-1',
          bot: true
        }
      },
      prefix: '!'
    })

    const noPrefixEvent = createDiscordMessageEvent({
      message: {
        content: 'tickets.list',
        author: {
          id: 'u-1',
          bot: false
        }
      },
      prefix: '!'
    })

    expect(botEvent).toBeNull()
    expect(noPrefixEvent).toBeNull()
  })

  test('delivers text, structured, and discord-native responses', async () => {
    const sends = []
    const adapter = createDiscordAdapter({
      prefix: '!',
      resolveChannel(messageEvent) {
        return {
          async send(payload) {
            sends.push(payload)
          }
        }
      }
    })

    await adapter.deliver({
      event: {
        channel: {
          id: 'c-1'
        }
      },
      response: createTextResponse('hello')
    })

    await adapter.deliver({
      event: {
        channel: {
          id: 'c-1'
        }
      },
      response: createMessageResponse({
        fallbackText: 'Created ticket',
        blocks: [
          {
            type: 'section',
            text: 'Created ticket'
          },
          {
            type: 'facts',
            items: [
              {
                label: 'Owner',
                value: 'infra'
              }
            ]
          }
        ]
      })
    })

    await adapter.deliver({
      event: {
        channel: {
          id: 'c-1'
        }
      },
      response: createNativeResponse({
        fallbackText: 'Alert acknowledged',
        provider: 'discord',
        payload: {
          embeds: [
            {
              title: 'Alert acknowledged'
            }
          ]
        }
      })
    })

    expect(sends).toEqual([
      {
        content: 'hello'
      },
      {
        content: 'Created ticket',
        embeds: [
          {
            description: 'Created ticket',
            fields: [
              {
                inline: true,
                name: 'Owner',
                value: 'infra'
              }
            ]
          }
        ]
      },
      {
        content: 'Alert acknowledged',
        embeds: [
          {
            title: 'Alert acknowledged'
          }
        ]
      }
    ])
  })
})
