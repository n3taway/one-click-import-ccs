/**
 * 从网关 URL 提取 hostname，作为 CC Switch Provider 显示名称
 */
export function extractProviderName(baseUrl: string): string {
  return new URL(baseUrl).hostname
}

/**
 * 校验是否为合法 HTTP(S) URL
 */
export function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/.test(url.trim())
}

/** Codex 配置特征，用于检测格式混用 */
const CODEX_MARKERS = [
  /model_provider\s*=/,
  /\[model_providers\.OpenAI\]/,
  /OPENAI_API_KEY/,
  /wire_api\s*=/
]

/** Claude Code 配置特征，用于检测格式混用 */
const CLAUDE_MARKERS = [/ANTHROPIC_BASE_URL/, /ANTHROPIC_AUTH_TOKEN/]

/**
 * 检测文本中是否包含 Codex 配置特征
 */
export function detectCodexMarkers(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return CODEX_MARKERS.some((pattern) => pattern.test(trimmed))
}

/**
 * 检测文本中是否包含 Claude Code 配置特征
 */
export function detectClaudeMarkers(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return CLAUDE_MARKERS.some((pattern) => pattern.test(trimmed))
}
