const CCSWITCH_PROTOCOL_PREFIX = 'ccswitch://'

/** CC Switch 深链 app 字段对应的界面展示名称 */
const APP_DISPLAY_NAMES: Record<string, string> = {
  codex: 'Codex',
  claude: 'Claude Code',
  gemini: 'Gemini'
}

/** 从 ccswitch:// 深链解析出的导入配置摘要 */
export interface ParsedCcSwitchDeeplink {
  /** 界面展示用平台名称 */
  platform: string
  /** 网关 base URL（homepage 参数） */
  baseUrl: string
  /** API Key */
  apiKey: string
}

/**
 * 将 ccswitch:// 深链编码为 base64，用于 URL 分享
 */
export function encodeDeeplink(deeplink: string): string {
  return btoa(deeplink)
}

/**
 * 从 base64 解码 ccswitch:// 深链
 * - 解码失败或协议不匹配时返回 null
 */
export function decodeDeeplink(encoded: string): string | null {
  try {
    const decoded = atob(encoded.trim())
    if (!decoded.startsWith(CCSWITCH_PROTOCOL_PREFIX)) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

/**
 * 基于当前站点域名构建带 deeplink 参数的分享 URL
 */
export function buildShareUrl(deeplink: string, origin: string = window.location.origin): string {
  const url = new URL(origin)
  url.searchParams.set('deeplink', encodeDeeplink(deeplink))
  return url.toString()
}

/**
 * 判断 URL 是否包含 deeplink 查询参数（不论是否有效）
 */
export function hasDeeplinkParam(search: string = window.location.search): boolean {
  return new URLSearchParams(search).has('deeplink')
}

/**
 * 从 URL 查询参数读取并解码 ccswitch:// 深链
 */
export function getDeeplinkFromSearch(search: string = window.location.search): string | null {
  const encoded = new URLSearchParams(search).get('deeplink')
  if (!encoded) {
    return null
  }
  return decodeDeeplink(encoded)
}

/**
 * 从 ccswitch://v1/import 深链解析平台、baseUrl、apiKey
 * - 缺少必要参数或格式不符时返回 null
 */
export function parseCcSwitchImportDeeplink(deeplink: string): ParsedCcSwitchDeeplink | null {
  if (!deeplink.startsWith(CCSWITCH_PROTOCOL_PREFIX)) {
    return null
  }

  const queryIndex = deeplink.indexOf('?')
  if (queryIndex === -1) {
    return null
  }

  const params = new URLSearchParams(deeplink.slice(queryIndex + 1))
  const app = params.get('app')?.trim() || ''
  const baseUrl = params.get('homepage')?.trim() || ''
  const apiKey = params.get('apiKey')?.trim() || ''

  if (!app || !baseUrl || !apiKey) {
    return null
  }

  return {
    platform: APP_DISPLAY_NAMES[app] ?? app,
    baseUrl,
    apiKey
  }
}
