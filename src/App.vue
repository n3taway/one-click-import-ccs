<script setup lang="ts">
import { computed, ref } from 'vue'
import { validateAndParseClaudeConfig, type ClaudeConfigValidationError } from './utils/claudeConfigParser'
import {
  extractProviderName,
  validateAndParseCodexConfig,
  type CodexConfigValidationError
} from './utils/codexConfigParser'
import { executeCcsImport } from './utils/executeCcsImport'

type ImportTab = 'codex' | 'claude'

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
 * 切换标签页时清空错误提示，避免跨 Tab 残留状态
 */
const switchTab = (tab: ImportTab) => {
  activeTab.value = tab
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''
}

/**
 * 一键导入 CCS
 * - Codex：校验 config.toml + auth.json，platform=openai
 * - Claude Code：校验 settings.json（仅 JSON），platform=anthropic
 */
const handleImport = () => {
  codexErrors.value = []
  claudeErrors.value = []
  globalMessage.value = ''

  if (activeTab.value === 'codex') {
    const result = validateAndParseCodexConfig(configToml.value, authJson.value)
    if (!result.ok) {
      codexErrors.value = result.errors
      globalMessage.value = '请先修正配置格式后再导入'
      return
    }

    executeCcsImport({
      baseUrl: result.data.baseUrl,
      apiKey: result.data.apiKey,
      platform: 'openai',
      providerName: extractProviderName(result.data.baseUrl),
      onError: (message) => {
        globalMessage.value = message
      }
    })
    return
  }

  const result = validateAndParseClaudeConfig(claudeSettingsJson.value)
  if (!result.ok) {
    claudeErrors.value = result.errors
    globalMessage.value = '请先修正配置格式后再导入'
    return
  }

  executeCcsImport({
    baseUrl: result.data.baseUrl,
    apiKey: result.data.apiKey,
    platform: 'anthropic',
    providerName: extractProviderName(result.data.baseUrl),
    onError: (message) => {
      globalMessage.value = message
    }
  })
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>一键导入 CCS</h1>
      <p>粘贴 Codex 或 Claude Code 配置，校验通过后一键导入到 CC Switch。</p>
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

        <!-- Codex：config.toml + auth.json -->
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

        <!-- Claude Code：仅支持 settings.json -->
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
        <h2>导入到 CC Switch</h2>
        <p>
          请确保本机已安装 CC Switch。当前标签：
          <strong>{{ activeTab === 'codex' ? 'Codex' : 'Claude Code' }}</strong>
        </p>

        <button
          class="import-btn"
          type="button"
          @click="handleImport"
        >
          一键导入
        </button>

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
