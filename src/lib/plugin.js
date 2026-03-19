export function definePlugin(plugin) {
  return {
    commands: [],
    middleware: [],
    setup: null,
    ...plugin
  }
}
