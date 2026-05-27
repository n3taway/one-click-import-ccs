import { buildCcSwitchImportDeeplink } from './ccswitchImport'
import type { CcSwitchClientType, GroupPlatform } from './types'

/** CC Switch 用量查询脚本，导入后用于在客户端展示剩余额度 */
export const DEFAULT_CCS_USAGE_SCRIPT = `({
  request: {
    url: "{{baseUrl}}/v1/usage",
    method: "GET",
    headers: { "Authorization": "Bearer {{apiKey}}" }
  },
  extractor: function(response) {
    const remaining = response?.remaining ?? response?.quota?.remaining ?? response?.balance;
    const unit = response?.unit ?? response?.quota?.unit ?? "USD";
    return {
      isValid: response?.is_active ?? response?.isValid ?? true,
      remaining,
      unit
    };
  }
})`

/** CC Switch 导入参数 */
export interface ExecuteCcsImportOptions {
  /** 网关 base URL */
  baseUrl: string
  /** API Key */
  apiKey: string
  /** 分组平台，决定 CC Switch 导入目标应用 */
  platform?: GroupPlatform
  /** Antigravity 等平台需指定客户端类型 */
  clientType?: CcSwitchClientType
  /** CC Switch 中显示的 Provider 名称 */
  providerName?: string
  /** 用量查询脚本，默认使用 DEFAULT_CCS_USAGE_SCRIPT */
  usageScript?: string
  /** 协议唤起失败时的回调 */
  onError?: (message: string) => void
}

/**
 * 根据配置构建 ccswitch:// 导入深链字符串
 */
export function buildCcsImportDeeplink(options: Omit<ExecuteCcsImportOptions, 'onError'>): string {
  const {
    baseUrl,
    apiKey,
    platform = 'anthropic',
    clientType = 'claude',
    providerName = 'sub2api',
    usageScript = DEFAULT_CCS_USAGE_SCRIPT
  } = options

  return buildCcSwitchImportDeeplink({
    baseUrl,
    platform,
    clientType,
    providerName,
    apiKey,
    usageScript
  })
}

/**
 * 打开 ccswitch:// 深链，触发本地 CC Switch 协议处理器
 * - 100ms 后若页面仍聚焦，视为未安装 CC Switch 并触发 onError
 */
export function openCcSwitchDeeplink(deeplink: string, onError?: (message: string) => void): void {
  try {
    window.open(deeplink, '_self')

    // 若协议处理器未生效，页面仍会保持焦点
    setTimeout(() => {
      if (document.hasFocus()) {
        onError?.('未检测到 CC Switch，请先安装 CC Switch 客户端')
      }
    }, 100)
  } catch {
    onError?.('未检测到 CC Switch，请先安装 CC Switch 客户端')
  }
}

/**
 * 构建深链并直接唤起 CC Switch（Generator 与 Landing 共用底层能力）
 */
export function executeCcsImport(options: ExecuteCcsImportOptions): void {
  const { onError, ...deeplinkOptions } = options
  const deeplink = buildCcsImportDeeplink(deeplinkOptions)
  openCcSwitchDeeplink(deeplink, onError)
}
