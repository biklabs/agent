#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import type { RuntimeType } from "./mcp-runtime";
import { listRuntimePresets } from "./runtime-presets";

interface SmokeResult {
  runtimeType: RuntimeType;
  adapter: "builtin" | "generic";
  command: string;
  binaryFound: boolean;
  binaryPath: string;
  versionProbeOk: boolean;
  version: string;
  helpProbeOk: boolean;
  notes: string;
}

function runCommand(bin: string, args: string[]): {
  ok: boolean;
  output: string;
} {
  const out = spawnSync(bin, args, {
    stdio: "pipe",
    encoding: "utf8",
  });
  const merged = `${out.stdout ?? ""}\n${out.stderr ?? ""}`.trim();
  return {
    ok: out.status === 0,
    output: merged,
  };
}

function firstNonEmptyLine(input: string): string {
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

function quoted(value: string): string {
  return value.includes("|") ? `"${value}"` : value;
}

function parseFilter(): Set<RuntimeType> | null {
  const raw = process.env.SMOKE_RUNTIME_TYPES?.trim();
  if (!raw) return null;
  const items = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean) as RuntimeType[];
  return new Set(items);
}

export async function main(): Promise<void> {
  const strict = process.env.SMOKE_STRICT === "1";
  const filter = parseFilter();
  const results: SmokeResult[] = [];

  for (const preset of listRuntimePresets()) {
    if (filter && !filter.has(preset.runtimeType)) continue;

    const which = runCommand("which", [preset.defaultCommand]);
    const binaryPath = firstNonEmptyLine(which.output);
    const binaryFound = which.ok && binaryPath.length > 0;

    let versionProbeOk = false;
    let version = "";
    let helpProbeOk = false;

    if (binaryFound) {
      const versionProbe = runCommand(preset.defaultCommand, preset.smokeVersionArgs);
      versionProbeOk = versionProbe.ok;
      version = firstNonEmptyLine(versionProbe.output).slice(0, 120);

      const helpProbe = runCommand(preset.defaultCommand, preset.smokeHelpArgs);
      helpProbeOk = helpProbe.ok;
    }

    results.push({
      runtimeType: preset.runtimeType,
      adapter: preset.adapter,
      command: preset.defaultCommand,
      binaryFound,
      binaryPath,
      versionProbeOk,
      version,
      helpProbeOk,
      notes: preset.notes,
    });
  }

  process.stdout.write("# Runtime Compatibility Matrix (Smoke)\n\n");
  process.stdout.write(`Generated: ${new Date().toISOString()}\n\n`);
  process.stdout.write("| Runtime | Adapter | Command | Binary | Version Probe | Help Probe | Version |\n");
  process.stdout.write("|---|---|---|---|---|---|---|\n");

  for (const row of results) {
    process.stdout.write(
      `| ${row.runtimeType} | ${row.adapter} | ${quoted(row.command)} | ${row.binaryFound ? "✅" : "❌"} | ${row.versionProbeOk ? "✅" : "❌"} | ${row.helpProbeOk ? "✅" : "❌"} | ${quoted(row.version || "-")} |\n`,
    );
  }

  const failures = results.filter((row) => !row.binaryFound || !row.helpProbeOk);

  process.stdout.write("\n## Notes\n");
  for (const row of results) {
    process.stdout.write(`- \`${row.runtimeType}\`: ${row.notes}\n`);
    if (row.binaryFound) {
      process.stdout.write(`  - Binary: \`${row.binaryPath}\`\n`);
    }
  }

  process.stdout.write("\n## Result\n");
  if (failures.length === 0) {
    process.stdout.write("- PASS: all selected runtimes passed smoke checks.\n");
    return;
  }

  process.stdout.write(`- WARN: ${failures.length} runtime(s) failed smoke checks.\n`);
  for (const row of failures) {
    process.stdout.write(`  - \`${row.runtimeType}\` command \`${row.command}\`\n`);
  }

  if (strict) {
    process.stdout.write("- STRICT mode is enabled (`SMOKE_STRICT=1`), exiting with code 1.\n");
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
