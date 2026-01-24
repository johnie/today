# Stricli API Reference

Complete API reference for Stricli CLI framework.

## Core Functions

### buildCommand

Creates a command with typed parameters and execution logic.

```typescript
function buildCommand<
    Flags extends CommandFlagsBase,
    Positional extends CommandPositionalBase,
    Context
>(config: CommandConfig<Flags, Positional, Context>): Command<Flags, Positional, Context>
```

**CommandConfig Interface:**

```typescript
interface CommandConfig<Flags, Positional, Context> {
    // Documentation
    docs: {
        brief: string;              // Short one-line description
        description?: string;        // Detailed multi-line description
        hideFromHelp?: boolean;     // Hide from help output
    };

    // Parameters (optional)
    parameters?: {
        flags?: FlagParametersConfig<Flags>;
        positional?: PositionalParametersConfig<Positional>;
        aliases?: Record<string, string>;  // Short aliases: { v: "verbose" }
    };

    // Execution function
    func(
        this: LocalContext,
        flags: Flags,
        positional: Positional,
        context: Context
    ): void | Promise<void>;
}
```

**Example:**

```typescript
export const deploy = buildCommand({
    docs: {
        brief: "Deploy application",
        description: "Deploys the application to the specified environment"
    },
    parameters: {
        flags: {
            env: {
                kind: "enum",
                values: ["dev", "staging", "prod"],
                brief: "Target environment",
                default: "dev"
            },
            dryRun: {
                kind: "boolean",
                brief: "Simulate deployment without making changes",
                default: false
            }
        },
        aliases: {
            e: "env",
            d: "dryRun"
        }
    },
    async func(flags) {
        console.log(`Deploying to ${flags.env}...`);
        if (flags.dryRun) {
            console.log("(dry run mode)");
        }
        // Deployment logic
    }
});
```

### buildRouteMap

Organizes multiple commands or nested route maps into a hierarchical structure.

```typescript
function buildRouteMap<Context>(
    config: RouteMapConfig<Context>
): RouteMap<Context>
```

**RouteMapConfig Interface:**

```typescript
interface RouteMapConfig<Context> {
    routes: {
        [routeName: string]:
            | Command<any, any, Context>
            | RouteMap<Context>
            | LazyRouteMap<Context>;
    };
    docs?: {
        brief?: string;
        description?: string;
    };
}
```

**Example:**

```typescript
export const dbRoutes = buildRouteMap({
    routes: {
        migrate: migrateCommand,
        seed: seedCommand,
        reset: resetCommand,
        backup: backupCommand
    },
    docs: {
        brief: "Database operations",
        description: "Manage database migrations, seeding, and backups"
    }
});
```

**Nested Routes:**

```typescript
const rootRoutes = buildRouteMap({
    routes: {
        db: dbRoutes,
        user: userRoutes,
        config: configRoutes
    }
});
```

**Lazy Loading:**

```typescript
const routes = buildRouteMap({
    routes: {
        analyze: {
            lazy: async () => {
                const { analyzeCommand } = await import("./commands/analyze");
                return analyzeCommand;
            },
            brief: "Run analysis"
        }
    }
});
```

### buildApplication

Wraps a command or route map into an executable application.

```typescript
function buildApplication<Context>(
    config: ApplicationConfig<Context>
): Application<Context>
```

**ApplicationConfig Interface:**

```typescript
interface ApplicationConfig<Context> {
    name: string;                    // CLI name (used in help text)
    version: string;                 // Version string
    description?: string;            // App description
    command: Command | RouteMap;     // Root command or route map
    versionFlags?: string[];         // Custom version flags (default: ["version"])
    helpFlags?: string[];            // Custom help flags (default: ["help"])
}
```

**Example:**

```typescript
import { name, version, description } from "../package.json";

export const app = buildApplication({
    name,
    version,
    description,
    command: rootRoutes,
    versionFlags: ["version", "v"],
    helpFlags: ["help", "h"]
});
```

### run

Executes an application with provided arguments and context.

```typescript
async function run<Context>(
    app: Application<Context>,
    args: string[],
    context?: Context
): Promise<void>
```

**Parameters:**
- `app` - Application built with `buildApplication`
- `args` - Array of CLI arguments (typically `process.argv.slice(2)`)
- `context` - Optional context object passed to all commands

**Example:**

```typescript
import { run } from "@stricli/core";
import { app } from "./app";

// Simple usage
await run(app, process.argv.slice(2));

// With custom context
const context = {
    config: loadConfig(),
    logger: createLogger(),
    db: connectDatabase()
};

await run(app, process.argv.slice(2), context);
```

## Flag Parameter Types

### Boolean Flag

On/off switch with automatic negation support.

```typescript
interface BooleanFlagConfig {
    kind: "boolean";
    brief: string;               // Required: short description
    description?: string;        // Optional: detailed description
    default?: boolean;           // Default value (false if omitted)
    hidden?: boolean;           // Hide from help output
}
```

**Usage:**
```bash
--verbose          # Sets to true
--no-verbose       # Sets to false
```

**Example:**

```typescript
flags: {
    verbose: {
        kind: "boolean",
        brief: "Enable verbose logging",
        default: false
    },
    interactive: {
        kind: "boolean",
        brief: "Run in interactive mode",
        default: true
    }
}
```

### Counter Flag

Counts the number of times a flag is provided.

```typescript
interface CounterFlagConfig {
    kind: "counter";
    brief: string;
    description?: string;
    hidden?: boolean;
}
```

**Usage:**
```bash
-v                 # Returns 1
-vv                # Returns 2
-vvv               # Returns 3
```

**Example:**

```typescript
flags: {
    verbose: {
        kind: "counter",
        brief: "Verbosity level (use -v, -vv, -vvv)"
    }
}

func(flags) {
    if (flags.verbose >= 2) {
        console.log("Debug mode enabled");
    }
}
```

### Enum Flag

Restricts values to a predefined set of strings.

```typescript
interface EnumFlagConfig<T extends string> {
    kind: "enum";
    values: readonly T[];        // Array of valid values
    brief: string;
    description?: string;
    default?: T;                 // Default value (must be in values)
    hidden?: boolean;
}
```

**Example:**

```typescript
flags: {
    format: {
        kind: "enum",
        values: ["json", "yaml", "toml", "xml"] as const,
        brief: "Output format",
        default: "json"
    },
    logLevel: {
        kind: "enum",
        values: ["debug", "info", "warn", "error"] as const,
        brief: "Logging level",
        default: "info"
    }
}
```

### Parsed Flag

Transforms string input using a parser function.

```typescript
interface ParsedFlagConfig<T> {
    kind: "parsed";
    parse: (input: string) => T;  // Parser function
    brief: string;
    description?: string;
    default?: T;                  // Default value (already parsed)
    placeholder?: string;         // Placeholder in help text
    hidden?: boolean;
}
```

**Built-in Parsers:**

```typescript
// Native constructors
String        // Identity parser
Number        // Parses numbers (throws on NaN)

// Stricli parsers
import { numberParser, booleanParser } from "@stricli/core";

numberParser  // Parses numbers with better error messages
booleanParser // Parses "true"/"false" strings
```

**Example:**

```typescript
flags: {
    port: {
        kind: "parsed",
        parse: Number,
        brief: "Server port",
        default: 3000,
        placeholder: "PORT"
    },
    timeout: {
        kind: "parsed",
        parse: (input) => {
            const ms = Number.parseInt(input, 10);
            if (Number.isNaN(ms) || ms < 0) {
                throw new Error("Timeout must be a positive number");
            }
            return ms;
        },
        brief: "Timeout in milliseconds",
        default: 5000
    },
    date: {
        kind: "parsed",
        parse: (input) => new Date(input),
        brief: "Start date",
        placeholder: "YYYY-MM-DD"
    }
}
```

### Variadic Flag

Accepts multiple values for the same flag.

```typescript
interface VariadicFlagConfig<T> {
    kind: "variadic";
    parse: (input: string) => T;  // Parser for each value
    brief: string;
    description?: string;
    default?: readonly T[];       // Default array of values
    placeholder?: string;
    hidden?: boolean;
}
```

**Usage:**
```bash
--include src --include tests --include docs
```

**Example:**

```typescript
flags: {
    include: {
        kind: "variadic",
        parse: String,
        brief: "Directories to include",
        default: []
    },
    exclude: {
        kind: "variadic",
        parse: String,
        brief: "Patterns to exclude"
    },
    tag: {
        kind: "variadic",
        parse: String,
        brief: "Tags to apply",
        placeholder: "TAG"
    }
}

func(flags) {
    // flags.include is string[]
    console.log(`Processing ${flags.include.length} directories`);
}
```

## Positional Parameter Types

### Tuple Positional

Fixed number of positional arguments in specific order.

```typescript
interface TuplePositionalConfig<T extends readonly unknown[]> {
    kind: "tuple";
    parameters: readonly [
        PositionalParameterConfig<T[0]>,
        PositionalParameterConfig<T[1]>,
        // ... more parameters
    ];
}

interface PositionalParameterConfig<T> {
    parse: (input: string) => T;
    brief: string;
    description?: string;
    placeholder?: string;
}
```

**Example:**

```typescript
positional: {
    kind: "tuple",
    parameters: [
        {
            brief: "Source file path",
            parse: String,
            placeholder: "SOURCE"
        },
        {
            brief: "Destination file path",
            parse: String,
            placeholder: "DEST"
        }
    ]
}

func(flags, [source, dest]) {
    console.log(`Copying ${source} to ${dest}`);
}
```

**Usage:**
```bash
my-cli copy file.txt backup.txt
```

### Array Positional

Variable number of positional arguments (all parsed the same way).

```typescript
interface ArrayPositionalConfig<T> {
    kind: "array";
    parameter: {
        parse: (input: string) => T;
        brief: string;
        description?: string;
        placeholder?: string;
    };
    optional?: boolean;         // Allow zero arguments
}
```

**Example:**

```typescript
positional: {
    kind: "array",
    parameter: {
        brief: "Files to process",
        parse: String,
        placeholder: "FILE"
    }
}

func(flags, files) {
    // files is string[]
    for (const file of files) {
        console.log(`Processing ${file}`);
    }
}
```

**Usage:**
```bash
my-cli process file1.txt file2.txt file3.txt
```

**Optional Array:**

```typescript
positional: {
    kind: "array",
    parameter: {
        brief: "Optional files to include",
        parse: String
    },
    optional: true
}
```

## Custom Parsers

### Basic Parser

```typescript
const portParser = (input: string): number => {
    const port = Number.parseInt(input, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port: ${input}`);
    }
    return port;
};

flags: {
    port: {
        kind: "parsed",
        parse: portParser,
        brief: "Server port"
    }
}
```

### URL Parser

```typescript
const urlParser = (input: string): URL => {
    try {
        return new URL(input);
    } catch {
        throw new Error(`Invalid URL: ${input}`);
    }
};

flags: {
    endpoint: {
        kind: "parsed",
        parse: urlParser,
        brief: "API endpoint URL"
    }
}
```

### File Path Parser

```typescript
import { resolve } from "node:path";
import { access } from "node:fs/promises";

const existingFileParser = async (input: string): Promise<string> => {
    const path = resolve(input);
    try {
        await access(path);
        return path;
    } catch {
        throw new Error(`File not found: ${input}`);
    }
};

// Note: Async parsers need special handling
```

### Regex Parser

```typescript
const regexParser = (input: string): RegExp => {
    try {
        return new RegExp(input);
    } catch (error) {
        throw new Error(`Invalid regex: ${input}`);
    }
};

flags: {
    pattern: {
        kind: "parsed",
        parse: regexParser,
        brief: "Regex pattern to match"
    }
}
```

### JSON Parser

```typescript
const jsonParser = <T = unknown>(input: string): T => {
    try {
        return JSON.parse(input) as T;
    } catch {
        throw new Error(`Invalid JSON: ${input}`);
    }
};

flags: {
    config: {
        kind: "parsed",
        parse: jsonParser,
        brief: "JSON configuration string"
    }
}
```

## Context Pattern

Pass shared dependencies and configuration to all commands.

### Define Context Interface

```typescript
interface AppContext {
    readonly config: AppConfig;
    readonly logger: Logger;
    readonly db: Database;
}
```

### Type Commands with Context

```typescript
export const createUser = buildCommand<
    CreateUserFlags,
    [username: string],
    AppContext
>({
    docs: {
        brief: "Create a new user"
    },
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                { brief: "Username", parse: String }
            ]
        }
    },
    async func(flags, [username], context) {
        context.logger.info(`Creating user: ${username}`);
        await context.db.users.create({ username });
        context.logger.info("User created successfully");
    }
});
```

### Initialize and Run

```typescript
import { createLogger } from "./logger";
import { connectDatabase } from "./db";
import { loadConfig } from "./config";

const context: AppContext = {
    config: loadConfig(),
    logger: createLogger(),
    db: await connectDatabase()
};

await run(app, process.argv.slice(2), context);
```

## Aliases

Define short aliases for flag names.

```typescript
buildCommand({
    parameters: {
        flags: {
            verbose: {
                kind: "boolean",
                brief: "Verbose output"
            },
            output: {
                kind: "parsed",
                parse: String,
                brief: "Output file"
            }
        },
        aliases: {
            v: "verbose",
            o: "output"
        }
    },
    func(flags) {
        // Both --verbose and -v set flags.verbose
        // Both --output and -o set flags.output
    }
});
```

**Usage:**
```bash
my-cli -v -o output.txt
my-cli --verbose --output output.txt
```

## LocalContext

Commands can access `this` context for stdio operations.

```typescript
interface LocalContext {
    readonly stdin: NodeJS.ReadableStream;
    readonly stdout: NodeJS.WritableStream;
    readonly stderr: NodeJS.WritableStream;
    readonly console: Console;
}

buildCommand({
    func() {
        this.console.log("Standard output");
        this.console.error("Error output");

        // Access streams directly
        this.stdout.write("Direct write\n");
    }
});
```

This is especially useful for testing, where you can mock stdio.

## Advanced Patterns

### Conditional Parameters

Use TypeScript type narrowing for conditional logic based on flags:

```typescript
interface Flags {
    readonly format: "json" | "csv";
    readonly pretty: boolean;
}

func(flags: Flags) {
    if (flags.format === "json" && flags.pretty) {
        // Pretty-print JSON
    }
}
```

### Required vs Optional Flags

All flags are technically optional (use `default` or check for `undefined`):

```typescript
flags: {
    required: {
        kind: "parsed",
        parse: String,
        brief: "Required parameter"
        // No default - will be undefined if not provided
    },
    optional: {
        kind: "parsed",
        parse: String,
        brief: "Optional parameter",
        default: "default-value"
    }
}

func(flags) {
    if (!flags.required) {
        throw new Error("--required flag is mandatory");
    }
}
```

### Mutually Exclusive Flags

Validate flag combinations in the function:

```typescript
func(flags) {
    const exclusiveFlags = [flags.create, flags.update, flags.delete];
    const count = exclusiveFlags.filter(Boolean).length;

    if (count === 0) {
        throw new Error("Must specify one of: --create, --update, --delete");
    }
    if (count > 1) {
        throw new Error("Flags --create, --update, --delete are mutually exclusive");
    }
}
```

### Loading Config Files

```typescript
import { readFile } from "node:fs/promises";

async func(flags) {
    const configPath = flags.config || ".myapprc.json";

    try {
        const configData = await readFile(configPath, "utf-8");
        const config = JSON.parse(configData);
        // Use config
    } catch (error) {
        throw new Error(`Failed to load config: ${error.message}`);
    }
}
```

### Progress and Spinners

```typescript
async func(flags) {
    console.log("Starting operation...");

    for (let i = 0; i < 10; i++) {
        console.log(`Step ${i + 1}/10`);
        await doWork();
    }

    console.log("Operation complete!");
}
```

### Exit Codes

```typescript
func(flags) {
    try {
        // Operation
        process.exit(0);  // Success
    } catch (error) {
        console.error(error.message);
        process.exit(1);  // Failure
    }
}
```

## Type Safety

Stricli provides full type safety for parameters.

### Flag Types

```typescript
interface MyFlags {
    readonly verbose: boolean;
    readonly count: number;
    readonly format: "json" | "yaml";
    readonly tags: string[];
}

const command = buildCommand<MyFlags, never>({
    parameters: {
        flags: {
            verbose: { kind: "boolean", brief: "Verbose" },
            count: { kind: "counter", brief: "Count" },
            format: {
                kind: "enum",
                values: ["json", "yaml"],
                brief: "Format"
            },
            tags: {
                kind: "variadic",
                parse: String,
                brief: "Tags"
            }
        }
    },
    func(flags: MyFlags) {
        // flags is fully typed
        flags.verbose;  // boolean
        flags.count;    // number
        flags.format;   // "json" | "yaml"
        flags.tags;     // string[]
    }
});
```

### Positional Types

```typescript
const command = buildCommand<never, [source: string, dest: string]>({
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                { brief: "Source", parse: String },
                { brief: "Destination", parse: String }
            ]
        }
    },
    func(flags, [source, dest]) {
        // source and dest are typed as string
    }
});
```

## Error Messages

Stricli provides clear error messages for common issues:

- Unknown flag: `Unknown flag: --invalid`
- Missing required positional: `Missing required argument: <SOURCE>`
- Invalid enum value: `Invalid value for --format: "xml". Must be one of: json, yaml`
- Parser error: `Failed to parse --port: Invalid number`
- Too many arguments: `Unexpected argument: extra`

Custom parser errors should be clear and actionable:

```typescript
const parser = (input: string) => {
    const value = Number.parseInt(input, 10);
    if (Number.isNaN(value)) {
        throw new Error(`Expected a number, got: "${input}"`);
    }
    if (value < 0) {
        throw new Error(`Expected a positive number, got: ${value}`);
    }
    return value;
};
```
