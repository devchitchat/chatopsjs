/**
 * Base HTML template for all documentation pages.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.nav      - active nav key
 * @param {string} opts.content  - inner HTML for .content
 * @param {boolean} [opts.hero]  - if true, content is rendered outside .content wrapper
 */
export function renderPage({ title, description, nav, content, hero = false }) {
  const navItems = [
    { key: 'home',            href: 'index.html',           icon: '🚀', label: 'Home' },
    { section: 'MISSION BRIEFINGS' },
    { key: 'getting-started', href: 'getting-started.html', icon: '▶', label: 'Getting Started' },
    { section: 'FIELD MANUALS' },
    { key: 'adapters',        href: 'adapters.html',        icon: '⚡', label: 'Creating Adapters' },
    { key: 'modules',         href: 'modules.html',         icon: '📦', label: 'Creating Modules' },
    { key: 'use-cases',       href: 'use-cases.html',       icon: '🛸', label: 'Common Use Cases' },
    { section: 'TECHNICAL DATA' },
    { key: 'api',             href: 'api.html',             icon: '📡', label: 'API Reference' },
  ]

  function navHtml() {
    return navItems.map(item => {
      if (item.section) {
        return `<div class="nav-section-title">${item.section}</div>`
      }
      const active = item.key === nav ? ' active' : ''
      return `<a href="${item.href}" class="nav-link${active}">
        <span class="nav-icon">${item.icon}</span>${item.label}</a>`
    }).join('\n    ')
  }

  const inner = hero ? content : `<div class="content">${content}</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — chatops.js</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title} — chatops.js">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="assets/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>">
</head>
<body>
  <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">☰</button>

  <div class="layout">
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="mission-patch">
          <div class="patch-icon">🚀</div>
          <div class="patch-text">
            <strong>chatops.js</strong>
            <span>v0.1.0 — Mission Active</span>
          </div>
        </div>
        <div class="mission-status">Systems nominal</div>
      </div>

      <div class="sidebar-nav">
        ${navHtml()}
      </div>

      <div class="sidebar-footer">
        <a href="https://github.com/devchitchat/chatopsjs" target="_blank" rel="noopener">GitHub ↗</a>
        &nbsp;·&nbsp;
        <a href="https://www.npmjs.com/package/@devchitchat/chatopsjs" target="_blank" rel="noopener">npm ↗</a>
      </div>
    </nav>

    <main class="main">
      ${inner}
    </main>
  </div>

  <script src="assets/app.js"></script>
</body>
</html>
`
}
