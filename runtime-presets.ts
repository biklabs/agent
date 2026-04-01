#!/usr/bin/env bun

import type { RuntimeType } from "./mcp-runtime";

export type RuntimePromptMode = "arg" | "stdin";

export interface RuntimePreset {
  runtimeType: RuntimeType;
  displayName: string;
  adapter: "builtin" | "generic";
  defaultCommand: string;
  defaultArgs: string[];
  defaultPromptMode: RuntimePromptMode;
  commandEnv?: string;
  requiredEnv: string[];
  optionalEnv: string[];
  smokeVersionArgs: string[];
  smokeHelpArgs: string[];
  notes: string;
}

const DEFAULT_COMMANDS: Record<RuntimeType, string> = {
  claude_code: process.env.CLAUDE_BIN ?? "claude",
  codex: process.env.CODEX_BIN ?? "codex",
  cursor: process.env.CURSOR_BIN ?? "cursor-agent",
  opencode: process.env.AGENT_RUNTIME_COMMAND ?? "opencode",
  kiro: process.env.AGENT_RUNTIME_COMMAND ?? "kiro",
  openclaw: process.env.AGENT_RUNTIME_COMMAND ?? "openclaw",
  chat: process.env.AGENT_RUNTIME_COMMAND ?? "chat-runtime",
};

const PRESETS: Record<RuntimeType, RuntimePreset> = {
  claude_code: {
    runtimeType: "claude_code",
    displayName: "Claude Code",
    adapter: "builtin",
    defaultCommand: DEFAULT_COMMANDS.claude_code,
    defaultArgs: ["--mcp-config", "{MCP_CONFIG}", "-p", "{PROMPT}", "--max-turns", "20"],
    defaultPromptMode: "arg",
    commandEnv: "CLAUDE_BIN",
    requiredEnv: [],
    optionalEnv: ["CLAUDE_BIN", "BIKLABS_PM_MCP_TOKEN", "BIKLABS_PM_MCP_URL"],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Native adapter with MCP config file support.",
  },
  codex: {
    runtimeType: "codex",
    displayName: "Codex",
    adapter: "builtin",
    defaultCommand: DEFAULT_COMMANDS.codex,
    defaultArgs: [
      "exec",
      "--cd",
      "{WORKDIR}",
      "--skip-git-repo-check",
      "--sandbox",
      "workspace-write",
      "-c",
      "mcp_servers.bik_pm.url=\"{MCP_URL}\"",
      "-c",
      "mcp_servers.bik_pm.bearer_token_env_var=\"BIKLABS_PM_MCP_TOKEN\"",
      "{PROMPT}",
    ],
    defaultPromptMode: "arg",
    commandEnv: "CODEX_BIN",
    requiredEnv: [],
    optionalEnv: [
      "CODEX_BIN",
      "CODEX_SANDBOX_MODE",
      "CODEX_MODEL",
      "CODEX_MCP_SERVER_NAME",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Native adapter using Codex MCP runtime flags.",
  },
  cursor: {
    runtimeType: "cursor",
    displayName: "Cursor Agent CLI",
    adapter: "generic",
    defaultCommand: DEFAULT_COMMANDS.cursor,
    defaultArgs: ["run", "--cwd", "{WORKDIR}", "--mcp-config", "{MCP_CONFIG}", "{PROMPT}"],
    defaultPromptMode: "arg",
    commandEnv: "CURSOR_BIN",
    requiredEnv: [],
    optionalEnv: [
      "CURSOR_BIN",
      "AGENT_RUNTIME_ARGS_JSON",
      "AGENT_RUNTIME_PROMPT_MODE",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Generic adapter preset. Override runtimeArgs/runtimePromptMode per installed version.",
  },
  opencode: {
    runtimeType: "opencode",
    displayName: "OpenCode",
    adapter: "generic",
    defaultCommand: DEFAULT_COMMANDS.opencode,
    defaultArgs: ["run", "--cwd", "{WORKDIR}", "--mcp-config", "{MCP_CONFIG}", "{PROMPT}"],
    defaultPromptMode: "arg",
    commandEnv: "AGENT_RUNTIME_COMMAND",
    requiredEnv: [],
    optionalEnv: [
      "AGENT_RUNTIME_COMMAND",
      "AGENT_RUNTIME_ARGS_JSON",
      "AGENT_RUNTIME_PROMPT_MODE",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Generic adapter preset. Use runtimeArgs from the target OpenCode version.",
  },
  kiro: {
    runtimeType: "kiro",
    displayName: "Kiro",
    adapter: "generic",
    defaultCommand: DEFAULT_COMMANDS.kiro,
    defaultArgs: ["run", "--cwd", "{WORKDIR}", "--mcp", "{MCP_URL}"],
    defaultPromptMode: "stdin",
    commandEnv: "AGENT_RUNTIME_COMMAND",
    requiredEnv: [],
    optionalEnv: [
      "AGENT_RUNTIME_COMMAND",
      "AGENT_RUNTIME_ARGS_JSON",
      "AGENT_RUNTIME_PROMPT_MODE",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Generic adapter preset. Most Kiro setups are stdin-first; verify local flags.",
  },
  openclaw: {
    runtimeType: "openclaw",
    displayName: "OpenClaw",
    adapter: "generic",
    defaultCommand: DEFAULT_COMMANDS.openclaw,
    defaultArgs: ["run", "--cwd", "{WORKDIR}", "--mcp-config", "{MCP_CONFIG}"],
    defaultPromptMode: "stdin",
    commandEnv: "AGENT_RUNTIME_COMMAND",
    requiredEnv: [],
    optionalEnv: [
      "AGENT_RUNTIME_COMMAND",
      "AGENT_RUNTIME_ARGS_JSON",
      "AGENT_RUNTIME_PROMPT_MODE",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Generic adapter preset for OpenClaw terminal execution.",
  },
  chat: {
    runtimeType: "chat",
    displayName: "Chat Bridge Runtime",
    adapter: "generic",
    defaultCommand: DEFAULT_COMMANDS.chat,
    defaultArgs: ["{PROMPT}"],
    defaultPromptMode: "stdin",
    commandEnv: "AGENT_RUNTIME_COMMAND",
    requiredEnv: [],
    optionalEnv: [
      "AGENT_RUNTIME_COMMAND",
      "AGENT_RUNTIME_ARGS_JSON",
      "AGENT_RUNTIME_PROMPT_MODE",
      "BIKLABS_PM_MCP_TOKEN",
      "BIKLABS_PM_MCP_URL",
    ],
    smokeVersionArgs: ["--version"],
    smokeHelpArgs: ["--help"],
    notes: "Generic adapter preset for Telegram/WhatsApp bridge workers.",
  },
};

export function getRuntimePreset(runtimeType: RuntimeType): RuntimePreset {
  return PRESETS[runtimeType];
}

export function listRuntimePresets(): RuntimePreset[] {
  return (Object.keys(PRESETS) as RuntimeType[]).map((runtimeType) => PRESETS[runtimeType]);
}

export async function main(): Promise<void> {
  const presets = listRuntimePresets();
  process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), presets }, null, 2)}\n`);
}

if (import.meta.main) {
  await main();
}
