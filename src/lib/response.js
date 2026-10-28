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
export function createCardResponse({ status, body = null, toolCalls = [], usage = null, fallbackText = '', receipt = undefined }) {
  const card = { status, body, toolCalls, usage }
  if (receipt !== undefined) card.receipt = receipt
  return {
    text: fallbackText,
    card,
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
 * When toolUseId is supplied, matches by id (parallel same-name tools stay correct).
 * Falls back to last-running-by-name when toolUseId is not provided (backward compat).
 */
export function cardWithToolResult(card, name, resultSummary, status = 'done', toolUseId = null) {
  const toolCalls = [...(card.card?.toolCalls ?? [])]
  const idx = toolUseId != null
    ? toolCalls.findLastIndex(t => t.toolUseId === toolUseId && t.status === 'running')
    : toolCalls.findLastIndex(t => t.name === name && t.status === 'running')
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
 * Any tool calls still 'running' are marked 'done' with no summary (they ran but
 * no result event arrived before the agent finished).
 * Pass body / fallbackText to override the current card's values.
 */
export function cardDone(card, { usage = null, body = undefined, fallbackText = undefined, receipt = undefined } = {}) {
  const toolCalls = (card.card?.toolCalls ?? []).map(t =>
    t.status === 'running' ? { ...t, status: 'done', resultSummary: null } : t
  )
  const resolvedBody = body !== undefined ? body : (card.card?.body ?? null)
  // receipt: explicit arg takes priority; otherwise preserve what's already on card.card
  const resolvedReceipt = receipt !== undefined ? receipt : card.card?.receipt
  return createCardResponse({
    ...card.card,
    toolCalls,
    body: resolvedBody,
    fallbackText: fallbackText ?? card.text,
    status: 'done',
    usage,
    receipt: resolvedReceipt,
  })
}

/**
 * Return a new card response in error state.
 * Any tool calls still 'running' are marked 'error'.
 */
export function cardError(card, message) {
  const toolCalls = (card.card?.toolCalls ?? []).map(t =>
    t.status === 'running' ? { ...t, status: 'error' } : t
  )
  return createCardResponse({
    ...card.card,
    toolCalls,
    fallbackText: message,
    body: message,
    status: 'error',
  })
}
