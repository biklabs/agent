#!/usr/bin/env bun
/**
 * bik-agent doctor
 *
 * Quick health checks for local terminal-first setup.
 */

import { hasBinary, log, logErr, mcpCall, mcpToolCall, type RuntimeType } from "./mcp-runtime";

const AGENT_ID = process.env.BIK_AGENT_ID ?? process.env.AGENT_ID ?? "";
const AGENT_TOKEN = process.env.BIK_AGENT_TOKEN ?? process.env.AGENT_MCP_TOKEN ?? "";
const MCP_URL = process.env.BIK_MCP_URL ?? process.env.MCP_SERVER_URL ?? "https://devapi.biklabs.ai/v1/mcp";
const RUNTIME = (process.env.BIK_RUNTIME_TYPE ?? "claude_code") as RuntimeType;

const RUNTIME_BIN: Record<RuntimeType, string> = {
  claude_code: process.env.CLAUDE_BIN ?? "claude",
  codex: process.env.CODEX_BIN ?? "codex",
  cursor: process.env.CURSOR_BIN ?? "cursor-agent",
  opencode: process.env.AGENT_RUNTIME_COMMAND ?? "opencode",
  kiro: process.env.AGENT_RUNTIME_COMMAND ?? "kiro",
  openclaw: process.env.AGENT_RUNTIME_COMMAND ?? "openclaw",
  chat: process.env.AGENT_RUNTIME_COMMAND ?? "chat-runtime",
};

function ok(label: string, value: string): void {
  log(`✅ ${label}: ${value}`);
}

function fail(label: string, value: string): void {
  logErr(`❌ ${label}: ${value}`);
}

async function checkMcpSse(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(MCP_URL, {
      method: "GET",
      headers: {
        authorization: `Bearer ${AGENT_TOKEN}`,
        accept: "text/event-stream",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      fail("MCP SSE", `HTTP ${res.status}`);
      return false;
    }
    ok("MCP SSE", "reachable");
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }
    return true;
  } catch (err) {
    fail("MCP SSE", String(err));
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function main(): Promise<void> {
  let errors = 0;
  log("Running bik-agent doctor...");

  if (!AGENT_ID) {
    fail("Agent ID", "missing BIK_AGENT_ID/AGENT_ID");
    errors += 1;
  } else {
    ok("Agent ID", AGENT_ID);
  }

  if (!AGENT_TOKEN) {
    fail("Agent token", "missing BIK_AGENT_TOKEN/AGENT_MCP_TOKEN");
    errors += 1;
  } else {
    ok("Agent token", `${AGENT_TOKEN.slice(0, 8)}...`);
  }

  const runtimeBin = RUNTIME_BIN[RUNTIME];
  if (!hasBinary(runtimeBin)) {
    fail("Runtime binary", `${runtimeBin} not found in PATH`);
    errors += 1;
  } else {
    ok("Runtime binary", runtimeBin);
  }

  if (AGENT_TOKEN) {
    try {
      await mcpCall(MCP_URL, AGENT_TOKEN, "tools/list");
      ok("MCP JSON-RPC", "tools/list OK");
    } catch (err) {
      fail("MCP JSON-RPC", String(err));
      errors += 1;
    }

    try {
      await mcpToolCall(MCP_URL, AGENT_TOKEN, "list_my_tasks", { status: "STARTED" });
      ok("MCP tool call", "list_my_tasks OK");
    } catch (err) {
      fail("MCP tool call", String(err));
      errors += 1;
    }

    const sseOk = await checkMcpSse();
    if (!sseOk) errors += 1;
  }

  if (errors === 0) {
    log("Doctor result: PASS");
    return;
  }
  logErr(`Doctor result: FAIL (${errors} issue${errors > 1 ? "s" : ""})`);
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
