import { createCliApp, runCliApp } from './index.js'
import { createDefaultRuntime } from './default-runtime.js'

export async function runDefaultCliApp() {
  const runtime = await createDefaultRuntime({
    adapters: [
      {
        name: 'cli',
        capabilities: {
          nativePayload: []
        }
      }
    ]
  })

  const app = createCliApp({
    runtime,
    actor: {
      id: 'local-user',
      permissions: ['tickets:write']
    }
  })

  console.log('chatopsjs CLI')
  console.log('Type "help" for commands, "exit" to quit')

  await runCliApp({
    app
  })
}
