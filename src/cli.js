import {
  loadAdapterModule,
  parseProgramArgs,
  resolveAdapterSpecifier
} from './program.js'
import { runDefaultCliApp } from './default-cli.js'

const args = parseProgramArgs(process.argv.slice(2))
const adapterSpecifier = resolveAdapterSpecifier(args)

try {
  if (!args.adapterExplicit) {
    await runDefaultCliApp()
  } else {
    const { runAdapterApp } = await loadAdapterModule(adapterSpecifier)
    await runAdapterApp({
      args
    })
  }
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
