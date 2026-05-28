# Project Filetree

_Auto-maintained by `/filetree:update`. Each entry carries a content hash; mismatched hashes indicate stale summaries._

## (root)/

- `.gitignore` — Excludes node_modules, dist, local env files, macOS metadata, and TypeScript build info from version control. <!--hash:efd9fc48-->
- `index.html` — HTML entry point for the Vue app; sets Chinese locale and mounts the root app div. <!--hash:14078189-->
- `package.json` — Project manifest for the Vue 3 + Vite SPA; defines dev/build/preview scripts and dependencies. <!--hash:3f64e250-->
- `tsconfig.app.json` — TypeScript config for the Vue app source; targets ES2020 with strict mode and bundler module resolution. <!--hash:af40b2d6-->
- `tsconfig.json` — Root TypeScript project references config; delegates to tsconfig.app.json and tsconfig.node.json. <!--hash:1ffef600-->
- `tsconfig.node.json` — TypeScript config for Vite config files; targets ES2022 with strict mode. <!--hash:f807947f-->
- `vercel.json` — Vercel deployment config; specifies Vite framework, build command, and output directory. <!--hash:0654b16c-->
- `vite.config.ts` — Vite build config; registers the Vue plugin and sets dist as the output directory. <!--hash:263f9f83-->

## src/

- `App.vue` — Root Vue component; implements the generator form (Codex/Claude Code tabs) and landing page for ccswitch:// deeplink imports. <!--hash:86fac25a-->
- `main.ts` — App entry point; creates and mounts the Vue application with global styles. <!--hash:97128bac-->
- `vite-env.d.ts` — Vite client type reference and Vue SFC module declaration for TypeScript. <!--hash:65c7311d-->

## src/styles/

- `main.css` — Global CSS for the app; defines layout, panel, tab, form field, button, toast, and landing page styles. <!--hash:453d54e1-->

## src/utils/

- `ccswitchImport.ts` — Resolves CC Switch import target app/endpoint by platform and builds ccswitch:// provider import deeplinks. <!--hash:c4d6dea2-->
- `claudeConfigParser.ts` — Validates and parses Claude Code settings.json, extracting ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN for import. <!--hash:74e6e517-->
- `codexConfigParser.ts` — Validates and parses Codex config.toml and auth.json, extracting base_url and OPENAI_API_KEY for import. <!--hash:f0ff5566-->
- `executeCcsImport.ts` — Builds ccswitch:// deeplinks and triggers the local CC Switch protocol handler to import a provider. <!--hash:075a671e-->
- `importConfigUtils.ts` — Shared helpers: URL validation, provider name extraction, and Codex/Claude config format detection markers. <!--hash:5f81a8a7-->
- `shareDeeplink.ts` — Encodes/decodes ccswitch:// deeplinks as base64 URL params and parses them into platform/baseUrl/apiKey summaries. <!--hash:cf46c06f-->
- `types.ts` — Shared TypeScript types: GroupPlatform and CcSwitchClientType enums used across import utilities. <!--hash:62ccfba7-->
