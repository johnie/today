# today

AI-powered daily intention refinement. One goal, one action, zero noise.

## What it does

Takes your raw thoughts and refines them into a focused daily intention:

```
Today will be a good day if: [one specific outcome]
I will do this by: [one concrete action]
Everything else can wait.
```

Runs locally with Ollama or LM Studio, falls back to OpenRouter or OpenAI if needed.

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
today --provider ollama      # Use Ollama
today --provider lmstudio    # Use LM Studio
today --provider openrouter  # Use OpenRouter
today --provider openai      # Use OpenAI
today --provider auto        # Try local first, fallback to cloud
```

### Runtime overrides

```bash
today --model gpt-4o              # Override model for this run
today --provider openai --model gpt-4o  # Override both provider and model
```

## Configuration

Settings stored at `~/.today/settings.json`.

### Configuration options

```bash
today --setup        # Full setup wizard
today --config       # Interactive config manager
today --show-config  # View current settings
```

## License

MIT
