/** 从 Codex config.toml 与 auth.json 解析出的导入参数 */
export interface ParsedCodexConfig {
  baseUrl: string
  apiKey: string
}

/** 配置校验失败时的结构化结果 */
export interface CodexConfigValidationError {
  field: 'configToml' | 'authJson'
  message: string
}

/**
 * 解析 config.toml 中的 OpenAI Provider 配置
 * - 仅支持 Codex CLI 标准格式，不引入完整 TOML 解析器
 */
export function parseCodexConfigToml(content: string): {
  baseUrl?: string
  errors: CodexConfigValidationError[]
} {
  const errors: CodexConfigValidationError[] = []
  const trimmed = content.trim()

  if (!trimmed) {
    errors.push({ field: 'configToml', message: 'config.toml 不能为空' })
    return { errors }
  }

  const modelProviderMatch = trimmed.match(/^model_provider\s*=\s*"([^"]+)"/m)
  if (!modelProviderMatch) {
    errors.push({ field: 'configToml', message: '缺少 model_provider 配置' })
  } else if (modelProviderMatch[1] !== 'OpenAI') {
    errors.push({ field: 'configToml', message: 'model_provider 必须为 "OpenAI"' })
  }

  const sectionMatch = trimmed.match(/\[model_providers\.OpenAI\]([\s\S]*?)(?=\n\[|$)/)
  if (!sectionMatch) {
    errors.push({ field: 'configToml', message: '缺少 [model_providers.OpenAI] 配置段' })
    return { errors }
  }

  const baseUrlMatch = sectionMatch[1].match(/base_url\s*=\s*"([^"]+)"/)
  if (!baseUrlMatch) {
    errors.push({ field: 'configToml', message: '[model_providers.OpenAI] 中缺少 base_url' })
    return { errors }
  }

  const baseUrl = baseUrlMatch[1].trim()
  if (!/^https?:\/\/.+/.test(baseUrl)) {
    errors.push({ field: 'configToml', message: 'base_url 必须是有效的 HTTP(S) 地址' })
    return { errors }
  }

  return { baseUrl, errors }
}

/**
 * 解析 auth.json 中的 OPENAI_API_KEY
 */
export function parseCodexAuthJson(content: string): {
  apiKey?: string
  errors: CodexConfigValidationError[]
} {
  const errors: CodexConfigValidationError[] = []
  const trimmed = content.trim()

  if (!trimmed) {
    errors.push({ field: 'authJson', message: 'auth.json 不能为空' })
    return { errors }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      errors.push({ field: 'authJson', message: 'auth.json 必须是 JSON 对象' })
      return { errors }
    }

    const apiKey = (parsed as Record<string, unknown>).OPENAI_API_KEY
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      errors.push({ field: 'authJson', message: 'auth.json 中缺少有效的 OPENAI_API_KEY' })
      return { errors }
    }

    return { apiKey: apiKey.trim(), errors }
  } catch {
    errors.push({ field: 'authJson', message: 'auth.json 不是有效的 JSON 格式' })
    return { errors }
  }
}

/**
 * 合并校验 config.toml 与 auth.json，全部通过时返回导入所需参数
 */
export function validateAndParseCodexConfig(
  configToml: string,
  authJson: string
): { ok: true; data: ParsedCodexConfig } | { ok: false; errors: CodexConfigValidationError[] } {
  const tomlResult = parseCodexConfigToml(configToml)
  const authResult = parseCodexAuthJson(authJson)
  const errors = [...tomlResult.errors, ...authResult.errors]

  if (errors.length > 0 || !tomlResult.baseUrl || !authResult.apiKey) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      baseUrl: tomlResult.baseUrl,
      apiKey: authResult.apiKey
    }
  }
}

/**
 * 从 base_url 提取 hostname 作为 CC Switch Provider 显示名称
 */
export function extractProviderName(baseUrl: string): string {
  return new URL(baseUrl).hostname
}
