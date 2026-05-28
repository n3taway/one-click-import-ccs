# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # type-check (vue-tsc) then bundle to dist/
npm run preview   # serve the dist/ build locally
```

There are no tests.

## Architecture

This is a single-page Vue 3 + Vite app that lets users import AI provider credentials into **CC Switch** (a local desktop client) via the `ccswitch://` custom URL protocol.

### Two page modes

`App.vue` checks for a `?deeplink=` query param on mount and switches between:

- **Generator** (`pageMode === 'generator'`) — a tabbed form where users paste Codex (`config.toml` + `auth.json`) or Claude Code (`settings.json`) credentials, then either generate a shareable URL or trigger a direct local import.
- **Landing** (`pageMode === 'landing-valid'`) — shown when the page is opened via a share link; decodes the deeplink from the URL, displays a summary card, and offers a one-click import button.

### Deeplink flow

```
user input
  → validateAndParseCodexConfig / validateAndParseClaudeConfig   (parse + validate)
  → buildCcsImportDeeplink (executeCcsImport.ts)                 (wrap into ExecuteCcsImportOptions)
  → buildCcSwitchImportDeeplink (ccswitchImport.ts)              (build ccswitch://v1/import?... URL)
  → openCcSwitchDeeplink                                         (window.open to trigger protocol handler)
```

For sharing, the `ccswitch://` deeplink is base64-encoded and appended as `?deeplink=` to the current origin (`shareDeeplink.ts`).

### Key utility files

- `ccswitchImport.ts` — maps `GroupPlatform` → CC Switch app name / endpoint, builds the final `ccswitch://` URL.
- `executeCcsImport.ts` — orchestrates build + open; includes the default usage-query script embedded in the deeplink.
- `claudeConfigParser.ts` / `codexConfigParser.ts` — validate their respective config formats and extract `baseUrl` + `apiKey`. Both cross-check for the other format's markers to catch paste mistakes.
- `importConfigUtils.ts` — shared helpers: URL validation, provider name extraction from hostname, format-detection regexes.
- `shareDeeplink.ts` — encode/decode deeplinks for URL sharing; parse a deeplink back into a display summary.
- `types.ts` — `GroupPlatform` and `CcSwitchClientType` union types used across utilities.


## 文件职责索引
- `./FILETREE.md` —— 各文件职责索引。鸟瞰仓库 / 定位实现前先读，可代替 `ls` 与 `grep`。