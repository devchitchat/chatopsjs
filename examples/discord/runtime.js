import { createDefaultRuntime } from '../../src/default-runtime.js'

export async function createDiscordExampleRuntime({ adapter } = {}) {
  return createDefaultRuntime({
    adapters: adapter ? [adapter] : []
  })
}
