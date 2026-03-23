import { Robot } from '../../src/index.js'
import { DiscordAdapter } from './adapter.js'

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

  const { Client, GatewayIntentBits } = discordJs

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  })

  const robot = await Robot.create({ directory: '../modules', baseUrl: import.meta.url })
  const adapter = new DiscordAdapter(robot, client, { prefix, token })
  robot.adapters.add(adapter)
  await adapter.start()
}
