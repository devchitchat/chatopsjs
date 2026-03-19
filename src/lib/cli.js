import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

function formatCatalog(catalog) {
  if (catalog.length === 0) {
    return 'No commands registered'
  }

  return [
    'Available commands:',
    ...catalog.map(command => {
      const aliases = command.aliases.length > 0
        ? ` (${command.aliases.join(', ')})`
        : ''

      return `- ${command.id}${aliases}: ${command.description ?? 'No description'}`
    })
  ].join('\n')
}

function formatResult(result) {
  if (result.response?.fallbackText) {
    return result.response.fallbackText
  }

  if (result.ok) {
    return 'OK'
  }

  return result.error?.message ?? 'Command failed'
}

export function createCliApp({
  runtime,
  actor = { id: 'cli', permissions: [] },
  channel = { id: 'local-shell' }
}) {
  let pendingConfirmation = null

  async function handleLine(line) {
    const text = line.trim()

    if (!text) {
      return {
        ok: true,
        output: ''
      }
    }

    if (pendingConfirmation) {
      if (['yes', 'y'].includes(text.toLowerCase())) {
        const event = {
          ...pendingConfirmation,
          confirmation: {
            approved: true
          }
        }
        pendingConfirmation = null

        const result = await runtime.handleEvent(event)
        return {
          ok: result.ok,
          output: formatResult(result),
          result
        }
      }

      if (['no', 'n'].includes(text.toLowerCase())) {
        pendingConfirmation = null
        return {
          ok: false,
          output: 'Cancelled pending command'
        }
      }
    }

    if (['help', '?'].includes(text.toLowerCase())) {
      return {
        ok: true,
        output: formatCatalog(runtime.getCommandCatalog())
      }
    }

    if (['exit', 'quit'].includes(text.toLowerCase())) {
      return {
        ok: true,
        output: 'Bye',
        exit: true
      }
    }

    const event = {
      adapter: 'cli',
      type: 'message',
      text,
      actor,
      channel
    }

    const result = await runtime.handleEvent(event)

    if (!result.ok && result.error?.code === 'confirmation_required') {
      pendingConfirmation = event
    }

    return {
      ok: result.ok,
      output: formatResult(result),
      result
    }
  }

  return {
    handleLine
  }
}

export async function runCliApp({
  app,
  prompt = 'chatops> ',
  inputStream = input,
  outputStream = output
}) {
  const rl = readline.createInterface({
    input: inputStream,
    output: outputStream
  })

  try {
    while (true) {
      const line = await rl.question(prompt)
      const handled = await app.handleLine(line)

      if (handled.output) {
        outputStream.write(`${handled.output}\n`)
      }

      if (handled.exit) {
        break
      }
    }
  } finally {
    rl.close()
  }
}
