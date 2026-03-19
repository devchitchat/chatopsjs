function trimPrefix(text = '', prefix = '!') {
  if (!text.startsWith(prefix)) {
    return null
  }

  return text.slice(prefix.length).trim()
}

function createDiscordPermissionList(member, permissionNames) {
  if (!member?.permissions || typeof member.permissions.has !== 'function') {
    return []
  }

  const mappedPermissions = permissionNames
    .filter(permission => member.permissions.has(permission))
    .map(permission => `discord.permission.${permission}`)

  if (member.permissions.has('ManageMessages')) {
    mappedPermissions.push('tickets:write')
  }

  return mappedPermissions
}

function blockToField(block) {
  if (block.type !== 'facts') {
    return []
  }

  return (block.items ?? []).map(item => ({
    name: item.label,
    value: item.value,
    inline: true
  }))
}

function createEmbedFromMessage(response) {
  const section = response.message?.blocks?.find(block => block.type === 'section')
  const fields = (response.message?.blocks ?? []).flatMap(blockToField)

  if (!section && fields.length === 0) {
    return null
  }

  return {
    description: section?.text,
    ...(fields.length > 0 ? { fields } : {})
  }
}

function responseToDiscordPayload(response) {
  if (response.native?.provider === 'discord') {
    return {
      content: response.fallbackText,
      ...response.native.payload
    }
  }

  if (response.kind === 'message') {
    const embed = createEmbedFromMessage(response)
    return {
      content: response.fallbackText,
      ...(embed ? { embeds: [embed] } : {})
    }
  }

  return {
    content: response.fallbackText
  }
}

export function createDiscordMessageEvent({
  adapterName = 'discord',
  message,
  prefix = '!',
  permissionNames = ['ManageMessages', 'ManageThreads', 'Administrator']
} = {}) {
  if (!message || message.author?.bot) {
    return null
  }

  const text = trimPrefix(message.content ?? '', prefix)
  if (!text) {
    return null
  }

  return {
    adapter: adapterName,
    type: 'message',
    text,
    actor: {
      id: message.author.id,
      permissions: createDiscordPermissionList(message.member, permissionNames)
    },
    channel: {
      id: message.channelId,
      guildId: message.guildId ?? null
    },
    rawEvent: {
      messageId: message.id
    }
  }
}

export function createDiscordAdapter({
  name = 'discord',
  prefix = '!',
  permissionNames,
  resolveChannel
} = {}) {
  return {
    name,
    capabilities: {
      nativePayload: ['discord'],
      edits: true,
      reactions: true,
      threads: true
    },
    prefix,
    createEvent(message) {
      return createDiscordMessageEvent({
        adapterName: name,
        message,
        prefix,
        permissionNames
      })
    },
    async deliver({ event, response }) {
      const channel = await resolveChannel(event)
      const payload = responseToDiscordPayload(response)
      await channel.send(payload)
      return payload
    }
  }
}

export function createDiscordPayload(response) {
  return responseToDiscordPayload(response)
}
