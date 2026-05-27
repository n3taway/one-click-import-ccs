<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { validateAndParseClaudeConfig, type ClaudeConfigValidationError } from './utils/claudeConfigParser'
import {
  extractProviderName,
  validateAndParseCodexConfig,
  type CodexConfigValidationError
} from './utils/codexConfigParser'
import { buildCcsImportDeeplink, openCcSwitchDeeplink } from './utils/executeCcsImport'
import { buildShareUrl, getDeeplinkFromSearch, hasDeeplinkParam } from './utils/shareDeeplink'

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
const copyHint = ref('')
const pageMode = ref<PageMode>('generator')
const landingDeeplink = ref<string | null>(null)

const tabs: { id: ImportTab; label: string }[] = [
  { id: 'codex', label: 'Codex' },
  { id: 'claude', label: 'Claude Code' }
]

/** Codex 字段级校验错误 */
const codexErrorsByField = computed(() => ({
  configToml: codexErrors.value.filter((item) => item.field === 'configToml'),
  authJson: codexErrors.value.filter((item) => item.field === 'authJson')
}))

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
  copyHint.value = ''
}

/**
 * 写入剪贴板并展示复制反馈
 */
const copyShareUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    copyHint.value = '已复制'
    setTimeout(() => {
      copyHint.value = ''
    }, 2000)
  } catch {
    copyHint.value = '复制失败，请手动复制'
  }
}

/**
 * 校验配置并构建 ccswitch:// 深链
 */
const buildDeeplinkFromForm = (): { ok: true; deeplink: string } | { ok: false } => {
  if (activeTab.value === 'codex') {
    const result = validateAndParseCodexConfig(configToml.value, authJson.value)
    if (!result.ok) {
      codexErrors.value = result.errors
      globalMessage.value = '请先修正配置格式后再生成链接'
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
    globalMessage.value = '请先修正配置格式后再生成链接'
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
 * 生成带 deeplink 参数的分享 URL，并默认写入剪贴板
 */
const handleGenerateLink = async () => {
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''
  shareUrl.value = ''
  copyHint.value = ''

  const built = buildDeeplinkFromForm()
  if (!built.ok) {
    return
  }

  const url = buildShareUrl(built.deeplink)
  shareUrl.value = url
  await copyShareUrl(url)
}

/**
 * Generator 页：校验配置后直接唤起 CC Switch，无需生成分享链接
 */
const handleDirectImport = () => {
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''

  const built = buildDeeplinkFromForm()
  if (!built.ok) {
    return
  }

  openCcSwitchDeeplink(built.deeplink, (message) => {
    globalMessage.value = message
  })
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
  <!-- Landing：有效 deeplink，仅展示居中导入按钮 -->
  <div v-if="pageMode === 'landing-valid'" class="landing-page">
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

  <!-- Generator：配置表单 + 生成分享链接 -->
  <div v-else class="page">
    <header class="page-header">
      <h1>一键导入 CCS</h1>
      <p class="page-header-intro">
        粘贴 Codex 或 Claude Code 配置，选择下方任一方式完成导入。
      </p>

      <div class="usage-guide">
        <div class="usage-item">
          <h3>生成深度链接 — 分享给他人</h3>
          <p>
            适用：要把配置发给小伙伴，让对方在自己电脑上导入。<br />
            用法：粘贴配置 → 点击「生成深度链接」→ 复制链接发送给对方 → 对方打开链接后点击「一键导入」。
          </p>
        </div>
        <div class="usage-item">
          <h3>一键导入 — 本机使用</h3>
          <p>
            适用：就在本机使用、已安装 CC Switch 的用户。<br />
            用法：粘贴配置 → 点击「一键导入」→ 直接唤起 CC Switch 完成导入。
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

        <div v-if="activeTab === 'codex'" class="tab-panel">
          <div class="field">
            <label for="config-toml">config.toml</label>
            <textarea
              id="config-toml"
              v-model="configToml"
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
        </div>
      </section>

      <aside class="panel action-panel">
        <h2>生成分享链接</h2>
        <p>
          当前标签：
          <strong>{{ activeTab === 'codex' ? 'Codex' : 'Claude Code' }}</strong>
        </p>

        <button
          class="import-btn"
          type="button"
          @click="handleGenerateLink"
        >
          生成深度链接
        </button>

        <button
          class="import-btn import-btn-secondary"
          type="button"
          @click="handleDirectImport"
        >
          一键导入
        </button>

        <div v-if="shareUrl" class="share-link-block">
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
          <p v-if="copyHint" class="copy-hint">{{ copyHint }}</p>
        </div>

        <div
          v-if="globalMessage"
          class="alert alert-error"
        >
          {{ globalMessage }}
        </div>
      </aside>
    </div>

    <footer class="page-footer">
      Powered by HAI
    </footer>
  </div>
</template>
