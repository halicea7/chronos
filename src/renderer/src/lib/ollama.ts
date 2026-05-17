export interface OllamaModel {
  name: string
  size?: number // bytes
  details?: { families?: string[] }
}

// ---------------------------------------------------------------------------
// Model name formatting
// ---------------------------------------------------------------------------

const KNOWN_NAMES: Record<string, string> = {
  deepseek: 'DeepSeek', qwen: 'Qwen', gemma: 'Gemma', llama: 'Llama',
  mistral: 'Mistral', mixtral: 'Mixtral', dolphin: 'Dolphin', phi: 'Phi',
  falcon: 'Falcon', vicuna: 'Vicuna', orca: 'Orca', wizard: 'Wizard',
  nous: 'Nous', hermes: 'Hermes', openchat: 'OpenChat', codellama: 'CodeLlama',
  neural: 'Neural', starling: 'Starling', stablelm: 'StableLM', tinyllama: 'TinyLlama',
  zephyr: 'Zephyr', solar: 'Solar', yi: 'Yi', granite: 'Granite',
  internlm: 'InternLM', internvl: 'InternVL', pixtral: 'Pixtral',
  smollm: 'SmolLM', nemotron: 'Nemotron', command: 'Command',
  magistral: 'Magistral', nomic: 'Nomic', mxbai: 'MxBai',
}

const DROP_TOKENS = new Set(['gguf', 'latest'])
const UPPER_TOKENS = new Set(['it', 'cpu', 'gpu'])

// e.g. 14b → 14B, 64k → 64K, 8x7b → 8x7B
const SIZE_RE = /^(\d+)(x\d+)?([bkmg])$/i

// If a token starts with a known brand name followed by digits (gemma4, qwen3),
// split it so the version number gets its own token.
function subSplit(token: string): string[] {
  const m = token.match(/^([a-zA-Z]+)([\d.].*)$/)
  if (m && KNOWN_NAMES[m[1].toLowerCase()]) return [m[1], m[2]]
  return [token]
}

function fmtToken(token: string): string | null {
  const lower = token.toLowerCase()
  if (DROP_TOKENS.has(lower)) return null
  if (UPPER_TOKENS.has(lower)) return token.toUpperCase()
  if (KNOWN_NAMES[lower]) return KNOWN_NAMES[lower]

  const sm = token.match(SIZE_RE)
  if (sm) return `${sm[1]}${sm[2] ?? ''}${sm[3].toUpperCase()}`

  if (/^\d+\.?\d*$/.test(token)) return token          // bare number / version
  if (token !== token.toLowerCase()) return token       // already has casing (E4B, R1)
  return token.charAt(0).toUpperCase() + token.slice(1) // capitalise
}

export function formatModelName(raw: string): string {
  // Strip registry namespace (huihui_ai/..., igorls/...)
  const stripped = raw.includes('/') ? raw.split('/').pop()! : raw
  const colon = stripped.indexOf(':')
  const base = colon >= 0 ? stripped.slice(0, colon) : stripped
  const tag  = colon >= 0 ? stripped.slice(colon + 1) : ''

  const baseTokens = base.split(/[-_]/)
  const tagTokens  = tag ? tag.split(/[-_]/).filter(t => t.toLowerCase() !== 'latest') : []

  const result = [...baseTokens, ...tagTokens]
    .flatMap(subSplit)
    .map(fmtToken)
    .filter((t): t is string => t !== null)
    .join(' ')

  return result || raw
}

export function formatModelSize(bytes?: number): string {
  if (!bytes) return ''
  const gb = bytes / 1e9
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string  // extended reasoning trace
  image?: string     // base64 data URL
}

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

const VISION_FAMILIES = new Set(['clip', 'llava', 'moondream'])

export function modelSupportsVision(model: OllamaModel): boolean {
  return model.details?.families?.some((f) => VISION_FAMILIES.has(f.toLowerCase())) ?? false
}

// Word-boundary match on r1 prevents false positives like "gr1p" or "orca1".
const THINKING_PATTERN = /\br1\b|qwq|thinking/i

export function modelNameSupportsThinking(name: string): boolean {
  return THINKING_PATTERN.test(name)
}

// ---------------------------------------------------------------------------
// API calls — run directly from renderer (localhost, no CORS issues)
// ---------------------------------------------------------------------------

export async function fetchModels(host: string): Promise<OllamaModel[]> {
  const res = await fetch(`${host}/api/tags`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.models as OllamaModel[]
}

export async function fetchModelDetails(
  host: string,
  name: string
): Promise<{ supportsVision: boolean; supportsThinking: boolean }> {
  const res = await fetch(`${host}/api/show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) return { supportsVision: false, supportsThinking: false }
  const data = await res.json()

  const families: string[] = data.details?.families ?? []
  const capabilities: string[] = data.capabilities ?? []
  const mf: string = (data.modelfile ?? '').toLowerCase()

  // Ollama ≥ 0.9 exposes explicit capability flags; older builds rely on families/modelfile.
  const supportsVision =
    capabilities.includes('vision') ||
    families.some((f: string) => VISION_FAMILIES.has(f.toLowerCase())) ||
    [...VISION_FAMILIES].some((v) => mf.includes(v))

  const supportsThinking =
    capabilities.includes('thinking') || modelNameSupportsThinking(name)

  return { supportsVision, supportsThinking }
}

// ---------------------------------------------------------------------------
// Streaming chat
// ---------------------------------------------------------------------------

export interface ChatChunk {
  content?: string
  thinking?: string
}

export async function* streamChat(
  host: string,
  model: string,
  messages: Message[],
  signal: AbortSignal,
  think = false
): AsyncGenerator<ChatChunk> {
  const body: Record<string, unknown> = {
    model,
    stream: true,
    messages: messages.map((m) => {
      const out: Record<string, unknown> = { role: m.role, content: m.content }
      if (m.image) {
        out.images = [m.image.replace(/^data:[^;]+;base64,/, '')]
      }
      return out
    }),
  }
  if (think) body.think = true

  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const chunk = JSON.parse(line)
        const content = chunk.message?.content as string | undefined
        const thinking = chunk.message?.thinking as string | undefined
        if (content || thinking) yield { content: content || undefined, thinking: thinking || undefined }
        if (chunk.done) return
      } catch {
        // skip malformed line
      }
    }
  }
}
