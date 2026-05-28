<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { validateAndParseClaudeConfig, type ClaudeConfigValidationError } from './utils/claudeConfigParser'
import {
  extractProviderName,
  validateAndParseCodexConfig,
  type CodexConfigValidationError
} from './utils/codexConfigParser'
import { buildCcsImportDeeplink, openCcSwitchDeeplink } from './utils/executeCcsImport'
import { buildShareUrl, getDeeplinkFromSearch, hasDeeplinkParam, parseCcSwitchImportDeeplink, type ParsedCcSwitchDeeplink } from './utils/shareDeeplink'

type ImportTab = 'codex' | 'claude'
type PageMode = 'generator' | 'landing-valid' | 'landing-invalid'

const CONFIG_TOML_PLACEHOLDER = `model_provider = "OpenAI"
model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true
model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.OpenAI]
name = "OpenAI"
base_url = "https://example.com"
wire_api = "responses"
requires_openai_auth = true`

const AUTH_JSON_PLACEHOLDER = `{
  "OPENAI_API_KEY": "sk-your-api-key"
}`

const CLAUDE_SETTINGS_PLACEHOLDER = `{
  "env": {
    "ANTHROPIC_BASE_URL": "https://example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-api-key",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
}`

const activeTab = ref<ImportTab>('codex')
const configToml = ref('')
const authJson = ref('')
const claudeSettingsJson = ref('')
const codexErrors = ref<CodexConfigValidationError[]>([])
const claudeErrors = ref<ClaudeConfigValidationError[]>([])
const globalMessage = ref('')
const shareUrl = ref('')
const shareUrlPlatform = ref<ImportTab | null>(null)
const pageMode = ref<PageMode>('generator')
const landingDeeplink = ref<string | null>(null)
/** Landing 页：从深链解析出的导入配置摘要 */
const landingImportInfo = ref<ParsedCcSwitchDeeplink | null>(null)
/** 全局吐司提示 */
type ToastType = 'success' | 'error'
const toastMessage = ref('')
const toastType = ref<ToastType>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const tabs: { id: ImportTab; label: string }[] = [
  { id: 'codex', label: 'Codex' },
  { id: 'claude', label: 'Claude Code' }
]

/** 平台 ID 对应的界面展示名称 */
const platformLabels: Record<ImportTab, string> = {
  codex: 'Codex',
  claude: 'Claude Code'
}

/** Codex 字段级校验错误 */
const codexErrorsByField = computed(() => ({
  configToml: codexErrors.value.filter((item) => item.field === 'configToml'),
  authJson: codexErrors.value.filter((item) => item.field === 'authJson')
}))

/** 判断 Codex 侧是否已填写（任一字段非空即视为已填） */
const isCodexFilled = computed(() =>
  configToml.value.trim() !== '' || authJson.value.trim() !== ''
)

/** 判断 Claude 侧是否已填写 */
const isClaudeFilled = computed(() => claudeSettingsJson.value.trim() !== '')

/** 两侧均已填写时展示警告，提醒一次操作只处理一个平台 */
const showMultiPlatformWarning = computed(() => isCodexFilled.value && isClaudeFilled.value)

/**
 * 根据 URL 中的 deeplink 参数决定页面模式
 */
onMounted(() => {
  if (!hasDeeplinkParam()) {
    pageMode.value = 'generator'
    return
  }

  const deeplink = getDeeplinkFromSearch()
  if (deeplink) {
    landingDeeplink.value = deeplink
    landingImportInfo.value = parseCcSwitchImportDeeplink(deeplink)
    pageMode.value = 'landing-valid'
    return
  }

  pageMode.value = 'landing-invalid'
})

/**
 * 切换标签页时清空错误与已生成的分享链接
 */
const switchTab = (tab: ImportTab) => {
  activeTab.value = tab
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''
  shareUrl.value = ''
  shareUrlPlatform.value = null
}

/**
 * 展示顶部吐司提示
 */
const showToast = (message: string, type: ToastType = 'success') => {
  toastMessage.value = message
  toastType.value = type

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastTimer = null
  }, 2000)
}

/**
 * 写入剪贴板，成功返回 true
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 复制分享链接并展示吐司反馈
 */
const copyShareUrl = async (url: string) => {
  const copied = await copyToClipboard(url)
  if (copied) {
    showToast('复制成功', 'success')
  } else {
    showToast('复制失败，请手动复制', 'error')
  }
}

/**
 * 按指定平台校验配置并构建 ccswitch:// 深链
 */
const buildDeeplinkForPlatform = (
  platform: ImportTab
): { ok: true; deeplink: string } | { ok: false } => {
  if (platform === 'codex') {
    const result = validateAndParseCodexConfig(configToml.value, authJson.value)
    if (!result.ok) {
      codexErrors.value = result.errors
      globalMessage.value = '请先修正配置格式后再操作'
      return { ok: false }
    }

    return {
      ok: true,
      deeplink: buildCcsImportDeeplink({
        baseUrl: result.data.baseUrl,
        apiKey: result.data.apiKey,
        platform: 'openai',
        providerName: extractProviderName(result.data.baseUrl)
      })
    }
  }

  const result = validateAndParseClaudeConfig(claudeSettingsJson.value)
  if (!result.ok) {
    claudeErrors.value = result.errors
    globalMessage.value = '请先修正配置格式后再操作'
    return { ok: false }
  }

  return {
    ok: true,
    deeplink: buildCcsImportDeeplink({
      baseUrl: result.data.baseUrl,
      apiKey: result.data.apiKey,
      platform: 'anthropic',
      providerName: extractProviderName(result.data.baseUrl)
    })
  }
}

/**
 * 生成指定平台的分享 URL，并默认写入剪贴板
 */
const handleGenerateLink = async (platform: ImportTab) => {
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''
  shareUrl.value = ''
  shareUrlPlatform.value = null

  const built = buildDeeplinkForPlatform(platform)
  if (!built.ok) {
    return
  }

  const url = buildShareUrl(built.deeplink)
  shareUrl.value = url
  shareUrlPlatform.value = platform

  const copied = await copyToClipboard(url)
  if (copied) {
    showToast('链接已复制', 'success')
  } else {
    showToast('复制失败，请手动复制', 'error')
  }
}

/**
 * 校验指定平台配置后直接唤起 CC Switch
 */
const handleDirectImport = (platform: ImportTab) => {
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''

  const built = buildDeeplinkForPlatform(platform)
  if (!built.ok) {
    return
  }

  openCcSwitchDeeplink(built.deeplink, (message) => {
    globalMessage.value = message
  })
}

/**
 * Landing 页：复制字段内容并展示吐司提示
 */
const copyLandingField = async (text: string) => {
  const copied = await copyToClipboard(text)
  showToast(copied ? '复制成功' : '复制失败', copied ? 'success' : 'error')
}

/**
 * Landing 页：解码后的 ccswitch:// 深链唤起 CC Switch
 */
const handleLandingImport = () => {
  globalMessage.value = ''

  if (!landingDeeplink.value) {
    return
  }

  openCcSwitchDeeplink(landingDeeplink.value, (message) => {
    globalMessage.value = message
  })
}
</script>

<template>
  <!-- Landing：有效 deeplink，展示配置摘要与导入按钮 -->
  <div v-if="pageMode === 'landing-valid'" class="landing-page">
    <div class="landing-main">
      <div v-if="landingImportInfo" class="landing-import-info">
      <dl class="landing-info-list">
        <div class="landing-info-row">
          <dt>平台</dt>
          <dd>{{ landingImportInfo.platform }}</dd>
        </div>
        <div class="landing-info-row">
          <dt>Base URL</dt>
          <dd class="landing-info-value">
            <span class="landing-info-mono landing-info-text">{{ landingImportInfo.baseUrl }}</span>
            <button
              type="button"
              class="copy-icon-btn"
              aria-label="复制 Base URL"
              @click="copyLandingField(landingImportInfo.baseUrl)"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                />
              </svg>
            </button>
          </dd>
        </div>
        <div class="landing-info-row">
          <dt>API Key</dt>
          <dd class="landing-info-value">
            <span class="landing-info-mono landing-info-text">{{ landingImportInfo.apiKey }}</span>
            <button
              type="button"
              class="copy-icon-btn"
              aria-label="复制 API Key"
              @click="copyLandingField(landingImportInfo.apiKey)"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                />
              </svg>
            </button>
          </dd>
        </div>
      </dl>
      <p class="landing-import-note">API Key 请勿公开传播</p>
    </div>

    <button
      class="import-btn import-btn-large"
      type="button"
      @click="handleLandingImport"
    >
      一键导入
    </button>

    <div
      v-if="globalMessage"
      class="alert alert-error landing-alert"
    >
      {{ globalMessage }}
    </div>
    </div>

    <footer class="page-footer landing-footer">
      Powered by HAI
    </footer>
  </div>

  <!-- Landing：deeplink 无效 -->
  <div v-else-if="pageMode === 'landing-invalid'" class="landing-page">
    <p class="landing-error">链接无效或已损坏</p>
    <footer class="page-footer landing-footer">
      Powered by HAI
    </footer>
  </div>

  <!-- Generator：配置表单 + 分享/导入结果 -->
  <div v-else class="page">
    <header class="page-header">
      <h1>一键导入 CC Switch</h1>
      <p class="page-header-intro">
        粘贴 Codex 或 Claude Code 配置，在对应标签页内分别完成分享或导入。
      </p>

      <div class="usage-guide">
        <div class="usage-item">
          <h3>生成深度链接 — 分享给他人</h3>
          <p>
            适用：要把配置发给小伙伴，让对方在自己电脑上导入。<br />
            用法：在对应标签页粘贴配置 → 点击「生成深度链接 (平台)」→ 复制链接发送给对方 → 对方打开链接后点击「一键导入」。
          </p>
        </div>
        <div class="usage-item">
          <h3>一键导入 — 本机使用</h3>
          <p>
            适用：就在本机使用、已安装 CC Switch 的用户。<br />
            用法：在对应标签页粘贴配置 → 点击「一键导入 (平台)」→ 直接唤起 CC Switch 完成导入。
          </p>
        </div>
      </div>

      <p class="page-header-note">分享链接内含 API Key，请勿公开传播。</p>
    </header>

    <div class="layout">
      <section class="panel">
        <div class="tab-bar" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            class="tab-btn"
            :class="{ 'is-active': activeTab === tab.id }"
            :aria-selected="activeTab === tab.id"
            @click="switchTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div
          v-if="showMultiPlatformWarning"
          class="platform-warning"
          role="status"
        >
          检测到 Codex 与 Claude Code 均已填写配置，请分别在对应标签页内生成或导入，每次操作仅处理一个平台。
        </div>

        <div v-if="activeTab === 'codex'" class="tab-panel tab-panel-codex">
          <div class="field">
            <label for="config-toml">config.toml</label>
            <textarea
              id="config-toml"
              v-model="configToml"
              class="textarea-codex"
              :class="{ 'is-error': codexErrorsByField.configToml.length > 0 }"
              :placeholder="CONFIG_TOML_PLACEHOLDER"
              spellcheck="false"
            />
            <p
              v-for="error in codexErrorsByField.configToml"
              :key="error.message"
              class="field-error"
            >
              {{ error.message }}
            </p>
          </div>

          <div class="field">
            <label for="auth-json">auth.json</label>
            <textarea
              id="auth-json"
              v-model="authJson"
              class="textarea-codex"
              :class="{ 'is-error': codexErrorsByField.authJson.length > 0 }"
              :placeholder="AUTH_JSON_PLACEHOLDER"
              spellcheck="false"
            />
            <p
              v-for="error in codexErrorsByField.authJson"
              :key="error.message"
              class="field-error"
            >
              {{ error.message }}
            </p>
          </div>

          <div class="tab-actions">
            <button
              class="import-btn"
              type="button"
              @click="handleGenerateLink('codex')"
            >
              生成深度链接 (Codex)
            </button>
            <button
              class="import-btn import-btn-secondary"
              type="button"
              @click="handleDirectImport('codex')"
            >
              一键导入 (Codex)
            </button>
          </div>

          <div
            v-if="shareUrl && shareUrlPlatform === 'codex'"
            class="share-link-block"
          >
            <p class="share-link-label">{{ platformLabels.codex }} 分享链接</p>
            <div class="share-link-row">
              <input
                class="share-link-text"
                type="text"
                readonly
                :value="shareUrl"
              />
              <button
                class="copy-btn"
                type="button"
                @click="copyShareUrl(shareUrl)"
              >
                复制链接
              </button>
            </div>
          </div>

          <div
            v-if="globalMessage"
            class="alert alert-error"
          >
            {{ globalMessage }}
          </div>
        </div>

        <div v-else class="tab-panel">
          <div class="field">
            <label for="claude-settings-json">settings.json</label>
            <p class="field-hint">粘贴 ~/.claude/settings.json 内容（仅支持 JSON 格式）</p>
            <textarea
              id="claude-settings-json"
              v-model="claudeSettingsJson"
              class="textarea-large"
              :class="{ 'is-error': claudeErrors.length > 0 }"
              :placeholder="CLAUDE_SETTINGS_PLACEHOLDER"
              spellcheck="false"
            />
            <p
              v-for="error in claudeErrors"
              :key="error.message"
              class="field-error"
            >
              {{ error.message }}
            </p>
          </div>

          <div class="tab-actions">
            <button
              class="import-btn"
              type="button"
              @click="handleGenerateLink('claude')"
            >
              生成深度链接 (Claude Code)
            </button>
            <button
              class="import-btn import-btn-secondary"
              type="button"
              @click="handleDirectImport('claude')"
            >
              一键导入 (Claude Code)
            </button>
          </div>

          <div
            v-if="shareUrl && shareUrlPlatform === 'claude'"
            class="share-link-block"
          >
            <p class="share-link-label">{{ platformLabels.claude }} 分享链接</p>
            <div class="share-link-row">
              <input
                class="share-link-text"
                type="text"
                readonly
                :value="shareUrl"
              />
              <button
                class="copy-btn"
                type="button"
                @click="copyShareUrl(shareUrl)"
              >
                复制链接
              </button>
            </div>
          </div>

          <div
            v-if="globalMessage"
            class="alert alert-error"
          >
            {{ globalMessage }}
          </div>
        </div>
      </section>
    </div>

    <footer class="page-footer">
      Powered by HAI
    </footer>
  </div>

  <Transition name="toast-fade">
    <div
      v-if="toastMessage"
      class="toast"
      :class="toastType === 'success' ? 'toast-success' : 'toast-error'"
      role="status"
    >
      {{ toastMessage }}
    </div>
  </Transition>
</template>
