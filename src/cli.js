#!/usr/bin/env bun
import { parseProgramArgs, resolveAdapterSpecifier, loadAdapterModule } from './program.js'
import { Robot } from './index.js'
import { CliAdapter } from './lib/CliAdapter.js'

const args = parseProgramArgs(process.argv.slice(2))
const adapterSpecifier = resolveAdapterSpecifier(args)

try {
  if (!args.adapterExplicit) {
    const robot = await Robot.create({ baseUrl: import.meta.url.replace('node_modules/@devchitchat/chatopsjs/src/cli.js', '') })
    const adapter = new CliAdapter(robot, {
      actor: { id: 'local-user', permissions: ['tickets:write'] },
      prefix: '!'
    })
    robot.adapters.add(adapter)
    console.log('chatopsjs CLI')
    console.log('prefix with "!" to send messages/commands to bot')
    console.log('Type "help.commands" for commands, "exit" to quit')
    await adapter.start()
  } else {
    const { runAdapterApp } = await loadAdapterModule(adapterSpecifier)
    await runAdapterApp({ args })
  }
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
