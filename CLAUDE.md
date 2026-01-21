# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun install` - install deps
- `bun run index.ts` - run CLI (same as `today`)
- `bun --hot ./index.ts` - dev server with HMR
- `bun test` - run tests
- `bun test path/to/file.test.ts` - single test file
- `bunx ultracite fix` - format/lint fix
- `bunx ultracite check` - check for issues

## CLI Usage

Available flags:
- `--setup` - run configuration wizard
- `--ollama / --lmstudio / --openai / --auto` - switch provider

First run auto-triggers setup if `~/.today/settings.json` doesn't exist.

## Runtime

Use Bun, not Node.js. Bun auto-loads .env files.

**Prefer Bun APIs:**
- `Bun.serve()` over express (supports routes, WebSocket, HTTPS)
- `Bun.file()` over node:fs readFile/writeFile
- `bun:sqlite` over better-sqlite3
- `Bun.redis` over ioredis
- `Bun.sql` over pg/postgres.js
- `Bun.$\`cmd\`` over execa
- Built-in `WebSocket` over ws

**Frontend:** Use HTML imports with `Bun.serve()`, not vite. HTML can import .tsx/.jsx directly.

## Architecture

**CLI Framework:** [@stricli/core](https://www.npmjs.com/package/@stricli/core) for command/flag parsing. Entry points: `index.ts`, `src/cli.ts`.

**LLM Integration:** [AI SDK](https://sdk.vercel.ai) (Vercel) abstracts provider differences. Uses:
- `ollama-ai-provider-v2` for Ollama
- `@ai-sdk/openai-compatible` for LM Studio
- `@ai-sdk/openai` for OpenAI

**Provider Pattern:** `src/llm.ts` implements auto-detection and fallback:
1. `auto` mode tries local providers (Ollama → LM Studio) before OpenAI
2. Detection via health check endpoints (`/api/tags`, `/v1/models`)
3. Explicit provider flags skip auto-detection

**Configuration:** User settings in `~/.today/settings.json`:
- Provider selection (auto/ollama/lmstudio/openai)
- Model names per provider
- Host URLs for local providers
- OpenAI API key
- Output file path (default: `./today.txt`)
- Optional custom system prompt

**Output Format:** Appends dated entries to output file (most recent first). Each entry follows template enforced by system prompt.

**Path Aliases:** `@/*` maps to `./src/*` (see tsconfig.json).

## Linting

Ultracite (Biome) handles all formatting and linting. Pre-commit hook auto-fixes staged files.

## TypeScript

Strict mode with `noUncheckedIndexedAccess` enabled. See tsconfig.json for full config.
