# today

AI-powered daily intention refinement. One goal, one action, zero noise.

## What it does

Takes your raw thoughts and refines them into a focused daily intention:

```
Today will be a good day if: [one specific outcome]
I will do this by: [one concrete action]
Everything else can wait.
```

Runs locally with Ollama or LM Studio, falls back to OpenAI if needed.

## Install

### From source

Requires [Bun](https://bun.sh) runtime.

```bash
git clone https://github.com/johnie/today.git
cd today
bun install
bun link
```

### Standalone binary

Build and install a native binary:

```bash
bun run build
bun run install:local
```

Binary installs to `~/.local/bin/today`. Ensure this directory is in your PATH.

## Usage

First run triggers an interactive setup wizard:

```bash
today
```

Subsequent runs append dated entries to your output file (default: `./today.txt`).

### Provider switching

```bash
today --ollama      # Use Ollama
today --lmstudio    # Use LM Studio
today --openai      # Use OpenAI
today --auto        # Try local first, fallback to OpenAI
```

## Configuration

Settings stored at `~/.today/settings.json`.

Rerun setup wizard anytime:

```bash
today --setup
```

## License

MIT
