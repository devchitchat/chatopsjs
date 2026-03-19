export function createCommand(definition) {
  return {
    aliases: [],
    args: {},
    permissions: [],
    confirm: null,
    ...definition
  }
}
