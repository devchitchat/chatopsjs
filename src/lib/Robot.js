import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Command } from './Command.js'

function parseTokens(input = '') {
  const matches = input.match(/\"[^\"]*\"|'[^']*'|\S+/g) ?? []
  return matches.map(token => token.replace(/^['\"]|['\"]$/g, ''))
}

function parseCommandInput(text) {
  const tokens = parseTokens(text)
  const [name, ...rest] = tokens
  const args = {}

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const value = rest[i + 1]
    if (!value || value.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = value
    i++
  }

  return { name: name ?? '', args }
}

function validateArgs(command, args) {
  const errors = []
  for (const [name, schema] of Object.entries(command.args ?? {})) {
    const value = args[name]
    if (schema.required && (value === undefined || value === '')) {
      errors.push({ field: name, code: 'required' })
      continue
    }
    if (value !== undefined && schema.type === 'string' && typeof value !== 'string') {
      errors.push({ field: name, code: 'invalid_type' })
    }
  }
  return errors
}

function hasPermissions(actor, requiredPermissions) {
  const granted = new Set(actor.permissions ?? [])
  return requiredPermissions.every(permission => granted.has(permission))
}

async function runMiddleware(middleware, context, finalHandler) {
  let index = -1

  async function dispatch(nextIndex) {
    if (nextIndex <= index) throw new Error('middleware_next_called_multiple_times')
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

function createMemoryStore() {
  const state = new Map()
  return {
    async get(key) { return state.get(key) },
    async set(key, value) { state.set(key, value) }
  }
}

function createLogger(logger = console) {
  return {
    info(entry) { logger.info?.(entry) },
    error(entry) { logger.error?.(entry) }
  }
}

function pendingKey(envelope) {
  return `${envelope.actor?.id}:${envelope.channel?.id}`
}

function toDirectoryPath(directory, baseUrl) {
  if (directory.startsWith('/') || directory.startsWith('.')) {
    const baseDirectory = baseUrl
      ? fileURLToPath(new URL('.', baseUrl))
      : process.cwd()
    return path.resolve(baseDirectory, directory)
  }
  return directory
}

async function collectModulePaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const modulePaths = []

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      modulePaths.push(...await collectModulePaths(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      modulePaths.push(entryPath)
    }
  }

  return modulePaths
}

async function loadModulesFromDirectory(robot, directory = './modules', baseUrl) {
  const resolvedDirectory = toDirectoryPath(directory, baseUrl)
  let modulePaths = []

  try {
    modulePaths = await collectModulePaths(resolvedDirectory)
  } catch (error) {
    if (error.code === 'ENOENT') return robot
    throw error
  }

  for (const modulePath of modulePaths) {
    const module = await import(pathToFileURL(modulePath).href)
    if (typeof module.default === 'function') {
      await module.default(robot)
    }
  }

  return robot
}

const CONFIRMATION_YES = new Set(['yes', 'y'])
const CONFIRMATION_NO = new Set(['no', 'n'])

export class ListenerRegistry {
  #listeners = []

  register(pattern, handler) {
    this.#listeners.push({ pattern, handler })
  }

  list() {
    return [...this.#listeners]
  }

  match(text) {
    return this.#listeners.flatMap(({ pattern, handler }) => {
      const match = text.match(pattern)
      return match ? [{ match, handler }] : []
    })
  }
}

export class CommandRegistry {
  #commands = new Map()
  #aliases = new Map()

  register(command) {
    const normalizedId = command.id.toLowerCase().trim()
    this.#commands.set(normalizedId, command)
    for (const alias of command.normalizedAliases ?? []) {
      this.#aliases.set(alias, normalizedId)
    }
  }

  resolve(name) {
    const normalized = name.toLowerCase().trim()
    const byId = this.#commands.has(normalized)
    const key = byId ? normalized : this.#aliases.get(normalized)
    if (!key) return null
    return { command: this.#commands.get(key), aliasUsed: byId ? null : normalized }
  }

  list() {
    return [...this.#commands.values()]
  }
}

export class AdapterRegistry {
  #adapters = new Map()

  add(adapter) {
    this.#adapters.set(adapter.name, adapter)
  }

  get(name) {
    return this.#adapters.get(name) ?? null
  }
}

export class Robot {
  #commands = new CommandRegistry()
  #adapters = new AdapterRegistry()
  #listeners = new ListenerRegistry()
  #middleware = []
  #pendingConfirmations = new Map()
  #storage
  #logger

  constructor(config = {}) {
    this.config = config
    this.#storage = config.storage ?? createMemoryStore()
    this.#logger = createLogger(config.logger)
  }

  static async create({ adapters = [], directory = './modules', baseUrl } = {}) {
    const robot = new Robot()

    for (const adapter of adapters) {
      robot.adapters.add(adapter)
    }

    robot.commands.register(new Command({
      id: 'help.commands',
      aliases: ['commands.list'],
      description: 'List a portable command summary',
      handler: async ({ robot: r }) => ({
        text: r.commands.list().map(c => `${c.id}: ${c.description ?? 'No description'}`).join('\n')
      })
    }))

    await robot.loadModules({ directory, baseUrl })

    return robot
  }

  get commands() { return this.#commands }
  get adapters() { return this.#adapters }
  get listeners() { return this.#listeners }

  use(fn) {
    this.#middleware.push(fn)
    return this
  }

  async listen(envelope) {
    const adapter = this.#adapters.get(envelope.adapter)
    const matched = this.#listeners.match(envelope.text)

    for (const { match, handler } of matched) {
      const response = await handler({ match, envelope, robot: this, storage: this.#storage })
      if (response) await adapter?.send(envelope, response)
    }
  }

  async load(moduleLoader) {
    await moduleLoader(this)
    return this
  }

  async loadModules({ directory, baseUrl } = {}) {
    await loadModulesFromDirectory(this, directory, baseUrl)
    return this
  }

  log(event, entry) {
    this.#logger.info({ event, timestamp: new Date().toISOString(), ...entry })
  }

  async receive(envelope) {
    const correlationId = envelope.correlationId ?? generateCorrelationId()
    const meta = { adapter: envelope.adapter, correlationId }
    const adapter = this.#adapters.get(envelope.adapter)
    const key = pendingKey(envelope)
    const lowerText = envelope.text.trim().toLowerCase()

    if (this.#pendingConfirmations.has(key)) {
      if (CONFIRMATION_NO.has(lowerText)) {
        this.#pendingConfirmations.delete(key)
        await adapter?.send(envelope, { text: 'Cancelled.' })
        return { ok: false, error: { code: 'confirmation_cancelled' }, meta }
      }

      if (CONFIRMATION_YES.has(lowerText)) {
        const pendingEnvelope = this.#pendingConfirmations.get(key)
        this.#pendingConfirmations.delete(key)
        return this.receive({ ...pendingEnvelope, confirmation: { approved: true }, correlationId })
      }
    }

    const parsed = parseCommandInput(envelope.text)
    const resolved = this.#commands.resolve(parsed.name)

    if (!resolved) {
      const response = { text: `Unknown command "${parsed.name}". Try "help".` }
      this.log('command.unknown', { meta, input: envelope.text })
      await adapter?.send(envelope, response)
      return { ok: false, error: { code: 'unknown_command' }, response, meta }
    }

    const { command, aliasUsed } = resolved

    const validationErrors = validateArgs(command, parsed.args)
    if (validationErrors.length > 0) {
      await adapter?.send(envelope, { text: `Invalid command arguments. ${validationErrors.map(error => `--${error.field} (${error.code})`).join(', ')}` })
      return { ok: false, error: { code: 'validation_failed', errors: validationErrors }, meta }
    }

    if (!hasPermissions(envelope.actor ?? {}, command.permissions ?? [])) {
      this.log('command.denied', { meta, commandId: command.id, actorId: envelope.actor?.id })
      await adapter?.send(envelope, { text: 'Permission denied.' })
      return { ok: false, error: { code: 'permission_denied' }, meta }
    }

    const confirmMode = command.confirm?.mode ?? null
    if (confirmMode === 'required' && !envelope.confirmation?.approved) {
      this.#pendingConfirmations.set(key, envelope)
      const message = command.confirm?.message ?? 'Are you sure? (yes/no)'
      await adapter?.send(envelope, { text: message })
      return { ok: false, error: { code: 'confirmation_required' }, confirmation: { commandId: command.id }, meta }
    }

    const context = {
      envelope,
      command,
      args: parsed.args,
      adapter,
      storage: this.#storage,
      state: {},
      robot: this,
      meta
    }

    this.log('command.started', { meta, commandId: command.id, actorId: envelope.actor?.id })

    const response = await runMiddleware(this.#middleware, context, () => command.handler(context))

    this.log('command.completed', { meta, commandId: command.id, actorId: envelope.actor?.id })

    await adapter?.send(envelope, response)

    return { ok: true, command: { id: command.id, aliasUsed }, context, response, meta }
  }
}
