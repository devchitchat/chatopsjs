export function createTextResponse(text) {
  return {
    kind: 'text',
    fallbackText: text,
    primitives: [
      {
        type: 'text',
        text
      }
    ],
    message: null,
    native: null
  }
}

export function createMessageResponse({ fallbackText, blocks = [], primitives = [] }) {
  return {
    kind: 'message',
    fallbackText,
    primitives,
    message: {
      blocks
    },
    native: null
  }
}

export function createNativeResponse({ fallbackText, provider, payload, primitives = [] }) {
  return {
    kind: 'native',
    fallbackText,
    primitives,
    message: null,
    native: {
      provider,
      payload
    }
  }
}

export function normalizeResponse(response, adapterCapabilities = {}) {
  if (!response) {
    return createTextResponse('')
  }

  if (response.kind !== 'native') {
    return response
  }

  const supportedProviders = adapterCapabilities.nativePayload ?? []
  if (supportedProviders.includes(response.native.provider)) {
    return response
  }

  return {
    ...response,
    native: null
  }
}
