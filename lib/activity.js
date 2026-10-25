// DSH wire-event projection. No host, UI, or Electron dependencies.
export function asText(value, max = 80) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

export function titleOf(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null
  for (const key of ['title', 'displayTitle', 'name', 'label', 'summary', 'text']) {
    const text = asText(snapshot[key], 80)
    if (text) return text
  }
  return null
}

export function extractEventText(event) {
  if (!event || typeof event !== 'object') return null
  const data = event.data && typeof event.data === 'object' ? event.data : event
  if (event.type === 'assistant/chunk') {
    const chunk = data.chunk
    // Never expose reasoning, tool arguments, tool output, or user prompts.
    return chunk?.type === 'text-delta' && typeof chunk.text === 'string'
      ? { text: chunk.text.slice(-4000), append: true } : null
  }
  if (event.type === 'assistant/message') {
    const content = data.message?.content
    if (!Array.isArray(content)) return null
    const text = content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n')
    // A tool-only/empty authoritative message also replaces a failed attempt.
    return { text: text.slice(-4000), append: false }
  }
  if (event.type) return null
  // Legacy flat events remain supported, without stripping spaces from deltas.
  for (const key of ['delta', 'chunk']) {
    if (typeof data[key] === 'string' && data[key]) return { text: data[key].slice(-4000), append: true }
  }
  for (const text of [data.text, data.output, data.preview, data.message?.text]) {
    if (typeof text === 'string' && text) return { text: text.slice(-4000), append: false }
  }
  return null
}

export function tailPreview(value) {
  const text = asText(value, Infinity)
  if (!text || text.length <= 120) return text
  const tail = text.slice(-120)
  const space = tail.indexOf(' ')
  return '…' + (space >= 0 ? tail.slice(space + 1) : tail)
}

export function stepLineOf(event) {
  if (!event || typeof event !== 'object') return null
  const data = event.data && typeof event.data === 'object' ? event.data : event
  const type = String(event.type || event.kind || '').toLowerCase()
  const tool = asText(data.tool?.name || (typeof data.tool === 'string' && data.tool) || data.toolName || data.name, 60)
  const sub = asText(data.title || data.summary || data.commandName || data.phase, 44)
  if (event.type === 'tool/result') {
    const failed = !!data.error || data.message?.content?.some(b => b?.type === 'tool-result' && b.isError)
    return { kind: failed ? 'error' : 'tool-result', line: failed ? '⚠️ Tool failed' : '✓ Tool finished' }
  }
  if (event.type === 'assistant/chunk') {
    if (data.chunk?.type === 'reasoning-delta') return { kind: 'thinking', line: '💭 Thinking…' }
    return data.chunk?.type === 'text-delta' ? { kind: 'assistant', line: '✍️ Writing…' } : null
  }
  if (event.type === 'assistant/message') return { kind: 'assistant', line: '✍️ Response ready' }
  if (event.type === 'turn/end') return { kind: 'outcome', line: outcomeLabel(data.reason?.kind) }
  if (event.type === 'todo/write') {
    const current = data.todos?.find(t => t?.status === 'in_progress')
    return current ? { kind: 'todo', line: '📋 ' + (asText(current.content, 100) || 'Working') } : null
  }
  if (type.includes('tool') || tool) return { kind: 'tool', line: '🔧 ' + (tool || 'tool') + (sub ? ' · ' + sub : '') }
  if (type.includes('error')) return { kind: 'error', line: '⚠️ ' + (sub || 'error') }
  if (type.includes('retry')) return { kind: 'retry', line: '🔁 retry' + (sub ? ' · ' + sub : '') }
  if (type.includes('steering')) return { kind: 'steering', line: '🧭 steering' + (sub ? ' · ' + sub : '') }
  if (type.includes('workflow')) return { kind: 'workflow', line: '🚀 ' + (sub || 'workflow phase') }
  if (type.includes('command')) return { kind: 'command', line: '⌨️ command' + (sub ? ' · ' + sub : '') }
  if (type.includes('assistant')) return { kind: 'assistant', line: '💭 writing…' }
  if (type.includes('compaction') || type.includes('context')) return { kind: 'context', line: '📄 ' + (sub || 'context') }
  return null
}

export function outcomeLabel(outcome) {
  return ({ completed: '✅ Turn complete', error: '⚠️ Run failed', aborted: '⏹ Run cancelled',
    blocked: '⏸ Run blocked', 'max-tokens': '⚠️ Output limit reached', interrupted: '⚠️ Run interrupted' })[outcome] || 'ℹ️ Run idle'
}

export function createActivityTracker({ now = Date.now, titleFor = () => null, showThinking = false } = {}) {
  const running = new Map()
  let completed = []
  let lastAt = 0
  let thinkingVisible = !!showThinking
  const refreshTitle = (rec, session) => { rec.title = titleFor(session || rec.id) || rec.title || 'Session' }
  const start = (agent) => {
    const id = agent?.id ?? agent?.sessionId
    if (id == null) return
    if (running.has(id)) return
    const rec = { id, title: null, outText: '', thinkText: '', streamKind: null, log: [], lastKind: '', lastEventAt: now(), outcome: null, step: null }
    refreshTitle(rec, agent.session)
    running.set(id, rec)
    completed = completed.filter(c => c.id !== id)
  }
  const finish = (id, fallback = 'idle') => {
    const rec = running.get(id)
    if (!rec) return
    running.delete(id)
    refreshTitle(rec)
    const outcome = rec.outcome || fallback
    const at = lastAt = Math.max(now(), lastAt + 1)
    completed.push({ id, title: rec.title, at, outcome, preview: tailPreview(rec.outText || (thinkingVisible ? rec.thinkText : '')), lines: rec.log.slice(-12) })
    completed = completed.slice(-20)
  }
  const status = ({ agent, status } = {}) => {
    if (status === 'running') start(agent)
    else if (status === 'idle') finish(agent?.id ?? agent?.sessionId)
    else if (status === 'error') finish(agent?.id ?? agent?.sessionId, 'error')
    else if (status === 'stopped' || status === 'disposed') finish(agent?.id ?? agent?.sessionId, 'aborted')
  }
  const event = (session, event) => {
    const rec = running.get(session?.id ?? event?.sessionId)
    // Replay, background metadata, and disposed sessions must not invent live work.
    if (!rec || !event) return
    rec.lastEventAt = now()
    refreshTitle(rec, session)
    if (event.type === 'turn/start') {
      rec.outcome = null
      rec.outText = ''
      rec.thinkText = ''
      rec.streamKind = null
      rec.log = []
      rec.lastKind = ''
      rec.step = null
    }
    if (event.type === 'step/start' || (event.type === 'assistant/chunk' && rec.step !== event.data?.step)) {
      rec.step = event.data?.step
      rec.outText = ''
      rec.thinkText = ''
      rec.streamKind = null
    }
    const chunk = event.type === 'assistant/chunk' ? event.data?.chunk : null
    if (chunk?.type === 'finish' && ['error', 'aborted'].includes(chunk.reason?.kind)) { rec.outText = ''; rec.thinkText = ''; rec.streamKind = null }
    // Reasoning stays private unless the operator opted in; when visible it
    // becomes the live milestone only while it is the most recent stream.
    if (chunk?.type === 'reasoning-delta' && typeof chunk.text === 'string' && thinkingVisible) {
      rec.thinkText = (rec.thinkText + chunk.text).slice(-600)
      rec.streamKind = 'think'
    }
    const text = extractEventText(event)
    if (text) { rec.outText = (text.append ? rec.outText + text.text : text.text).slice(-600); rec.streamKind = 'text' }
    const line = stepLineOf(event)
    if (line) {
      if (rec.lastKind === line.kind && rec.log.length) rec.log[rec.log.length - 1] = line.line
      else rec.log.push(line.line)
      rec.lastKind = line.kind
      if (rec.log.length > 16) rec.log.shift()
    }
    if (event.type === 'turn/end') rec.outcome = event.data?.reason?.kind || 'idle'
  }
  const snapshot = () => {
    const time = now()
    completed = completed.filter(c => time - c.at < 21_600_000)
    const rows = [...running.values()].map(rec => {
      refreshTitle(rec)
      const thinking = thinkingVisible && rec.streamKind === 'think' && rec.thinkText
      const milestone = thinking ? rec.thinkText : rec.outText
      return { id: rec.id, title: rec.title, preview: tailPreview(milestone), kind: thinking ? 'think' : rec.outText ? 'text' : null, lines: rec.log.slice(-12), ageMs: Math.max(0, time - rec.lastEventAt) }
    }).sort((a, b) => a.ageMs - b.ageMs || String(a.id).localeCompare(String(b.id)))
    return { running: rows, runningCount: rows.length, completed: completed.at(-1) || null, completions: completed.slice() }
  }
  return { status, event, snapshot,
    setShowThinking(enabled) { thinkingVisible = !!enabled },
    dispose(id) { finish(id, 'aborted') },
    dismiss(at) { completed = completed.filter(c => c.at !== at) },
    clear() { completed = [] },
    destroy() { running.clear(); completed = [] },
  }
}
