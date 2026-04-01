#!/usr/bin/env bun

/**
 * biklabs-agent — Connect your AI coding agent to BikLabs PM.
 *
 * Terminal-first, MCP-native.
 */

function usage(): void {
  process.stdout.write(
    [
      "biklabs-agent <command>",
      "",
      "Commands:",
      "  init    Configure agent token, runtime, and MCP URL",
      "  doctor  Validate local setup (token, runtime, MCP, SSE)",
      "  status  Show current assigned task counters",
      "  listen  Start listening for tasks (SSE + poll fallback)",
      "",
      "Examples:",
      "  biklabs-agent init",
      "  biklabs-agent doctor",
      "  biklabs-agent listen",
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

  process.stderr.write(`Unknown command: ${command}\n\n`);
  usage();
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
