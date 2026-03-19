import {
  createCommand,
  createMessageResponse,
  createRuntime
} from './index.js'
import { loadModules } from './module-loader.js'

export async function createDefaultRuntime({
  adapters = [],
  modulesDirectory = '../modules',
  baseUrl = import.meta.url
} = {}) {
  const runtime = createRuntime({
    adapters
  })

  runtime.registerCommand(createCommand({
    id: 'help.commands',
    aliases: ['commands.list'],
    description: 'List a portable command summary',
    execute: async () => {
      const commands = runtime.getCommandCatalog()
      return createMessageResponse({
        fallbackText: `Registered commands: ${commands.map(command => command.id).join(', ')}`,
        blocks: commands.map(command => ({
          type: 'section',
          text: `${command.id}: ${command.description ?? 'No description'}`
        }))
      })
    }
  }))

  await loadModules({
    runtime,
    directory: modulesDirectory,
    baseUrl
  })

  return runtime
}
