import {
  detectCodexMarkers,
  isValidHttpUrl
} from './importConfigUtils'

/** 从 Claude Code settings.json 解析出的导入参数 */
export interface ParsedClaudeConfig {
  baseUrl: string
  apiKey: string
}

/** Claude Code 配置校验失败时的结构化结果 */
export interface ClaudeConfigValidationError {
  field: 'claudeSettingsJson'
  message: string
}

/**
 * 校验文本是否为合法 JSON 对象
 */
function assertJsonObject(content: string): { ok: true; record: Record<string, unknown> } | { ok: false; message: string } {
  const trimmed = content.trim()

  if (!trimmed.startsWith('{')) {
    return { ok: false, message: '请粘贴有效的 settings.json（JSON 对象）' }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, message: 'settings.json 必须是 JSON 对象' }
    }
    return { ok: true, record: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, message: 'settings.json 不是有效的 JSON 格式' }
  }
}

/**
 * 校验并解析 Claude Code settings.json
 * - 仅支持 ~/.claude/settings.json 标准 JSON 格式
 * - 从 env.ANTHROPIC_BASE_URL 与 env.ANTHROPIC_AUTH_TOKEN 提取导入参数
 */
export function validateAndParseClaudeConfig(
  settingsJson: string
): { ok: true; data: ParsedClaudeConfig } | { ok: false; errors: ClaudeConfigValidationError[] } {
  const trimmed = settingsJson.trim()
  const field = 'claudeSettingsJson' as const

  if (!trimmed) {
    return { ok: false, errors: [{ field, message: 'settings.json 不能为空' }] }
  }

  if (detectCodexMarkers(trimmed)) {
    return {
      ok: false,
      errors: [{ field, message: '检测到 Codex 配置，请切换到 Codex 标签页' }]
    }
  }

  const jsonResult = assertJsonObject(trimmed)
  if (!jsonResult.ok) {
    return { ok: false, errors: [{ field, message: jsonResult.message }] }
  }

  const env = jsonResult.record.env
  if (typeof env !== 'object' || env === null || Array.isArray(env)) {
    return { ok: false, errors: [{ field, message: 'settings.json 中缺少 env 对象' }] }
  }

  const envRecord = env as Record<string, unknown>
  const baseUrl = envRecord.ANTHROPIC_BASE_URL
  const apiKey = envRecord.ANTHROPIC_AUTH_TOKEN

  const errors: ClaudeConfigValidationError[] = []

  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    errors.push({ field, message: 'env 中缺少有效的 ANTHROPIC_BASE_URL' })
  } else if (!isValidHttpUrl(baseUrl)) {
    errors.push({ field, message: 'ANTHROPIC_BASE_URL 必须是有效的 HTTP(S) 地址' })
  }

  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    errors.push({ field, message: 'env 中缺少有效的 ANTHROPIC_AUTH_TOKEN' })
  }

  if (errors.length > 0 || typeof baseUrl !== 'string' || typeof apiKey !== 'string') {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim()
    }
  }
}
