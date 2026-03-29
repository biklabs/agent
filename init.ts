#!/usr/bin/env bun
/**
 * bik-agent init
 *
 * Minimal wizard to persist local listener config + mcp.json
 * without requiring PM frontend repo clone for end-users.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import type { RuntimeType } from "./mcp-runtime";

interface AgentLocalConfig {
  agentId: string;
  runtimeType: RuntimeType;
  mcpUrl: string;
  workDir: string;
  createdAt: string;
}

const DEFAULT_MCP_URL = process.env.BIK_MCP_URL ?? process.env.MCP_SERVER_URL ?? "https://devapi.biklabs.ai/v1/mcp";
const DEFAULT_CONFIG_DIR = process.env.BIK_AGENT_CONFIG_DIR ?? join(homedir(), ".biklabs-agent");
const DEFAULT_WORK_DIR = process.cwd();

function parseRuntime(input: string): RuntimeType {
  if (input === "claude_code" || input === "codex" || input === "cursor" || input === "opencode" || input === "kiro" || input === "openclaw" || input === "chat") {
    return input;
  }
  return "claude_code";
}

export async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const agentIdRaw = await rl.question("Agent ID (e.g. writer-agent): ");
    const runtimeRaw = await rl.question("Runtime [claude_code|codex|cursor|opencode|kiro|openclaw|chat] (default claude_code): ");
    const token = await rl.question("Agent MCP token: ");
    const mcpUrlRaw = await rl.question(`MCP URL (default ${DEFAULT_MCP_URL}): `);
    const workDirRaw = await rl.question(`Work dir (default ${DEFAULT_WORK_DIR}): `);

    const agentId = agentIdRaw.trim();
    if (!agentId) throw new Error("Agent ID is required");
    if (!token.trim()) throw new Error("Agent token is required");

    const runtimeType = parseRuntime(runtimeRaw.trim());
    const mcpUrl = mcpUrlRaw.trim() || DEFAULT_MCP_URL;
    const workDir = workDirRaw.trim() || DEFAULT_WORK_DIR;

    mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });

    const localConfig: AgentLocalConfig = {
      agentId,
      runtimeType,
      mcpUrl,
      workDir,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(join(DEFAULT_CONFIG_DIR, "config.json"), JSON.stringify(localConfig, null, 2), {
      mode: 0o600,
    });

    const mcpConfig = {
      mcpServers: {
        "bik-pm": {
          type: "sse",
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${token.trim()}`,
          },
        },
      },
    };
    writeFileSync(join(DEFAULT_CONFIG_DIR, "mcp.json"), JSON.stringify(mcpConfig, null, 2), {
      mode: 0o600,
    });

    process.stdout.write(`\nSaved config in ${DEFAULT_CONFIG_DIR}\n`);
    process.stdout.write("\nExport these env vars for listen/status/doctor:\n");
    process.stdout.write(`export BIK_AGENT_ID="${agentId}"\n`);
    process.stdout.write(`export BIK_AGENT_TOKEN="${token.trim()}"\n`);
    process.stdout.write(`export BIK_MCP_URL="${mcpUrl}"\n`);
    process.stdout.write(`export BIK_RUNTIME_TYPE="${runtimeType}"\n`);
    process.stdout.write(`export BIK_WORK_DIR="${workDir}"\n`);
  } finally {
    rl.close();
  }
}

if (import.meta.main) {
  await main();
}
