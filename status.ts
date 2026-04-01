#!/usr/bin/env bun
/**
 * biklabs-agent status
 *
 * Shows current task counters for the agent through MCP tools.
 */

import { log, logErr, mcpToolCall, type TaskLike } from "./mcp-runtime";

const AGENT_ID = process.env.BIKLABS_AGENT_ID ?? process.env.BIK_AGENT_ID ?? process.env.AGENT_ID ?? "";
const AGENT_TOKEN = process.env.BIKLABS_AGENT_TOKEN ?? process.env.BIK_AGENT_TOKEN ?? process.env.AGENT_MCP_TOKEN ?? "";
const MCP_URL = process.env.BIKLABS_MCP_URL ?? process.env.BIK_MCP_URL ?? process.env.MCP_SERVER_URL ?? "https://devapi.biklabs.ai/v1/mcp";

interface TaskListResponse {
  tasks?: TaskLike[];
}

async function listTasks(status?: string): Promise<TaskLike[]> {
  const args = status ? { status } : {};
  const out = (await mcpToolCall(MCP_URL, AGENT_TOKEN, "list_my_tasks", args)) as TaskListResponse;
  return Array.isArray(out?.tasks) ? out.tasks : [];
}

function printTasks(label: string, tasks: TaskLike[]): void {
  log(`${label}: ${tasks.length}`);
  for (const task of tasks.slice(0, 10)) {
    const title = task.title ?? "untitled";
    log(`  - ${task.id} | ${title}`);
  }
}

export async function main(): Promise<void> {
  if (!AGENT_ID || !AGENT_TOKEN) {
    logErr("BIKLABS_AGENT_ID and BIKLABS_AGENT_TOKEN/AGENT_MCP_TOKEN are required");
    process.exit(1);
  }

  log(`Agent status for ${AGENT_ID}`);

  const [all, started, inReview] = await Promise.all([
    listTasks(undefined).catch(() => []),
    listTasks("STARTED").catch(() => []),
    listTasks("IN_REVIEW").catch(() => []),
  ]);

  printTasks("All assigned tasks", all);
  printTasks("STARTED", started);
  printTasks("IN_REVIEW", inReview);
}

if (import.meta.main) {
  await main();
}
