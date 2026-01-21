#!/usr/bin/env bun

/**
 * Build script for current platform
 * Note: Bun's --compile doesn't support cross-compilation yet.
 * To build for other platforms, run this script on that platform.
 */

const platform = process.platform;
const arch = process.arch;

let binaryName: string;
if (platform === "darwin") {
  binaryName = arch === "arm64" ? "today-darwin-arm64" : "today-darwin-x64";
} else if (platform === "linux") {
  binaryName = arch === "arm64" ? "today-linux-arm64" : "today-linux-x64";
} else if (platform === "win32") {
  binaryName =
    arch === "x64" ? "today-windows-x64.exe" : "today-windows-arm64.exe";
} else {
  console.error(`Unsupported platform: ${platform}-${arch}`);
  process.exit(1);
}

console.log(`Building binary for ${platform}-${arch}...\n`);
console.log(`Output: ./dist/${binaryName}\n`);

try {
  await Bun.$`bun build --compile --minify src/cli.ts --outfile ./dist/${binaryName}`;
  console.log("\n✓ Binary built successfully!");
  console.log(`\nBinary location: ./dist/${binaryName}`);
  console.log("\nTo install locally, run: bun run install:local");
} catch (error) {
  console.error("✗ Build failed");
  console.error(error);
  process.exit(1);
}

console.log("\n📝 Note: Bun doesn't support cross-compilation yet.");
console.log("To build for other platforms, run this script on that platform.");
