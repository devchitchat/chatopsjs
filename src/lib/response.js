export function createTextResponse(text) {
  return { text }
}

export function createMessageResponse({ fallbackText, blocks = [] }) {
  return { text: fallbackText, blocks }
}

export function createNativeResponse({ fallbackText, provider, payload }) {
  return { text: fallbackText, native: { provider, payload } }
}

/**
 * Create an agent card response — a structured, live-updatable message shape
 * for agent interactions. The card progresses through status phases as the
 * agent works; callers patch it via adapter.edit() with updated card data.
 *
 * status:
 *   'thinking'  — agent received the message, no tools invoked yet
 *   'working'   — one or more tools are running
 *   'streaming' — text response is actively streaming in
 *   'done'      — agent finished, usage data available
 *   'error'     — agent encountered an unrecoverable error
 *
 * toolCalls: array of { name, input, status, resultSummary? }
 *   status: 'running' | 'done' | 'error'
 *
 * usage: { inputTokens, outputTokens, costUsd } — null until done
 *
 * fallbackText is sent as the plain .text field for adapters that do not
 * render cards (CLI, Discord, etc.).
 */
export function createCardResponse({ status, body = null, toolCalls = [], usage = null, fallbackText = '' }) {
  return {
    text: fallbackText,
    card: { status, body, toolCalls, usage },
  }
}

/**
 * Return a new card response with the given tool call appended.
 * Existing tool calls are preserved unchanged.
 */
export function cardWithToolCall(card, toolCall) {
  return createCardResponse({
    ...card.card,
    fallbackText: card.text,
    toolCalls: [...(card.card?.toolCalls ?? []), toolCall],
  })
}

/**
 * Return a new card response with the named tool call's status updated.
 * Matches on the last tool call with the given name that is still 'running'.
 */
export function cardWithToolResult(card, name, resultSummary, status = 'done') {
  const toolCalls = [...(card.card?.toolCalls ?? [])]
  const idx = toolCalls.findLastIndex(t => t.name === name && t.status === 'running')
  if (idx !== -1) {
    toolCalls[idx] = { ...toolCalls[idx], status, resultSummary }
  }
  return createCardResponse({
    ...card.card,
    fallbackText: card.text,
    toolCalls,
  })
}

/**
 * Return a new card response with the body replaced/extended and status set
 * to 'streaming'. Appending is the common case during text streaming.
 */
export function cardWithBody(card, body, status = 'streaming') {
  return createCardResponse({
    ...card.card,
    fallbackText: card.text,
    body,
    status,
  })
}

/**
 * Return a new card response marked done with final usage data.
 */
export function cardDone(card, { usage = null } = {}) {
  return createCardResponse({
    ...card.card,
    fallbackText: card.text,
    status: 'done',
    usage,
  })
}

/**
 * Return a new card response in error state.
 */
export function cardError(card, message) {
  return createCardResponse({
    ...card.card,
    fallbackText: message,
    body: message,
    status: 'error',
  })
}
