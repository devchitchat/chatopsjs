export const page = {
  title: 'Getting Started',
  description: 'Install chatops.js and build your first command-line bot in minutes.',
  nav: 'getting-started',
  hero: false,
  content: `
<div class="page-header">
  <div class="page-eyebrow">Mission Briefing · T-00:00 · Pre-launch</div>
  <h1 class="page-title">Getting Started</h1>
  <p class="page-subtitle">
    From zero to your first chatops command in under five minutes.
    No dependencies, no ceremony — just Bun and a module directory.
  </p>
</div>

<div class="callout tip">
  <span class="callout-icon">⚡</span>
  <div class="callout-body">
    <div class="callout-title">Prerequisites</div>
    <p><a href="https://bun.sh" target="_blank" rel="noopener">Bun</a> v1.0 or later is required.
    Install it with <code>curl -fsSL https://bun.sh/install | bash</code>.</p>
  </div>
</div>

<h2 id="installation">Installation</h2>

<div class="steps">
  <div class="step">
    <div class="step-num">1</div>
    <div class="step-body">
      <div class="step-title">Create a new project</div>
      <pre data-lang="bash"><code>mkdir mission-control && cd mission-control
bun init -y</code></pre>
    </div>
  </div>

  <div class="step">
    <div class="step-num">2</div>
    <div class="step-body">
      <div class="step-title">Install chatops.js</div>
      <pre data-lang="bash"><code>bun add @devchitchat/chatopsjs</code></pre>
    </div>
  </div>

  <div class="step">
    <div class="step-num">3</div>
    <div class="step-body">
      <div class="step-title">Create your modules directory</div>
      <pre data-lang="bash"><code>mkdir modules</code></pre>
      <p>Modules auto-load from this directory. Any <code>.js</code> file that exports a default async function is picked up automatically.</p>
    </div>
  </div>

  <div class="step">
    <div class="step-num">4</div>
    <div class="step-body">
      <div class="step-title">Create an entry point</div>
      <pre data-lang="js"><code>// app.js
import { Robot, CliAdapter } from '@devchitchat/chatopsjs'

const robot = await Robot.create({ directory: './modules' })
const cli = new CliAdapter(robot)
robot.adapters.add(cli)
await cli.start()</code></pre>
    </div>
  </div>
</div>

<h2 id="first-command">Your First Command</h2>

<p>Create a file at <code>modules/hello.js</code>:</p>

<pre data-lang="js"><code>import { Command, createTextResponse } from '@devchitchat/chatopsjs'

export default async function (robot) {
  robot.commands.register(new Command({
    id: 'hello',
    description: 'Say hello from mission control',
    aliases: ['hi', 'greet'],
    args: {
      name: { type: 'string', required: false }
    },
    handler: async (ctx) => {
      const who = ctx.args.name ?? ctx.envelope.actor.id
      return createTextResponse(\`Hello, \${who}! All systems nominal. 🚀\`)
    }
  }))
}</code></pre>

<p>Run it:</p>

<pre data-lang="bash"><code>bun run app.js
chatops&gt; hello
Hello, cli! All systems nominal. 🚀

chatops&gt; hello --name "Houston"
Hello, Houston! All systems nominal. 🚀

chatops&gt; hi
Hello, cli! All systems nominal. 🚀</code></pre>

<h2 id="structured-responses">Structured Responses</h2>

<p>chatops.js has three response types that let you be as rich or as portable as you need:</p>

<pre data-lang="js"><code>import {
  createTextResponse,
  createMessageResponse,
  createNativeResponse
} from '@devchitchat/chatopsjs'

// 1. Plain text — works everywhere
createTextResponse('Deploy complete.')

// 2. Structured IR — adapters render blocks to platform-native UI
createMessageResponse({
  fallbackText: 'Deploy complete',
  blocks: [
    { type: 'section', text: '✅ Deploy complete' },
    { type: 'facts', items: [
      { label: 'Service',     value: 'api-gateway'   },
      { label: 'Version',     value: 'v2.4.1'        },
      { label: 'Environment', value: 'production'    }
    ]}
  ]
})

// 3. Native — full provider payload as escape hatch
createNativeResponse({
  fallbackText: 'Deploy complete',
  provider: 'slack',
  payload: {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '✅ Deploy complete' } }
    ]
  }
})</code></pre>

<h2 id="built-in-help">Built-In Help</h2>

<p>
  The <code>help</code> command is registered automatically by <code>Robot.create()</code>.
  It lists every registered command with its description.
</p>

<pre data-lang="bash"><code>chatops&gt; help
Available commands:

  hello     Say hello from mission control
  help      List available commands</code></pre>

<h2 id="permissions">Permissions</h2>

<p>Commands can declare required permissions. The CLI adapter assigns permissions via the <code>actor</code> option:</p>

<pre data-lang="js"><code>import { Robot, CliAdapter, Command, createTextResponse } from '@devchitchat/chatopsjs'

const robot = await Robot.create({ directory: './modules' })

const cli = new CliAdapter(robot, {
  actor: {
    id: 'ops-engineer',
    permissions: ['deploys:write', 'tickets:read']
  }
})

robot.adapters.add(cli)
await cli.start()</code></pre>

<pre data-lang="js"><code>// In a module:
robot.commands.register(new Command({
  id: 'deploy',
  description: 'Trigger a deployment',
  permissions: ['deploys:write'],   // ← required
  handler: async (ctx) => createTextResponse('Launching deployment...')
}))</code></pre>

<h2 id="confirmation">Confirmation Flow</h2>

<p>Add <code>confirm</code> to a command to require explicit approval before execution:</p>

<pre data-lang="js"><code>robot.commands.register(new Command({
  id: 'rollback',
  description: 'Roll back the last deployment',
  permissions: ['deploys:write'],
  confirm: {
    mode: 'yes-no',
    message: '⚠️  This will roll back production. Are you sure? (yes/no)'
  },
  handler: async (ctx) => createTextResponse('Rolling back… hang tight.')
}))</code></pre>

<pre data-lang="bash"><code>chatops&gt; rollback
⚠️  This will roll back production. Are you sure? (yes/no)
chatops&gt; yes
Rolling back… hang tight.</code></pre>

<h2 id="middleware">Middleware</h2>

<p>Middleware functions run on every command. Use them for logging, metrics, or cross-cutting concerns:</p>

<pre data-lang="js"><code>robot.use(async (ctx, next) => {
  const start = Date.now()
  console.log(\`→ \${ctx.command.id} by \${ctx.envelope.actor.id}\`)
  await next()
  console.log(\`← \${ctx.command.id} in \${Date.now() - start}ms\`)
})</code></pre>

<div class="callout info">
  <span class="callout-icon">📡</span>
  <div class="callout-body">
    <div class="callout-title">Next: Connect a Real Platform</div>
    <p>The CLI adapter is great for development. When you're ready to connect to Slack, Discord, or
    another platform, see the <a href="adapters.html">Creating Adapters</a> guide.</p>
  </div>
</div>
`
}
