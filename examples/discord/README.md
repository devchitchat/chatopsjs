# Discord Example

This example runs a message-driven Discord bot on top of `chatopsjs`.

## Requirements

- a Discord bot token in `DISCORD_TOKEN`
- the bot must have the `MESSAGE CONTENT INTENT` enabled in the Discord developer portal
- `bun install`

## Run

```bash
DISCORD_TOKEN=your-token bun run cli --adapter ./examples/discord/app.js
```

Optional:

```bash
DISCORD_PREFIX=!
```

## Try It

Send these messages in a channel the bot can read:

```text
!help.commands
!tickets.list
!alerts.ack
!tickets.create --title "Broken login"
yes
```

## How It Works

- `modules/` is the shared module inventory loaded by the runtime bootstrap
- `examples/discord/adapter.js` normalizes Discord messages into framework events and maps framework responses back into Discord payloads
- `examples/discord/runtime.js` builds a runtime and autoloads modules from `modules/`
- `examples/discord/app.js` connects `discord.js`, handles pending confirmations, and delivers responses
