#!/usr/bin/env bun

/**
 * Local installation script
 * Installs the binary to ~/.local/bin/today
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const homeDir = homedir();
const installDir = join(homeDir, ".local", "bin");
const installPath = join(installDir, "today");

// Detect current platform and architecture
const platform = process.platform;
const arch = process.arch;

// Map to binary name
let binaryName: string;
if (platform === "darwin") {
  binaryName = arch === "arm64" ? "today-darwin-arm64" : "today-darwin-x64";
} else if (platform === "linux") {
  binaryName = arch === "arm64" ? "today-linux-arm64" : "today-linux-x64";
} else {
  console.error(`Unsupported platform: ${platform}-${arch}`);
  console.error(
    "Supported platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64"
  );
  process.exit(1);
}

const binaryPath = join(process.cwd(), "dist", binaryName);

// Check if binary exists
if (!existsSync(binaryPath)) {
  console.error(`Binary not found: ${binaryPath}`);
  console.error(
    "\nRun 'bun run build:all' to build binaries for all platforms."
  );
  process.exit(1);
}

console.log(`Installing ${binaryName} to ${installPath}...`);

// Create install directory if it doesn't exist
await Bun.$`mkdir -p ${installDir}`;

// Copy binary to install location
await Bun.$`cp ${binaryPath} ${installPath}`;

// Make executable
await Bun.$`chmod +x ${installPath}`;

console.log(`✓ Successfully installed to ${installPath}`);

// Check if ~/.local/bin is in PATH
const pathEnv = process.env.PATH || "";
const pathDirs = pathEnv.split(":");

if (pathDirs.includes(installDir)) {
  console.log("\n✓ You can now run 'today' from anywhere!");
} else {
  console.log("\n⚠️  ~/.local/bin is not in your PATH");
  console.log(
    "Add this line to your shell config (~/.bashrc, ~/.zshrc, etc.):"
  );
  console.log(`\n  export PATH="$HOME/.local/bin:$PATH"\n`);
  console.log("Then restart your terminal or run: source ~/.zshrc");
}
