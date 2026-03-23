export function createTextResponse(text) {
  return { text }
}

export function createMessageResponse({ fallbackText, blocks = [] }) {
  return { text: fallbackText, blocks }
}

export function createNativeResponse({ fallbackText, provider, payload }) {
  return { text: fallbackText, native: { provider, payload } }
}
