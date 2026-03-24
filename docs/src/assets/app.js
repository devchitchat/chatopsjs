/* chatops.js docs — client-side interactions */
(function () {
  'use strict'

  /* --- Mobile nav toggle --- */
  const toggle  = document.getElementById('navToggle')
  const sidebar = document.getElementById('sidebar')

  function openNav() {
    sidebar.classList.add('open')
    document.body.style.overflow = 'hidden'
  }

  function closeNav() {
    sidebar.classList.remove('open')
    document.body.style.overflow = ''
  }

  if (toggle) toggle.addEventListener('click', e => {
    e.stopPropagation()
    sidebar.classList.contains('open') ? closeNav() : openNav()
  })

  /* Close nav when clicking outside the sidebar on mobile */
  document.addEventListener('click', e => {
    if (window.innerWidth <= 720 && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
      closeNav()
    }
  })

  /* --- Copy-to-clipboard for code blocks --- */
  document.querySelectorAll('pre').forEach(pre => {
    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'
    pre.parentNode.insertBefore(wrapper, pre)
    wrapper.appendChild(pre)

    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.textContent = 'Copy'
    wrapper.appendChild(btn)

    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')
      const text = (code || pre).innerText
      try {
        await navigator.clipboard.writeText(text)
        btn.textContent = 'Copied!'
        btn.classList.add('copied')
        setTimeout(() => {
          btn.textContent = 'Copy'
          btn.classList.remove('copied')
        }, 2000)
      } catch (_) {
        btn.textContent = 'Error'
      }
    })
  })

  /* --- Active section highlight in sidebar (scroll spy) --- */
  const headings = document.querySelectorAll('h2[id], h3[id]')
  if (headings.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('id')
        const link = document.querySelector(`.sidebar-nav a[href="#${id}"]`)
        if (link) link.classList.toggle('active', entry.isIntersecting)
      })
    }, { rootMargin: '-60px 0px -70% 0px' })
    headings.forEach(h => obs.observe(h))
  }
})()
