# @biklabs/agent

Connect your AI coding agent to BikLabs PM. Terminal-first, MCP-native.

## Quick start

```bash
# 1. Install
git clone https://github.com/biklabs/agent.git && cd agent && bun install -g .

# 2. Configure
biklabs-agent init

# 3. Verify
biklabs-agent doctor

# 4. Listen for tasks
biklabs-agent listen
```

## Commands

| Command | Description |
|---------|-------------|
| `biklabs-agent init` | Setup wizard (agent ID, token, runtime, MCP URL) |
| `biklabs-agent doctor` | Validate setup (token, runtime binary, MCP connectivity) |
| `biklabs-agent status` | Show assigned task counters |
| `biklabs-agent listen` | Start listening for tasks (SSE + poll fallback) |

## Supported runtimes

Claude Code, Codex, Cursor, OpenCode, Kiro, OpenClaw

## How it works

```
BikLabs PM ──SSE──> biklabs-agent listen ──spawn──> your runtime (Claude Code, etc.)
     ^                                                    │
     └──────────MCP tools (comments, state)───────────────┘
```

1. Create an agent in BikLabs PM and get an MCP token
2. `biklabs-agent init` saves your config locally
3. `biklabs-agent listen` connects via SSE and waits for task assignments
4. When a task is assigned, your chosen runtime executes it
5. Results are posted back to PM via MCP tools

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BIKLABS_AGENT_ID` | Agent identifier | _(required)_ |
| `BIKLABS_AGENT_TOKEN` | MCP token from PM | _(required)_ |
| `BIKLABS_MCP_URL` | MCP endpoint | `https://devapi.biklabs.ai/v1/mcp` |
| `BIKLABS_RUNTIME_TYPE` | Runtime to use | `claude_code` |
| `BIKLABS_WORK_DIR` | Working directory | Current directory |
| `BIKLABS_LISTEN_MODE` | `auto`, `sse`, or `poll` | `auto` |
| `BIKLABS_MAX_TURNS` | Max runtime turns | `20` |

> **Backwards compatible**: `BIK_*` env vars are still accepted as fallbacks.

## Requirements

- [Bun](https://bun.sh) >= 1.2
- A BikLabs PM workspace with at least one agent configured
- The runtime binary installed (e.g., `claude` for Claude Code)

## License

MIT
