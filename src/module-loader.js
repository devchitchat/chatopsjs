import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
  const entries = await readdir(directory, {
    withFileTypes: true
  })

  const modulePaths = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      modulePaths.push(...await collectModulePaths(entryPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      modulePaths.push(entryPath)
    }
  }

  return modulePaths
}

function getRegistrations(module) {
  const registrations = []

  if (module.command) {
    registrations.push({
      type: 'command',
      value: module.command
    })
  }

  if (module.plugin) {
    registrations.push({
      type: 'plugin',
      value: module.plugin
    })
  }

  if (module.default) {
    const looksLikePlugin = Array.isArray(module.default.commands) || Array.isArray(module.default.middleware)

    registrations.push({
      type: looksLikePlugin ? 'plugin' : 'command',
      value: module.default
    })
  }

  return registrations
}

export async function loadModules({
  runtime,
  directory = './modules',
  baseUrl
}) {
  const resolvedDirectory = toDirectoryPath(directory, baseUrl)
  let modulePaths = []

  try {
    modulePaths = await collectModulePaths(resolvedDirectory)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return runtime
    }

    throw error
  }

  for (const modulePath of modulePaths) {
    const module = await import(pathToFileURL(modulePath).href)
    const registrations = getRegistrations(module)

    for (const registration of registrations) {
      if (registration.type === 'plugin') {
        runtime.loadPlugin(registration.value)
      } else {
        runtime.registerCommand(registration.value)
      }
    }
  }

  return runtime
}
