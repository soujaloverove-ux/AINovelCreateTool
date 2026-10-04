import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("Windows batch entry points locate the repository and delegate to the shared runtime", async () => {
  const entryPoints = [
    ["一键检测运行环境.bat", "Bootstrap"],
    ["autostart.bat", "Start"],
    ["stop.bat", "Stop"],
  ];

  for (const [file, mode] of entryPoints) {
    const source = await read(file);
    assert.match(source, /%~dp0scripts\\windows-runtime\.ps1/i, file);
    assert.match(source, new RegExp(`-Mode\\s+${mode}`, "i"), file);
    assert.match(source, /exit\s+\/b\s+%errorlevel%/i, file);
  }
});

test("bootstrap contract installs and initializes every required local dependency", async () => {
  const source = await read("scripts/windows-runtime.ps1");

  for (const required of [
    "OpenJS.NodeJS.LTS",
    "PostgreSQL.PostgreSQL.17",
    "Ollama.Ollama",
    "Microsoft.WinGet.Client",
    "pnpm@10.12.1",
    "pnpm install --frozen-lockfile",
    "migration:run",
    "seed",
    "qwen2.5:3b",
  ]) {
    assert.ok(
      source.includes(required),
      `missing bootstrap contract: ${required}`,
    );
  }

  assert.match(source, /Test-Path\s+\$ServerEnvPath/);
  assert.match(source, /RandomNumberGenerator/);
  assert.match(source, /ENCRYPTION_MASTER_KEY=/);
  assert.match(source, /Start-Process[\s\S]*-Verb\s+RunAs/);
  assert.match(source, /autostart\.bat/i);
});

test("start contract waits for services and creates the local Ollama provider once", async () => {
  const source = await read("scripts/windows-runtime.ps1");

  for (const required of [
    "http://localhost:11434/api/version",
    "http://localhost:3000/health",
    "http://localhost:5173",
    "/api/ai/providers",
    "http://localhost:11434/v1",
    "ollama-local",
  ]) {
    assert.ok(source.includes(required), `missing start contract: ${required}`);
  }

  assert.match(source, /\.pids/);
  assert.match(source, /logs/);
  assert.match(source, /0x672C/);
  assert.match(source, /0x5730/);
  assert.match(source, /Start-Process/);
  assert.match(source, /ConvertTo-Json/);
});

test("stop contract validates tracked commands and never kills services globally", async () => {
  const source = await read("scripts/windows-runtime.ps1");

  assert.match(source, /Win32_Process/);
  assert.match(source, /CommandLine/);
  assert.match(source, /taskkill(?:\.exe)?[\s\S]*\/PID[\s\S]*\/T[\s\S]*\/F/i);
  assert.doesNotMatch(source, /taskkill(?:\.exe)?[^\r\n]*\/IM/i);
  assert.doesNotMatch(source, /Stop-Process\s+[^\r\n]*-Name/i);
  assert.doesNotMatch(source, /Get-Process\s+(?:node|ollama|postgres)/i);
});

test("the project guide documents first run, daily use, stop behavior, ports, and troubleshooting", async () => {
  const source = await read("项目说明.md");

  for (const required of [
    "Windows 10/11",
    "一键检测运行环境.bat",
    "autostart.bat",
    "stop.bat",
    "5432",
    "11434",
    "3000",
    "5173",
    "apps/server/.env",
    "logs",
    ".pids",
    "端口冲突",
    "PostgreSQL",
    "Ollama",
  ]) {
    assert.ok(source.includes(required), `guide omits: ${required}`);
  }
});
