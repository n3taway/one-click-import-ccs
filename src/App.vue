<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  extractProviderName,
  validateAndParseCodexConfig,
  type CodexConfigValidationError
} from './utils/codexConfigParser'
import { executeCcsImport } from './utils/executeCcsImport'

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

const configToml = ref('')
const authJson = ref('')
const validationErrors = ref<CodexConfigValidationError[]>([])
const globalMessage = ref('')

/** 按字段聚合校验错误，便于在对应输入框下方展示 */
const errorsByField = computed(() => ({
  configToml: validationErrors.value.filter((item) => item.field === 'configToml'),
  authJson: validationErrors.value.filter((item) => item.field === 'authJson')
}))

/**
 * 一键导入 CCS
 * - 先校验 config.toml 与 auth.json 格式
 * - 校验通过后以 openai/codex 配置唤起 CC Switch 深链
 */
const handleImport = () => {
  validationErrors.value = []
  globalMessage.value = ''

  const result = validateAndParseCodexConfig(configToml.value, authJson.value)
  if (!result.ok) {
    validationErrors.value = result.errors
    globalMessage.value = '请先修正配置格式后再导入'
    return
  }

  const providerName = extractProviderName(result.data.baseUrl)

  executeCcsImport({
    baseUrl: result.data.baseUrl,
    apiKey: result.data.apiKey,
    platform: 'openai',
    providerName,
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
      <p>粘贴配置信息，校验通过后一键导入到 CC Switch。</p>
    </header>

    <div class="layout">
      <section class="panel">
        <h2 class="panel-title">配置内容</h2>

        <div class="field">
          <label for="config-toml">config.toml</label>
          <textarea
            id="config-toml"
            v-model="configToml"
            :class="{ 'is-error': errorsByField.configToml.length > 0 }"
            :placeholder="CONFIG_TOML_PLACEHOLDER"
            spellcheck="false"
          />
          <p
            v-for="error in errorsByField.configToml"
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
            :class="{ 'is-error': errorsByField.authJson.length > 0 }"
            :placeholder="AUTH_JSON_PLACEHOLDER"
            spellcheck="false"
          />
          <p
            v-for="error in errorsByField.authJson"
            :key="error.message"
            class="field-error"
          >
            {{ error.message }}
          </p>
        </div>
      </section>

      <aside class="panel action-panel">
        <h2>导入到 CC Switch</h2>
        <p>
          请确保本机已安装 CC Switch
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
