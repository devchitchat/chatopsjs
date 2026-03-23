export function normalizeCommandName(name, { prefix = '' } = {}) {
  const stripped = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name
  return stripped.toLowerCase().trim()
}

export class Command {
  constructor(spec) {
    this.id = spec.id
    this.description = spec.description
    this.aliases = spec.aliases ?? []
    this.normalizedAliases = this.aliases.map(alias => normalizeCommandName(alias))
    this.examples = spec.examples ?? []
    this.args = spec.args ?? {}
    this.confirm = spec.confirm ?? null
    this.permissions = spec.permissions ?? []
    this.handler = spec.handler ?? (() => {})
  }
}
