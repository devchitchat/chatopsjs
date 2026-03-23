import { describe, expect, test } from 'bun:test'
import { Robot, ListenerRegistry } from '../src/index.js'

describe('ListenerRegistry', () => {
  test('registers and matches a pattern', () => {
    const registry = new ListenerRegistry()
    registry.register(/hello (.+)/i, () => {})
    const matches = registry.match('hello world')
    expect(matches).toHaveLength(1)
    expect(matches[0].match[1]).toBe('world')
  })

  test('returns empty array when no pattern matches', () => {
    const registry = new ListenerRegistry()
    registry.register(/deploy/, () => {})
    expect(registry.match('hello')).toHaveLength(0)
  })

  test('matches multiple patterns', () => {
    const registry = new ListenerRegistry()
    registry.register(/foo/, () => {})
    registry.register(/foo bar/, () => {})
    expect(registry.match('foo bar')).toHaveLength(2)
  })

  test('list returns all registered listeners', () => {
    const registry = new ListenerRegistry()
    registry.register(/a/, () => {})
    registry.register(/b/, () => {})
    expect(registry.list()).toHaveLength(2)
  })
})

describe('robot.listen', () => {
  test('calls handler and sends response for matching text', async () => {
    const robot = new Robot()
    const sent = []
    robot.adapters.add({
      name: 'test',
      async send(envelope, message) { sent.push({ envelope, message }) }
    })

    robot.listeners.register(/hi (.+)/i, async ({ match }) => ({ text: `Hello, ${match[1]}!` }))

    await robot.listen({
      adapter: 'test',
      text: 'hi Alice',
      actor: { id: 'u1' },
      channel: { id: 'c1' }
    })

    expect(sent).toHaveLength(1)
    expect(sent[0].message.text).toBe('Hello, Alice!')
  })

  test('does not call handler when text does not match', async () => {
    const robot = new Robot()
    const sent = []
    robot.adapters.add({
      name: 'test',
      async send(envelope, message) { sent.push(message) }
    })

    robot.listeners.register(/deploy/, async () => ({ text: 'Deploying...' }))

    await robot.listen({
      adapter: 'test',
      text: 'just chatting',
      actor: { id: 'u1' },
      channel: { id: 'c1' }
    })

    expect(sent).toHaveLength(0)
  })

  test('sends nothing if handler returns no response', async () => {
    const robot = new Robot()
    const sent = []
    robot.adapters.add({
      name: 'test',
      async send(envelope, message) { sent.push(message) }
    })

    robot.listeners.register(/ping/, async () => null)

    await robot.listen({
      adapter: 'test',
      text: 'ping',
      actor: { id: 'u1' },
      channel: { id: 'c1' }
    })

    expect(sent).toHaveLength(0)
  })

  test('fires multiple matching handlers', async () => {
    const robot = new Robot()
    const sent = []
    robot.adapters.add({
      name: 'test',
      async send(envelope, message) { sent.push(message) }
    })

    robot.listeners.register(/hello/, async () => ({ text: 'handler 1' }))
    robot.listeners.register(/hello world/, async () => ({ text: 'handler 2' }))

    await robot.listen({
      adapter: 'test',
      text: 'hello world',
      actor: { id: 'u1' },
      channel: { id: 'c1' }
    })

    expect(sent).toHaveLength(2)
  })
})
