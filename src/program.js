import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function parseProgramArgs(argv = []) {
  const parsed = {
    adapter: null,
    adapterExplicit: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === '--adapter' || token === '-a') {
      parsed.adapter = argv[index + 1] ?? null
      parsed.adapterExplicit = true
      index += 1
    }
  }

  return parsed
}

export function resolveAdapterSpecifier(args = {}) {
  return args.adapter ?? null
}

function resolveBaseDirectory(baseUrl) {
  if (!baseUrl) {
    return process.cwd()
  }

  if (baseUrl.startsWith('file:')) {
    return fileURLToPath(new URL('.', baseUrl))
  }

  return baseUrl
}

export async function loadAdapterModule(specifier, baseUrl) {
  const resolvedSpecifier = specifier.startsWith('.') || specifier.startsWith('/')
    ? pathToFileURL(path.resolve(resolveBaseDirectory(baseUrl), specifier)).href
    : specifier

  const module = await import(resolvedSpecifier)
  const runAdapterApp = module.runAdapterApp ?? module.default

  if (typeof runAdapterApp !== 'function') {
    throw new Error(
      `Adapter module "${specifier}" must export "runAdapterApp" or a default function`
    )
  }

  return {
    module,
    runAdapterApp
  }
}
