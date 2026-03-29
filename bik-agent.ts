#!/usr/bin/env bun

/**
 * bik-agent
 *
 * Unified CLI entrypoint for terminal-first MCP flow.
 */

function usage(): void {
  process.stdout.write(
    [
      "bik-agent <command>",
      "",
      "Commands:",
      "  init    Configure local agent token/runtime/mcp url",
      "  doctor  Validate local setup (token/runtime/mcp/sse)",
      "  status  Show current assigned task counters",
      "  listen  Start terminal listener (MCP SSE + poll fallback)",
      "  presets Show canonical runtime presets as JSON",
      "  matrix  Run runtime compatibility smoke matrix",
      "",
      "Examples:",
      "  bun run scripts/agent-runner/bik-agent.ts init",
      "  bun run scripts/agent-runner/bik-agent.ts doctor",
      "  bun run scripts/agent-runner/bik-agent.ts listen",
      "  bun run scripts/agent-runner/bik-agent.ts matrix",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || command === "-h" || command === "--help") {
    usage();
    return;
  }

  if (command === "init") return (await import("./init")).main();
  if (command === "doctor") return (await import("./doctor")).main();
  if (command === "status") return (await import("./status")).main();
  if (command === "listen") return (await import("./listen")).main();
  if (command === "presets") return (await import("./runtime-presets")).main();
  if (command === "matrix") return (await import("./smoke-matrix")).main();

  process.stderr.write(`Unknown command: ${command}\n\n`);
  usage();
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
