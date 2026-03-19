import { createTextResponse, normalizeResponse } from './response.js'

function createMemoryStore(initialState = {}) {
  const state = new Map(Object.entries(initialState))

  return {
    async get(key) {
      return state.get(key)
    },
    async set(key, value) {
      state.set(key, value)
    }
  }
}

function createLogger(logger = console) {
  return {
    info(entry) {
      if (typeof logger.info === 'function') {
        logger.info(entry)
      }
    },
    error(entry) {
      if (typeof logger.error === 'function') {
        logger.error(entry)
      }
    }
  }
}

function createAdapterRegistry(adapters = []) {
  const registry = new Map()

  for (const adapter of adapters) {
    registry.set(adapter.name, {
      capabilities: {},
      ...adapter
    })
  }

  return {
    get(name) {
      return registry.get(name) ?? {
        name,
        capabilities: {}
      }
    }
  }
}

function createCommandRegistry() {
  const commands = new Map()
  const aliases = new Map()

  return {
    register(command) {
      commands.set(command.id, command)

      for (const alias of command.aliases ?? []) {
        aliases.set(alias, command.id)
      }
    },
    resolve(name) {
      const id = commands.has(name) ? name : aliases.get(name)
      if (!id) {
        return null
      }

      return {
        command: commands.get(id),
        aliasUsed: id === name ? null : name
      }
    },
    list() {
      return [...commands.values()].map(command => ({
        id: command.id,
        aliases: command.aliases ?? [],
        description: command.description,
        permissions: command.permissions ?? []
      }))
    }
  }
}

function parseTokens(input = '') {
  const matches = input.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
  return matches.map(token => token.replace(/^['"]|['"]$/g, ''))
}

function parseCommandInput(text) {
  const tokens = parseTokens(text)
  const [name, ...rest] = tokens
  const args = {}

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const value = rest[index + 1]

    if (!value || value.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = value
    index += 1
  }

  return {
    name: name ?? '',
    args
  }
}

async function runMiddleware(middleware, context, finalHandler) {
  let index = -1

  async function dispatch(nextIndex) {
    if (nextIndex <= index) {
      throw new Error('middleware_next_called_multiple_times')
    }

    index = nextIndex
    const layer = middleware[nextIndex]

    if (!layer) {
      context.response = await finalHandler()
      return context.response
    }

    const result = await layer(context, () => dispatch(nextIndex + 1))
    return result ?? context.response
  }

  return dispatch(0)
}

function generateCorrelationId() {
  return `corr_${Math.random().toString(36).slice(2, 10)}`
}

function validateArgs(command, args) {
  const errors = []

  for (const [name, schema] of Object.entries(command.args ?? {})) {
    const value = args[name]

    if (schema.required && (value === undefined || value === '')) {
      errors.push({
        field: name,
        code: 'required'
      })
      continue
    }

    if (value !== undefined && schema.type === 'string' && typeof value !== 'string') {
      errors.push({
        field: name,
        code: 'invalid_type'
      })
    }
  }

  return errors
}

function hasPermissions(actor, requiredPermissions) {
  const granted = new Set(actor.permissions ?? [])
  return requiredPermissions.every(permission => granted.has(permission))
}

function createFailure({ code, message, response, confirmation, meta, audit = [] }) {
  return {
    ok: false,
    error: {
      code,
      message
    },
    response,
    confirmation,
    meta,
    audit
  }
}

export function createRuntime({
  adapters = [],
  logger,
  storage,
  stateFactory
} = {}) {
  const commandRegistry = createCommandRegistry()
  const middleware = []
  const adapterRegistry = createAdapterRegistry(adapters)
  const durableStorage = storage ?? createMemoryStore()
  const runtimeLogger = createLogger(logger)
  const createState = stateFactory ?? (() => ({}))

  function log(event, entry) {
    runtimeLogger.info({
      event,
      timestamp: new Date().toISOString(),
      ...entry
    })
  }

  function registerCommand(command) {
    commandRegistry.register(command)
    return runtime
  }

  function use(fn) {
    middleware.push(fn)
    return runtime
  }

  function loadPlugin(plugin) {
    for (const fn of plugin.middleware ?? []) {
      use(fn)
    }

    for (const command of plugin.commands ?? []) {
      registerCommand(command)
    }

    if (typeof plugin.setup === 'function') {
      plugin.setup(runtime)
    }

    log('plugin.loaded', {
      plugin: {
        name: plugin.name,
        version: plugin.version
      }
    })

    return runtime
  }

  async function handleEvent(event) {
    const correlationId = event.correlationId ?? generateCorrelationId()
    const parsed = parseCommandInput(event.text)
    const resolved = commandRegistry.resolve(parsed.name)
    const meta = {
      adapter: event.adapter,
      correlationId
    }

    if (!resolved) {
      const response = createTextResponse(`Unknown command "${parsed.name}". Try "help".`)
      log('command.unknown', {
        meta,
        input: event.text
      })
      return createFailure({
        code: 'unknown_command',
        message: 'Unknown command',
        response,
        meta
      })
    }

    const { command, aliasUsed } = resolved
    const validationErrors = validateArgs(command, parsed.args)
    if (validationErrors.length > 0) {
      return createFailure({
        code: 'validation_failed',
        message: 'Invalid command arguments',
        response: createTextResponse('Invalid command arguments'),
        meta,
        audit: [
          {
            action: 'command.validate',
            commandId: command.id,
            outcome: 'failed',
            validationErrors
          }
        ]
      })
    }

    if (!hasPermissions(event.actor ?? {}, command.permissions ?? [])) {
      log('command.denied', {
        meta,
        commandId: command.id,
        actorId: event.actor?.id
      })
      return createFailure({
        code: 'permission_denied',
        message: 'Permission denied',
        response: createTextResponse('Permission denied'),
        meta,
        audit: [
          {
            action: 'command.authorize',
            commandId: command.id,
            outcome: 'denied'
          }
        ]
      })
    }

    if (command.confirm?.mode === 'required' && !event.confirmation?.approved) {
      return createFailure({
        code: 'confirmation_required',
        message: 'Command requires confirmation',
        response: createTextResponse(command.confirm.message),
        confirmation: {
          commandId: command.id,
          message: command.confirm.message
        },
        meta,
        audit: [
          {
            action: 'command.confirm',
            commandId: command.id,
            outcome: 'required'
          }
        ]
      })
    }

    const context = {
      event,
      command,
      args: parsed.args,
      adapter: adapterRegistry.get(event.adapter),
      storage: durableStorage,
      state: createState(),
      meta
    }

    const audit = [
      {
        action: 'command.execute',
        commandId: command.id,
        actorId: event.actor?.id
      }
    ]

    log('command.started', {
      meta,
      commandId: command.id,
      actorId: event.actor?.id
    })

    const rawResponse = await runMiddleware(middleware, context, async () => command.execute(context))
    const response = normalizeResponse(rawResponse, context.adapter.capabilities)

    log('command.completed', {
      meta,
      commandId: command.id,
      actorId: event.actor?.id
    })

    return {
      ok: true,
      command: {
        id: command.id,
        aliasUsed
      },
      context,
      response,
      audit,
      meta
    }
  }

  function getCommandCatalog() {
    return commandRegistry.list()
  }

  const runtime = {
    registerCommand,
    use,
    loadPlugin,
    handleEvent,
    getCommandCatalog
  }

  return runtime
}
