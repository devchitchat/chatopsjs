import { Adapter } from '../../src/index.js'

function trimPrefix(text = '', prefix = '!') {
  if (!text.startsWith(prefix)) return null
  return text.slice(prefix.length).trim()
}

function createDiscordPermissionList(member, permissionNames) {
  if (!member?.permissions || typeof member.permissions.has !== 'function') return []
  const mapped = permissionNames
    .filter(p => member.permissions.has(p))
    .map(p => `discord.permission.${p}`)
  if (member.permissions.has('ManageMessages')) mapped.push('tickets:write')
  return mapped
}

export function messageToEnvelope(message, adapterName, prefix, permissionNames) {
  if (!message || message.author?.bot) return null
  const rawText = message.content ?? ''
  const commandText = trimPrefix(rawText, prefix)
  const isCommand = commandText !== null
  return {
    adapter: adapterName,
    type: 'message',
    text: isCommand ? commandText : rawText,
    isCommand,
    actor: {
      id: message.author.id,
      permissions: createDiscordPermissionList(message.member, permissionNames)
    },
    channel: {
      id: message.channelId,
      guildId: message.guildId ?? null
    },
    rawEvent: { messageId: message.id }
  }
}

function toDiscordPayload(message) {
  if (message?.native?.provider === 'discord') {
    return { content: message.text, ...message.native.payload }
  }

  if (message?.blocks?.length > 0) {
    const section = message.blocks.find(b => b.type === 'section')
    const fields = message.blocks.flatMap(b => {
      if (b.type !== 'facts') return []
      return (b.items ?? []).map(item => ({ name: item.label, value: item.value, inline: true }))
    })
    const embed = (section || fields.length > 0) ? {
      description: section?.text,
      ...(fields.length > 0 ? { fields } : {})
    } : null
    return { content: message.text, ...(embed ? { embeds: [embed] } : {}) }
  }

  return { content: message?.text ?? '' }
}

export class DiscordAdapter extends Adapter {
  #client
  #prefix
  #permissionNames
  #token

  constructor(robot, client, {
    prefix = '!',
    permissionNames = ['ManageMessages', 'ManageThreads', 'Administrator'],
    token
  } = {}) {
    super(robot, 'discord')
    this.#client = client
    this.#prefix = prefix
    this.#permissionNames = permissionNames
    this.#token = token
  }

  async send(envelope, message) {
    const channel = await this.#client.channels.fetch(envelope.channel.id)
    await channel.send(toDiscordPayload(message))
  }

  async reply(envelope, message) {
    return this.send(envelope, message)
  }

  async start() {
    this.#client.once('clientReady', client => {
      console.log(`Discord adapter connected as ${client.user.tag}`)
      console.log(`Prefix: ${this.#prefix}`)
    })

    this.#client.on('messageCreate', async message => {
      try {
        const envelope = messageToEnvelope(message, this.name, this.#prefix, this.#permissionNames)
        if (!envelope) return
        if (envelope.isCommand) {
          await this.robot.receive(envelope)
        } else {
          await this.robot.listen(envelope)
        }
      } catch (error) {
        console.error('Discord adapter failed to handle message', error)
      }
    })

    await this.#client.login(this.#token)
  }
}
