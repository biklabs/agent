import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";

export type RuntimeType = "claude_code" | "codex" | "cursor" | "opencode" | "kiro" | "openclaw" | "chat";
type PromptMode = "arg" | "stdin";

export interface TaskLike {
  id: string;
  project_id?: string;
  title?: string;
  task_type?: string;
  priority?: string;
}

export interface RuntimeContext {
  runtimeType: RuntimeType;
  mcpUrl: string;
  agentToken: string;
  agentId: string;
  workDir: string;
  maxTurns: number;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function log(msg: string): void {
  process.stdout.write(`[${nowIso()}] ${msg}\n`);
}

export function logErr(msg: string): void {
  process.stderr.write(`[${nowIso()}] ${msg}\n`);
}

export function hasBinary(bin: string): boolean {
  const out = spawnSync("which", [bin], { stdio: "pipe" });
  return out.status === 0;
}

function parseMcpTextPayload(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: trimmed };
  }
}

export async function mcpCall(
  mcpUrl: string,
  agentToken: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    ...(params ? { params } : {}),
  });

  const res = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${agentToken}`,
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MCP ${method} failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data?.error) {
    throw new Error(`MCP ${method} error: ${JSON.stringify(data.error)}`);
  }

  const result = data?.result;
  const content = result?.content;
  if (Array.isArray(content) && content.length > 0 && typeof content[0]?.text === "string") {
    return parseMcpTextPayload(content[0].text);
  }
  return result ?? {};
}

export async function mcpToolCall(
  mcpUrl: string,
  agentToken: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return mcpCall(mcpUrl, agentToken, "tools/call", {
    name: toolName,
    arguments: args,
  });
}

export function createRuntimeWorkdir(ctx: RuntimeContext, taskId: string): {
  workdir: string;
  mcpConfigPath: string;
  claudeMdPath: string;
} {
  const workdir = mkdtempSync(join(tmpdir(), `bik-agent-${ctx.agentId}-${taskId}-`));
  const mcpConfigPath = join(workdir, "mcp.json");
  const claudeMdPath = join(workdir, "CLAUDE.md");

  const mcpConfig = {
    mcpServers: {
      "bik-pm": {
        type: "sse",
        url: ctx.mcpUrl,
        headers: { Authorization: `Bearer ${ctx.agentToken}` },
      },
    },
  };
  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), { mode: 0o600 });

  writeFileSync(
    claudeMdPath,
    `# BIK Agent Session\n\nAgent ID: ${ctx.agentId}\nRuntime: ${ctx.runtimeType}\n`,
    { mode: 0o600 },
  );

  return { workdir, mcpConfigPath, claudeMdPath };
}

export function cleanupWorkdir(workdir: string): void {
  try {
    rmSync(workdir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

export function spawnRuntime(ctx: RuntimeContext, prompt: string, workdir: string, mcpConfigPath: string, claudeMdPath: string) {
  const claudeBin = process.env.CLAUDE_BIN ?? "claude";
  const codexBin = process.env.CODEX_BIN ?? "codex";
  const cursorBin = process.env.CURSOR_BIN ?? "cursor-agent";
  const sandbox = process.env.CODEX_SANDBOX_MODE ?? "workspace-write";

  if (ctx.runtimeType === "claude_code") {
    return spawn(claudeBin, ["--mcp-config", mcpConfigPath, "-p", prompt, "--max-turns", String(ctx.maxTurns)], {
      cwd: workdir,
      env: { ...process.env, CLAUDE_MD: claudeMdPath, BIK_PM_MCP_TOKEN: ctx.agentToken },
      stdio: "inherit",
    });
  }

  if (ctx.runtimeType === "codex") {
    return spawn(
      codexBin,
      [
        "exec",
        "--cd",
        workdir,
        "--skip-git-repo-check",
        "--sandbox",
        sandbox,
        "-c",
        `mcp_servers.bik_pm.url="${ctx.mcpUrl}"`,
        "-c",
        "mcp_servers.bik_pm.bearer_token_env_var=\"BIK_PM_MCP_TOKEN\"",
        prompt,
      ],
      {
        cwd: workdir,
        env: { ...process.env, BIK_PM_MCP_TOKEN: ctx.agentToken },
        stdio: "inherit",
      },
    );
  }

  const defaultGenericCommandByRuntime: Partial<Record<RuntimeType, string>> = {
    cursor: cursorBin,
    opencode: "opencode",
    kiro: "kiro",
    openclaw: "openclaw",
    chat: "chat-runtime",
  };

  const cmd = process.env.AGENT_RUNTIME_COMMAND ?? defaultGenericCommandByRuntime[ctx.runtimeType];
  if (!cmd) {
    throw new Error(
      `Runtime ${ctx.runtimeType} requires AGENT_RUNTIME_COMMAND + AGENT_RUNTIME_ARGS`,
    );
  }

  const genericPromptMode: PromptMode =
    process.env.AGENT_RUNTIME_PROMPT_MODE === "stdin" ? "stdin" : "arg";

  const fromJson = process.env.AGENT_RUNTIME_ARGS_JSON;
  let argTemplates: string[] | null = null;
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
        argTemplates = parsed;
      } else {
        throw new Error("must be a string[]");
      }
    } catch (err) {
      throw new Error(`Invalid AGENT_RUNTIME_ARGS_JSON: ${String(err)}`);
    }
  }

  if (!argTemplates) {
    argTemplates = (process.env.AGENT_RUNTIME_ARGS ?? "{PROMPT}")
      .split(" ")
      .filter(Boolean);
  }

  const args = argTemplates.map((x) =>
    x
      .replaceAll("{PROMPT}", prompt)
      .replaceAll("{WORKDIR}", workdir)
      .replaceAll("{MCP_URL}", ctx.mcpUrl)
      .replaceAll("{MCP_CONFIG}", mcpConfigPath)
      .replaceAll("{CLAUDE_MD}", claudeMdPath),
  );

  if (genericPromptMode === "arg" && !args.includes(prompt)) {
    args.push(prompt);
  }

  const child = spawn(cmd, args, {
    cwd: workdir,
    env: { ...process.env, BIK_PM_MCP_TOKEN: ctx.agentToken, BIK_PM_MCP_URL: ctx.mcpUrl },
    stdio: genericPromptMode === "stdin" ? ["pipe", "inherit", "inherit"] : "inherit",
  });

  if (genericPromptMode === "stdin" && child.stdin) {
    child.stdin.write(prompt);
    child.stdin.end();
  }

  return child;
}

export async function terminateChildProcess(
  child: ChildProcess,
  gracefulMs = 4000,
): Promise<void> {
  if (!child.pid) return;
  if (child.exitCode !== null || child.killed) return;

  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }

  const exited = await new Promise<boolean>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, gracefulMs);
    child.once("exit", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(true);
    });
    child.once("close", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(true);
    });
  });

  if (exited) return;
  try {
    child.kill("SIGKILL");
  } catch {
    // ignore
  }
}

export function buildTaskPrompt(task: TaskLike, detail: Record<string, unknown>): string {
  const description =
    (typeof detail.description_text === "string" && detail.description_text) ||
    (typeof detail.descriptionText === "string" && detail.descriptionText) ||
    "(no description)";

  const projectId = typeof task.project_id === "string" ? task.project_id : "unknown";
  const taskType = typeof task.task_type === "string" ? task.task_type : "unknown";
  const priority = typeof task.priority === "string" ? task.priority : "NONE";
  const title = task.title ?? "Untitled";

  return [
    "You are a BIK Platform AI agent executing an assigned task.",
    "",
    `TASK: ${title}`,
    `TASK ID: ${task.id}`,
    `PROJECT ID: ${projectId}`,
    `TASK TYPE: ${taskType}`,
    `PRIORITY: ${priority}`,
    `DESCRIPTION: ${description}`,
    "",
    "You have access to bik-pm MCP tools.",
    "Instructions:",
    "1) Read any missing context from the task/project with MCP tools.",
    "2) Execute the work in this local repository/workdir.",
    "3) Post progress and final summary back to the task via comments.",
    "4) Move task state to In Review when done.",
  ].join("\n");
}

export function isValidAgentId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
}
