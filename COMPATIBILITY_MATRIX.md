# Runtime Compatibility Matrix

This matrix defines support level in `@biklabs/agent-runner` and how to validate each runtime.

> Verify locally with: `bun run scripts/agent-runner/smoke-matrix.ts`

| Runtime | Support level | Adapter | Default command | Prompt mode | Notes |
|---|---|---|---|---|---|
| `claude_code` | First-class | Native | `claude` (`CLAUDE_BIN`) | `arg` | Strongest local terminal path for Claude subscribers |
| `codex` | First-class | Native | `codex` (`CODEX_BIN`) | `arg` | Native Codex MCP command integration |
| `cursor` | Preset | Generic | `cursor-agent` (`CURSOR_BIN`) | `arg` | Runtime preset included; adjust args per local Cursor build |
| `opencode` | Preset | Generic | `opencode` | `arg` | Preset included; override args/env if needed |
| `kiro` | Preset | Generic | `kiro` | `stdin` | Preset included; stdin-first profile |
| `openclaw` | Preset | Generic | `openclaw` | `stdin` | Preset included for Mission Control + OpenClaw flow |
| `chat` | Preset | Generic | `chat-runtime` | `stdin` | Telegram/WhatsApp bridge worker style |
| any other CLI | Compatible | Generic | custom `runtimeCommand` | `arg` or `stdin` | Use placeholders and runtime-specific env overrides |

## Smoke test policy

Use strict mode in CI to enforce binary availability for selected runtimes:

```bash
SMOKE_STRICT=1 SMOKE_RUNTIME_TYPES="claude_code,codex,cursor,openclaw" \
  bun run scripts/agent-runner/smoke-matrix.ts
```

## Preset catalog

Machine-readable presets:

```bash
bun run scripts/agent-runner/runtime-presets.ts
```
