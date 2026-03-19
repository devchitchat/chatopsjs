# chatopsjs

`chatopsjs` is a command-first chatbot framework for Slack, Discord, Teams, CLI, and future adapters. It is designed as a modern successor to Hubot for teams that want deterministic command execution, auditable behavior, strong plugin boundaries, and adapter-specific richness without collapsing everything into a lowest-common-denominator messaging API.

The framework bets on commands as the primary unit of behavior:

- canonical command IDs like `tickets.create`
- declarative command schemas
- permission checks before execution
- confirmation flows for side-effecting operations
- ordered async middleware
- explicit adapter capabilities
- safe default handling for unknown input
- structured logs, lifecycle events, audit records, and correlation IDs

The current codebase includes a minimal kernel and test-backed command pipeline in JavaScript with ESM imports and no semicolons. The intended workflow is strict TDD: write a failing test, implement the smallest passing slice, then refactor.

## Install

```bash
bun install
```

## Test

```bash
bun test
```

## Run The Program

```bash
bun run cli
```

That starts the default `cli` adapter with a local command shell. Useful commands:

```text
help
tickets.create --title "Broken login"
yes
alerts.ack
exit
```

You can choose the adapter explicitly:

```bash
bun run cli --adapter ./examples/discord/app.js
```

Short flag:

```bash
bun run cli -a ./examples/discord/app.js
```

The launcher is [src/cli.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/cli.js), the built-in default CLI path is [src/default-cli.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/default-cli.js), and argument parsing plus external adapter loading are in [src/program.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/program.js).

The contract is intentionally generic: `--adapter` takes any ESM module specifier, relative path, absolute path, or package name. The loaded module must export `runAdapterApp`. If `--adapter` is omitted, the program does not go through the adapter loader and runs the built-in CLI directly.

Modules are autoloaded from the top-level [modules/](/Users/joeyguerra/src/joeyguerra/chatopsjs/modules) directory by the shared runtime bootstrap in [src/default-runtime.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/default-runtime.js). Each module should export either a command or a plugin contract.

## Discord Adapter Example

A runnable Discord example lives in [examples/discord/app.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/examples/discord/app.js).

Install dependencies, set a bot token, then start it:

```bash
bun install
DISCORD_TOKEN=your-token bun run cli --adapter ./examples/discord/app.js
```

The adapter surface itself is implemented in [examples/discord/adapter.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/examples/discord/adapter.js). It follows the framework design rules:

- normalize inbound Discord messages into framework events
- declare Discord capabilities explicitly
- render portable responses into Discord `content` and basic embeds
- allow Discord-native payloads through `createNativeResponse({ provider: 'discord', ... })`

The example runtime is in [examples/discord/runtime.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/examples/discord/runtime.js), and it reuses the same shared `modules/` autoload model as the built-in CLI. Usage notes are in [examples/discord/README.md](/Users/joeyguerra/src/joeyguerra/chatopsjs/examples/discord/README.md).

## Bun REPL

This does not embed `bun repl` directly.

`bun repl` is a JavaScript evaluator, not a command-shell API for hosting a ChatOps loop, so using it as the transport would blur command input with JS execution and weaken determinism. The better fit is a dedicated readline-based CLI adapter running on Bun, which is what this repo now uses.

If you want REPL-like ergonomics later, the next step is to add shell history, tab completion, and command introspection on top of the CLI adapter rather than delegating command handling to the JavaScript REPL.

## Architecture Overview

The system is split into five layers:

1. **Kernel / runtime**
   Owns lifecycle, middleware execution, command dispatch, correlation IDs, audit records, storage handles, and logging hooks.
2. **Adapters**
   Normalize inbound provider events into framework events and deliver outbound responses. Adapters stay thin and declare capabilities explicitly.
3. **Command bus**
   Registers commands, resolves aliases, parses arguments, validates input, authorizes actors, enforces confirmations, executes handlers, and exposes discovery/help metadata.
4. **Plugins**
   Package commands, middleware, setup hooks, and future provider integrations as isolated modules.
5. **Storage and state**
   Separates ephemeral per-invocation state from pluggable durable storage used for workflows, approvals, tokens, or cache.

This keeps the runtime deterministic. Adapters only translate. Commands only express business behavior. Middleware only augments the execution pipeline in ordered, testable steps.

## Core Components And Responsibilities

### `createRuntime`

The central kernel. Responsibilities:

- accept adapter registrations and capability declarations
- register commands and plugins
- execute ordered async middleware
- construct per-event execution context
- validate and authorize commands
- enforce confirmation policy
- emit structured lifecycle logs
- produce audit records and correlation IDs

### `createCommand`

Defines a command contract:

- `id`: canonical identifier such as `tickets.create`
- `aliases`: optional alternate invocations
- `description`: human-readable discovery text
- `args`: declarative argument schema
- `permissions`: required grants
- `confirm`: confirmation policy for side effects
- `execute(ctx)`: command handler

### Response Builders

Outbound responses are intentionally layered:

- `createTextResponse(text)` for portable plain text
- `createMessageResponse({...})` for framework-defined structured message IR plus fallback text
- `createNativeResponse({...})` for adapter-native escape hatches

### `definePlugin`

Defines a plugin bundle:

- `name`
- `version`
- `commands`
- `middleware`
- `setup(runtime)`

### Storage Model

The runtime owns two state scopes:

- `ctx.state`: ephemeral per-command state, safe for middleware coordination
- `ctx.storage`: pluggable durable storage, used for cross-command state and long-lived workflows

## Command Lifecycle

Each inbound event follows the same pipeline:

1. Adapter normalizes provider-specific input into a framework event.
2. Runtime assigns or propagates a correlation ID.
3. Command bus parses the input and resolves the canonical command ID from aliases.
4. Declarative argument validation runs.
5. Permission checks run against actor grants.
6. Confirmation policy runs for side-effecting commands.
7. Ordered async middleware executes around the handler.
8. Command executes and returns portable, structured, or native output.
9. Runtime applies adapter capability filtering.
10. Logs, audit records, and delivery metadata are finalized.

Safe default behavior matters: unknown input never falls through to ad hoc natural-language behavior. It returns an explicit unknown-command response with a path to help/discovery.

## Output And Rendering Model

The outbound model is layered, not flattened:

### 1. Portable response primitives

The lowest layer is adapter-portable intent: text, notices, confirmations, status lines, and similar simple primitives.

### 2. Framework message IR

The middle layer is a structured message shape defined by the framework. This can represent sections, fields, actions, metadata, fallback text, and future portable composition rules.

### 3. Adapter-native payloads

The top layer is an explicit escape hatch for provider-specific richness:

- Slack Block Kit
- Discord embeds and components
- Teams cards
- threads
- ephemeral replies
- edits
- reactions

The rule is simple: use portable output by default, structured IR when the framework can model the intent, and native payloads when the provider has valuable features the framework should not erase.

### Example Structured Response

```js
createMessageResponse({
  fallbackText: 'Created ticket Broken login',
  blocks: [
    {
      type: 'section',
      text: 'Created ticket Broken login'
    },
    {
      type: 'facts',
      items: [
        { label: 'Priority', value: 'high' },
        { label: 'Owner', value: 'infra-oncall' }
      ]
    }
  ]
})
```

### Example Native Adapter Response

```js
createNativeResponse({
  fallbackText: 'Alert acknowledged',
  provider: 'slack',
  payload: {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Alert acknowledged*'
        }
      }
    ]
  }
})
```

If the active adapter does not declare support for the native payload provider, the runtime drops the native payload and falls back to `fallbackText`.

## Adapter Capability Model

Adapters declare capabilities explicitly. Do not infer them from adapter names.

Example capability declaration:

```js
const slackAdapter = {
  name: 'slack',
  capabilities: {
    nativePayload: ['slack'],
    threads: true,
    ephemeralReplies: true,
    edits: true,
    reactions: true
  }
}
```

This makes rendering and delivery predictable:

- the runtime knows when native output is allowed
- commands can branch on explicit capabilities instead of provider guessing
- tests can assert behavior against capability flags, not integration side effects

## Plugin Contract

Plugins are the unit of extensibility. A plugin should package related commands, middleware, and bootstrapping without taking ownership of the entire runtime.

Example contract:

```js
definePlugin({
  name: 'tickets',
  version: '1.0.0',
  commands: [
    createCommand({
      id: 'tickets.list',
      description: 'List tickets',
      execute: async () => createTextResponse('No tickets')
    })
  ],
  middleware: [
    async (ctx, next) => {
      ctx.state.plugin = 'tickets'
      await next()
    }
  ],
  setup(runtime) {
    runtime.use(async (ctx, next) => {
      ctx.state.startedAt = Date.now()
      await next()
    })
  }
})
```

Plugin design rules:

- commands must use canonical IDs
- middleware execution order is explicit
- plugins may add setup hooks but should not mutate runtime internals directly
- durable storage access should happen through `ctx.storage`, not hidden globals

## Example Folder Structure

An implementation-friendly structure for the next phase:

```text
chatopsjs/
  modules/
    tickets.create.js
    tickets.list.js
    alerts.ack.js
  src/
    index.js
    kernel/
      runtime.js
      lifecycle.js
      middleware.js
    commands/
      registry.js
      parser.js
      validation.js
      authorization.js
      confirmation.js
      discovery.js
    responses/
      primitives.js
      message-ir.js
      native.js
      renderer.js
    adapters/
      base.js
      slack/
        inbound.js
        outbound.js
      discord/
        inbound.js
        outbound.js
      teams/
        inbound.js
        outbound.js
      cli/
        inbound.js
        outbound.js
    plugins/
      loader.js
    storage/
      memory.js
      sqlite.js
      redis.js
    observability/
      logger.js
      audit.js
      correlation.js
  test/
    runtime.test.js
    command-bus.test.js
    adapters.test.js
    plugins.test.js
```

The current repo implements a smaller subset under `src/lib/`, but the structure above is the natural direction once the prototype grows.

## Example Command

```js
import { createCommand, createMessageResponse } from '@joeyguerra/chatopsjs'

export const createTicketCommand = createCommand({
  id: 'tickets.create',
  aliases: ['ticket.create'],
  description: 'Create a support ticket',
  args: {
    title: { type: 'string', required: true },
    priority: { type: 'string', required: false }
  },
  permissions: ['tickets:write'],
  confirm: {
    mode: 'required',
    message: 'Create ticket?'
  },
  async execute(ctx) {
    const priority = ctx.args.priority ?? 'normal'

    await ctx.storage.set(`ticket:${ctx.args.title}`, {
      title: ctx.args.title,
      priority,
      requestedBy: ctx.event.actor.id
    })

    return createMessageResponse({
      fallbackText: `Created ticket ${ctx.args.title}`,
      blocks: [
        {
          type: 'section',
          text: `Created ticket ${ctx.args.title}`
        },
        {
          type: 'facts',
          items: [
            { label: 'Priority', value: priority },
            { label: 'Requested by', value: ctx.event.actor.id }
          ]
        }
      ]
    })
  }
})
```

## Code Example

```js
import {
  createCommand,
  createMessageResponse,
  createNativeResponse,
  createRuntime,
  definePlugin
} from './src/index.js'

const runtime = createRuntime({
  adapters: [
    {
      name: 'slack',
      capabilities: {
        nativePayload: ['slack'],
        threads: true,
        ephemeralReplies: true
      }
    },
    {
      name: 'cli',
      capabilities: {
        nativePayload: []
      }
    }
  ]
})

runtime.use(async (ctx, next) => {
  ctx.state.startedAt = Date.now()
  await next()
})

runtime.loadPlugin(definePlugin({
  name: 'alerts',
  version: '1.0.0',
  commands: [
    createCommand({
      id: 'alerts.ack',
      description: 'Acknowledge an alert',
      async execute(ctx) {
        if (ctx.adapter.capabilities.nativePayload?.includes('slack')) {
          return createNativeResponse({
            fallbackText: 'Alert acknowledged',
            provider: 'slack',
            payload: {
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*Alert acknowledged*'
                  }
                }
              ]
            }
          })
        }

        return createMessageResponse({
          fallbackText: 'Alert acknowledged',
          blocks: [
            {
              type: 'section',
              text: 'Alert acknowledged'
            }
          ]
        })
      }
    })
  ]
}))
```

## Rationale For Major Design Decisions

### Command-first instead of ambient listeners

Hubot made arbitrary chat listeners easy, but that flexibility often reduced determinism and safety. A command bus gives clear ownership, stable discoverability, and auditable execution paths.

### Canonical IDs over free-form names

Canonical IDs like `tickets.create` make aliasing, permissions, analytics, and plugin composition much cleaner than stringly typed pattern handlers.

### Thin adapters

Provider integrations should translate, not own business logic. That keeps tests fast and portability realistic.

### Layered outbound model

A pure lowest-common-denominator API throws away valuable provider features. A pure provider-native model destroys portability. The layered model keeps both.

### Explicit capabilities

Capability flags are operationally safer than implicit provider branching. They make behavior visible, testable, and easier to evolve.

### Confirmation as a first-class concern

Side-effecting commands should not reinvent confirmation flows ad hoc. The runtime should enforce them consistently.

### Ephemeral state plus durable storage

Per-invocation state is useful for middleware composition, but long-lived workflow state needs a pluggable store. Treating them separately keeps handlers easier to reason about.

### Logs, lifecycle, and audit records built into the kernel

Operational safety is not optional in ChatOps systems. Correlation IDs, lifecycle logs, and audit trails need to be part of the core execution model, not bolted on later.

## Current Status

The repo currently includes:

- a test-backed runtime skeleton in [src/index.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/index.js)
- a command and plugin API under [src/lib](/Users/joeyguerra/src/joeyguerra/chatopsjs/src/lib)
- TDD coverage for command execution, alias resolution, permission checks, confirmation flow, plugin loading, safe unknown-command behavior, and adapter-native fallback in [test/chatops.test.js](/Users/joeyguerra/src/joeyguerra/chatopsjs/test/chatops.test.js)

The next logical build-out is to split the current runtime into dedicated kernel, parser, authorization, confirmation, renderer, and adapter packages while preserving the same command-first contract.
