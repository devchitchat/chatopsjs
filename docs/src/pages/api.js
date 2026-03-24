export const page = {
  title: 'API Reference',
  description: 'Complete API reference for chatops.js — Robot, Command, Adapter, response builders, context, and envelope.',
  nav: 'api',
  hero: false,
  content: `
<div class="page-header">
  <div class="page-eyebrow">Technical Data · Flight Manual</div>
  <h1 class="page-title">API Reference</h1>
  <p class="page-subtitle">
    Complete reference for every exported class, function, and type in chatops.js.
  </p>
</div>

<nav style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:40px">
  <div style="font-family:var(--font-mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.18em;color:var(--text-faint);margin-bottom:12px">Contents</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;font-size:0.875rem">
    <a href="#robot">Robot</a>
    <a href="#command">Command</a>
    <a href="#adapter">Adapter</a>
    <a href="#cli-adapter">CliAdapter</a>
    <a href="#responses">Response Builders</a>
    <a href="#context">Context (ctx)</a>
    <a href="#envelope">Envelope</a>
    <a href="#result">receive() Result</a>
    <a href="#registries">Registries</a>
  </div>
</nav>

<!-- ======= ROBOT ======= -->
<h2 id="robot">Robot</h2>

<p>The central runtime. Manages commands, adapters, listeners, middleware, and state.</p>

<h3>Constructor</h3>
<pre data-lang="js"><code>new Robot(config = {})</code></pre>

<h3>Static Factory (recommended)</h3>
<pre data-lang="js"><code>const robot = await Robot.create({
  adapters:  [],          // Array of Adapter instances to register immediately
  directory: './modules', // Path to auto-load modules from
  baseUrl:   import.meta.url  // Base URL for resolving module paths
})</code></pre>

<p><code>Robot.create()</code> auto-registers the built-in <code>help</code> command and loads modules from the given directory.</p>

<h3>Properties</h3>

<div class="table-wrap">
  <table>
    <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>commands</code></td><td><code>CommandRegistry</code></td><td>Register and resolve commands</td></tr>
      <tr><td><code>adapters</code></td><td><code>AdapterRegistry</code></td><td>Register and retrieve adapters</td></tr>
      <tr><td><code>listeners</code></td><td><code>ListenerRegistry</code></td><td>Register regex pattern listeners</td></tr>
    </tbody>
  </table>
</div>

<h3>Methods</h3>

<div class="table-wrap">
  <table>
    <thead><tr><th>Method</th><th>Returns</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>robot.use(fn)</code></td><td><code>void</code></td><td>Register one or more middleware functions</td></tr>
      <tr><td><code>robot.receive(envelope)</code></td><td><code>Promise&lt;Result&gt;</code></td><td>Dispatch an inbound command envelope through the full pipeline</td></tr>
      <tr><td><code>robot.listen(envelope)</code></td><td><code>Promise&lt;void&gt;</code></td><td>Run pattern listeners against an envelope</td></tr>
      <tr><td><code>robot.load(moduleLoader)</code></td><td><code>Promise&lt;void&gt;</code></td><td>Load a module inline (<code>moduleLoader</code> is an async fn receiving <code>robot</code>)</td></tr>
      <tr><td><code>robot.loadModules({ directory, baseUrl })</code></td><td><code>Promise&lt;void&gt;</code></td><td>Auto-load all <code>.js</code> modules from a directory</td></tr>
      <tr><td><code>robot.log(event, entry)</code></td><td><code>void</code></td><td>Emit a structured lifecycle log event</td></tr>
    </tbody>
  </table>
</div>

<pre data-lang="js"><code>// Register middleware
robot.use(async (ctx, next) => {
  console.log('→', ctx.command.id)
  await next()
})

// Dispatch a command programmatically
const result = await robot.receive({
  adapter:  'cli',
  type:     'message',
  text:     'ping',
  actor:    { id: 'test', permissions: [] },
  channel:  { id: 'test-channel' }
})

// Load a module inline
await robot.load(async (robot) => {
  robot.commands.register(new Command({ id: 'ping', handler: async () => createTextResponse('Pong!') }))
})</code></pre>

<!-- ======= COMMAND ======= -->
<h2 id="command">Command</h2>

<pre data-lang="js"><code>import { Command } from '@devchitchat/chatopsjs'

new Command({
  id:          string,                    // required — canonical ID, e.g. 'tickets.create'
  description: string,                    // optional — shown in help output
  aliases:     string[],                  // optional — alternate invocation names
  args:        Record&lt;string, ArgDef&gt;,    // optional — argument schema
  permissions: string[],                  // optional — required actor permission grants
  confirm:     ConfirmDef | null,         // optional — confirmation policy
  handler:     async (ctx) =&gt; Response    // optional — command handler
})</code></pre>

<h3>ArgDef</h3>
<pre data-lang="js"><code>{
  type:     'string',        // currently only 'string' is supported
  required: true | false
}</code></pre>

<h3>ConfirmDef</h3>
<pre data-lang="js"><code>{
  mode:    'yes-no',          // confirmation mode
  message: string             // prompt shown to the user
}</code></pre>

<h3>Properties</h3>
<div class="table-wrap">
  <table>
    <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>id</code></td><td><code>string</code></td><td>Canonical identifier</td></tr>
      <tr><td><code>description</code></td><td><code>string</code></td><td>Human-readable description for help</td></tr>
      <tr><td><code>aliases</code></td><td><code>string[]</code></td><td>Alternate invocation names</td></tr>
      <tr><td><code>normalizedAliases</code></td><td><code>string[]</code></td><td>Normalized alias variants (lowercased, trimmed)</td></tr>
      <tr><td><code>args</code></td><td><code>object</code></td><td>Argument schema map</td></tr>
      <tr><td><code>permissions</code></td><td><code>string[]</code></td><td>Required permission grants</td></tr>
      <tr><td><code>confirm</code></td><td><code>object | null</code></td><td>Confirmation configuration</td></tr>
      <tr><td><code>handler</code></td><td><code>function</code></td><td>Async handler function</td></tr>
    </tbody>
  </table>
</div>

<!-- ======= ADAPTER ======= -->
<h2 id="adapter">Adapter</h2>

<p>Abstract base class for all adapters. Extend this and implement the three methods.</p>

<pre data-lang="js"><code>import { Adapter } from '@devchitchat/chatopsjs'

class MyAdapter extends Adapter {
  constructor(robot, options = {}) {
    super(robot, 'my-adapter')  // second arg = adapter name
  }

  async start() {
    // Bootstrap provider connection
    // Call robot.receive(envelope) for each incoming message
  }

  async send(envelope, message) {
    // Deliver response to envelope.channel.id
  }

  async reply(envelope, message) {
    // Deliver direct reply to actor (defaults to send())
    await this.send(envelope, message)
  }
}</code></pre>

<div class="table-wrap">
  <table>
    <thead><tr><th>Method</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>start()</code></td><td><span class="badge badge-orange">Required</span></td><td>Bootstrap the provider connection</td></tr>
      <tr><td><code>send(envelope, message)</code></td><td><span class="badge badge-orange">Required</span></td><td>Deliver a response to the originating channel</td></tr>
      <tr><td><code>reply(envelope, message)</code></td><td><span class="badge badge-green">Optional</span></td><td>Deliver a direct reply to the actor. Defaults to <code>send()</code></td></tr>
    </tbody>
  </table>
</div>

<!-- ======= CLI ADAPTER ======= -->
<h2 id="cli-adapter">CliAdapter</h2>

<p>The built-in CLI adapter. Uses Node.js readline for an interactive REPL.</p>

<pre data-lang="js"><code>import { CliAdapter } from '@devchitchat/chatopsjs'

const cli = new CliAdapter(robot, {
  inputStream:  process.stdin,        // readable stream (default: stdin)
  outputStream: process.stdout,       // writable stream (default: stdout)
  prompt:       'chatops&gt; ',          // REPL prompt string
  prefix:       null,                 // command prefix (null = no prefix required)
  actor: {
    id:          'cli',               // actor identity for this session
    permissions: ['deploys:write']    // permission grants for this session
  },
  channel: {
    id: 'local-shell'                 // channel identifier
  }
})</code></pre>

<p>The CLI adapter handles the confirmation flow internally — when a command requires confirmation, it prompts the user inline and waits for <code>yes</code> or <code>no</code>.</p>

<!-- ======= RESPONSES ======= -->
<h2 id="responses">Response Builders</h2>

<h3>createTextResponse</h3>
<pre data-lang="js"><code>import { createTextResponse } from '@devchitchat/chatopsjs'

createTextResponse(text: string)
// Returns: { text: string }</code></pre>

<h3>createMessageResponse</h3>
<pre data-lang="js"><code>import { createMessageResponse } from '@devchitchat/chatopsjs'

createMessageResponse({
  fallbackText: string,    // Plain text fallback for adapters that can't render blocks
  blocks: Block[]          // Array of block objects
})
// Returns: { text: string, blocks: Block[] }</code></pre>

<h4>Block Types</h4>

<div class="table-wrap">
  <table>
    <thead><tr><th>Type</th><th>Fields</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>section</code></td><td><code>text: string</code></td><td>A paragraph of text</td></tr>
      <tr><td><code>facts</code></td><td><code>items: { label, value }[]</code></td><td>A key/value data table</td></tr>
    </tbody>
  </table>
</div>

<h3>createNativeResponse</h3>
<pre data-lang="js"><code>import { createNativeResponse } from '@devchitchat/chatopsjs'

createNativeResponse({
  fallbackText: string,    // Shown by adapters that don't match the provider
  provider:     string,    // Provider name: 'slack' | 'discord' | etc.
  payload:      object     // Provider-native payload object
})
// Returns: { text: string, native: { provider, payload } }</code></pre>

<!-- ======= CONTEXT ======= -->
<h2 id="context">Context (ctx)</h2>

<p>The context object is passed to command handlers and middleware:</p>

<pre data-lang="js"><code>{
  envelope: Envelope,       // The original inbound message envelope
  command:  Command,        // The resolved Command instance
  args:     object,         // Parsed argument key/value pairs
  adapter:  Adapter,        // The active Adapter instance

  storage: {
    get(key: string): Promise&lt;any&gt;,
    set(key: string, value: any): Promise&lt;void&gt;
  },

  state:   object,          // Mutable per-invocation state for middleware

  robot:   Robot,           // The Robot instance

  meta: {
    adapter:       string,  // Adapter name ('cli', 'discord', etc.)
    correlationId: string   // Unique UUID for this invocation
  }
}</code></pre>

<h3>Middleware Signature</h3>
<pre data-lang="js"><code>robot.use(async (ctx, next) => {
  // Before handler: mutate ctx.state, add logging, etc.
  await next()
  // After handler: inspect result, record metrics, etc.
})</code></pre>

<!-- ======= ENVELOPE ======= -->
<h2 id="envelope">Envelope</h2>

<p>Passed to <code>robot.receive()</code> by adapters. Describes an inbound message:</p>

<pre data-lang="js"><code>{
  adapter:  string,          // Adapter name — must match a registered adapter
  type:     'message',       // Message type
  text:     string,          // Command text (prefix already stripped by adapter)

  actor: {
    id:          string,     // User / actor identifier
    permissions: string[]    // Permission grants for this actor
  },

  channel: {
    id:      string,         // Channel / room identifier
    guildId?: string         // Optional — guild/workspace ID
  },

  correlationId?: string,    // Optional — auto-generated UUID if omitted
  confirmation?: {
    approved: true           // Set by adapter when user confirms a pending command
  }
  // Any additional adapter-specific fields are passed through transparently
}</code></pre>

<!-- ======= RESULT ======= -->
<h2 id="result">receive() Result</h2>

<p><code>robot.receive(envelope)</code> always resolves to a structured result object:</p>

<pre data-lang="js"><code>{
  ok: boolean,

  // Present when ok === true:
  response?: { text, blocks?, native? },
  command?:  { id, aliasUsed },
  context?:  object,

  // Present when ok === false:
  error?: {
    code:     string,
    message?: string,
    errors?:  object[]    // Validation errors
  },

  // Present when confirmation is pending:
  confirmation?: { commandId: string },

  meta: {
    adapter:       string,
    correlationId: string
  }
}</code></pre>

<h3>Error Codes</h3>
<div class="table-wrap">
  <table>
    <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
    <tbody>
      <tr><td><code>unknown_command</code></td><td>No command matched the input text</td></tr>
      <tr><td><code>validation_failed</code></td><td>Required arguments are missing or invalid</td></tr>
      <tr><td><code>permission_denied</code></td><td>Actor lacks a required permission</td></tr>
      <tr><td><code>confirmation_required</code></td><td>Command is awaiting user confirmation</td></tr>
      <tr><td><code>confirmation_cancelled</code></td><td>User responded <code>no</code> to a confirmation prompt</td></tr>
    </tbody>
  </table>
</div>

<!-- ======= REGISTRIES ======= -->
<h2 id="registries">Registries</h2>

<h3>CommandRegistry</h3>
<pre data-lang="js"><code>// Available as robot.commands
robot.commands.register(command: Command): void
robot.commands.resolve(name: string): Command | undefined
robot.commands.list(): Command[]</code></pre>

<h3>AdapterRegistry</h3>
<pre data-lang="js"><code>// Available as robot.adapters
robot.adapters.add(adapter: Adapter): void
robot.adapters.get(name: string): Adapter | undefined</code></pre>

<h3>ListenerRegistry</h3>
<pre data-lang="js"><code>// Available as robot.listeners
robot.listeners.register(pattern: RegExp, handler: async (envelope, match) => void): void
robot.listeners.list(): { pattern, handler }[]
robot.listeners.match(text: string): { pattern, match }[]</code></pre>

<!-- ======= UTILITIES ======= -->
<h2 id="utilities">Utilities</h2>

<h3>parseProgramArgs(argv)</h3>
<pre data-lang="js"><code>import { parseProgramArgs } from '@devchitchat/chatopsjs'

// Parses process.argv-style array for --adapter / -a flags
const args = parseProgramArgs(process.argv.slice(2))
// { adapter: './path/to/adapter.js', ... }</code></pre>

<h3>normalizeCommandName(name, options)</h3>
<pre data-lang="js"><code>import { normalizeCommandName } from '@devchitchat/chatopsjs'

normalizeCommandName('!deploy', { prefix: '!' })
// → 'deploy'

normalizeCommandName('Deploy', {})
// → 'deploy'</code></pre>
`
}
