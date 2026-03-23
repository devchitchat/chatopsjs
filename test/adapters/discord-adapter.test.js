import { describe, expect, test } from 'bun:test'

import { DiscordAdapter, messageToEnvelope } from '../../examples/discord/adapter.js'
import {
  createMessageResponse,
  createNativeResponse,
  createTextResponse
} from '../../src/index.js'

function makeAdapter(sends = []) {
  const mockClient = {
    channels: {
      fetch: async () => ({
        send: async payload => { sends.push(payload) }
      })
    }
  }
  const robot = { receive: async () => {}, listen: async () => {} }
  return new DiscordAdapter(robot, mockClient, { prefix: '!', token: 'test' })
}

describe('discord adapter', () => {
  test('normalizes a Discord message into an envelope', () => {
    const envelope = messageToEnvelope(
      {
        id: 'm-1',
        content: '!tickets.create --title "Broken login"',
        author: { id: 'u-1', bot: false },
        member: {
          permissions: {
            has(permission) { return permission === 'ManageMessages' }
          }
        },
        channelId: 'c-1',
        guildId: 'g-1'
      },
      'discord',
      '!',
      ['ManageMessages', 'ManageThreads', 'Administrator']
    )

    expect(envelope).toEqual({
      adapter: 'discord',
      type: 'message',
      text: 'tickets.create --title "Broken login"',
      isCommand: true,
      actor: {
        id: 'u-1',
        permissions: ['discord.permission.ManageMessages', 'tickets:write']
      },
      channel: { id: 'c-1', guildId: 'g-1' },
      rawEvent: { messageId: 'm-1' }
    })
  })

  test('ignores bot messages', () => {
    const botEnvelope = messageToEnvelope(
      { content: '!tickets.list', author: { id: 'bot-1', bot: true } },
      'discord', '!', []
    )

    expect(botEnvelope).toBeNull()
  })

  test('returns envelope with isCommand false for non-prefixed messages', () => {
    const envelope = messageToEnvelope(
      { content: 'tickets.list', author: { id: 'u-1', bot: false }, channelId: 'c-1', guildId: null },
      'discord', '!', []
    )

    expect(envelope).not.toBeNull()
    expect(envelope.isCommand).toBe(false)
    expect(envelope.text).toBe('tickets.list')
  })

  test('sends text, structured, and discord-native responses', async () => {
    const sends = []
    const adapter = makeAdapter(sends)
    const envelope = { channel: { id: 'c-1' } }

    await adapter.send(envelope, createTextResponse('hello'))
    await adapter.send(envelope, createMessageResponse({
      fallbackText: 'Created ticket',
      blocks: [
        { type: 'section', text: 'Created ticket' },
        { type: 'facts', items: [{ label: 'Owner', value: 'infra' }] }
      ]
    }))
    await adapter.send(envelope, createNativeResponse({
      fallbackText: 'Alert acknowledged',
      provider: 'discord',
      payload: { embeds: [{ title: 'Alert acknowledged' }] }
    }))

    expect(sends).toEqual([
      { content: 'hello' },
      {
        content: 'Created ticket',
        embeds: [{ description: 'Created ticket', fields: [{ inline: true, name: 'Owner', value: 'infra' }] }]
      },
      { content: 'Alert acknowledged', embeds: [{ title: 'Alert acknowledged' }] }
    ])
  })
})
