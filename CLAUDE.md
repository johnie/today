# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `bun install` - install dependencies
- `bun run index.ts` - run CLI locally (same as running `today` command)
- `bun --hot ./index.ts` - dev server with hot module reloading

**Testing:**
- `bun test` - run all unit tests (vitest)
- `bun test path/to/file.test.ts` - run single test file
- `bun run test:ai` - run LLM evaluation tests (evalite)

**Linting & Formatting:**
- `bunx ultracite fix` - auto-fix formatting and linting issues
- `bunx ultracite check` - check for issues without fixing

**Building & Distribution:**
- `bun run build` - compile single binary for current platform to `./dist/today`
- `bun run build:all` - build binary with platform-specific naming (e.g., `today-darwin-arm64`)
- `bun run install:local` - install binary to `~/.local/bin/today` for global use

Note: Bun's `--compile` doesn't support cross-compilation. Build for other platforms on those platforms.

## CLI Usage

Available flags:
- `--setup` - run configuration wizard
- `--ollama / --lmstudio / --openai / --auto` - switch LLM provider

First run auto-triggers setup if `~/.today/settings.json` doesn't exist.

## Runtime

**This project uses Bun, not Node.js.** Bun auto-loads .env files.

**Always prefer Bun APIs:**
- `Bun.file()` over node:fs (for file operations)
- `Bun.write()` over node:fs writeFile
- `Bun.$\`cmd\`` over child_process/execa (for shell commands)
- `bun:sqlite` over better-sqlite3
- Built-in `WebSocket` over ws package

## Architecture

**CLI Framework:** [@stricli/core](https://www.npmjs.com/package/@stricli/core) handles command/flag parsing.
- Entry: `index.ts` → `src/cli.ts` (app definition) → `src/impl.ts` (command handlers)
- Command flow: CLI flags determine which handler runs (setup, provider switch, or main command)

**LLM Integration:** [Vercel AI SDK](https://sdk.vercel.ai) abstracts provider differences.
- `src/llm.ts` exports `refineIntention()` - main entry point for LLM calls
- Provider adapters:
  - `ollama-ai-provider-v2` for Ollama
  - `@ai-sdk/openai-compatible` for LM Studio
  - `@ai-sdk/openai` for OpenAI
- All use same `generateText()` interface from AI SDK

**Provider Auto-Detection (`src/llm.ts`):**
1. `auto` mode tries local providers first (Ollama → LM Studio), falls back to OpenAI
2. Detection via HTTP health checks:
   - Ollama: `GET {host}/api/tags`
   - LM Studio: `GET {host}/v1/models`
   - OpenAI: checks if API key exists
3. Explicit provider flags (`--ollama`, `--openai`, etc.) skip detection
4. Errors in auto mode are caught and next provider is tried; explicit mode throws immediately

**Configuration (`src/config.ts`):**
- User settings stored in `~/.today/settings.json`
- Contains: provider selection, model names per provider, host URLs, API keys, output file path
- `runSetup()` provides interactive wizard using enquirer prompts
- Settings merge with defaults on load

**File Output (`src/file.ts`):**
- Appends dated entries to output file (default: `./today.txt`)
- Format: `## YYYY-MM-DD\n{refined text}\n\n`
- New entries prepended (most recent first)
- Uses `Bun.file()` and `Bun.write()` for all file operations

**System Prompt:**
Default prompt in `src/llm.ts` enforces specific output format:
```
Today will be a good day if: [one specific outcome]
I will do this by: [one concrete action]
Everything else can wait.
```
Users can override via `systemPrompt` field in settings.

**Path Aliases:** `@/*` maps to `./src/*` (configured in tsconfig.json and vitest.config.ts).

## Testing

**Unit tests:** `tests/*.test.ts` - standard vitest tests for pure functions
**LLM evals:** `tests/*.eval.ts` - evalite tests that call real LLM APIs (use `autoevals` library)

Run unit tests frequently. LLM evals are slower and may require API keys/running services.

## Code Standards

This project uses **Ultracite** (Biome-based) with strict rules. Key points:
- Explicit types for function params/returns when they enhance clarity
- Prefer `unknown` over `any`
- Use `async/await` over promise chains
- Handle errors with try-catch in async code
- Arrow functions for callbacks
- `const` by default, `let` only when reassigning
- Optional chaining (`?.`) and nullish coalescing (`??`)
- Pre-commit hook auto-fixes staged files via lefthook

TypeScript strict mode enabled with `noUncheckedIndexedAccess`.
