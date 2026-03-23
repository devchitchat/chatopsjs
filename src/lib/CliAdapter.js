import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { Adapter } from './Adapter.js'

const EXIT_COMMANDS = new Set(['exit', 'quit'])

export class CliAdapter extends Adapter {
  #inputStream
  #outputStream
  #prompt
  #prefix
  #actor
  #channel

  constructor(robot, {
    inputStream = input,
    outputStream = output,
    prompt = 'chatops> ',
    prefix = null,
    actor = { id: 'cli', permissions: [] },
    channel = { id: 'local-shell' }
  } = {}) {
    super(robot, 'cli')
    this.#inputStream = inputStream
    this.#outputStream = outputStream
    this.#prompt = prompt
    this.#prefix = prefix
    this.#actor = actor
    this.#channel = channel
  }

  async send(envelope, message) {
    const text = message?.text ?? ''
    if (text) this.#outputStream.write(`${text}\n`)
  }

  async reply(envelope, message) {
    return this.send(envelope, message)
  }

  async start() {
    const rl = readline.createInterface({
      input: this.#inputStream,
      output: this.#outputStream
    })

    try {
      while (true) {
        const line = await rl.question(this.#prompt)
        const text = line.trim()
        if (!text) continue

        if (EXIT_COMMANDS.has(text.toLowerCase())) {
          this.#outputStream.write('Bye\n')
          break
        }

        const envelope = {
          adapter: this.name,
          type: 'message',
          text,
          actor: this.#actor,
          channel: this.#channel
        }

        if (this.#prefix) {
          if (text.startsWith(this.#prefix)) {
            await this.robot.receive({ ...envelope, text: text.slice(this.#prefix.length).trim() })
          } else {
            await this.robot.listen(envelope)
          }
        } else {
          await this.robot.receive(envelope)
        }
      }
    } finally {
      rl.close()
    }
  }
}
