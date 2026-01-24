# Stricli Examples

Complete working examples demonstrating common Stricli patterns.

## Example 1: Single-Command CLI (File Converter)

A simple CLI that converts files between formats.

### Project Structure

```
file-converter/
├── src/
│   ├── commands/
│   │   └── convert.ts
│   ├── app.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### src/commands/convert.ts

```typescript
import { buildCommand } from "@stricli/core";
import { readFile, writeFile } from "node:fs/promises";

export interface ConvertFlags {
    readonly input: string;
    readonly output: string;
    readonly format: "json" | "yaml" | "toml";
    readonly pretty: boolean;
}

export const convert = buildCommand({
    docs: {
        brief: "Convert files between formats",
        description: "Converts configuration files between JSON, YAML, and TOML formats"
    },
    parameters: {
        flags: {
            input: {
                kind: "parsed",
                parse: String,
                brief: "Input file path",
                placeholder: "FILE"
            },
            output: {
                kind: "parsed",
                parse: String,
                brief: "Output file path",
                placeholder: "FILE"
            },
            format: {
                kind: "enum",
                values: ["json", "yaml", "toml"] as const,
                brief: "Target format",
                default: "json"
            },
            pretty: {
                kind: "boolean",
                brief: "Pretty-print output",
                default: true
            }
        },
        aliases: {
            i: "input",
            o: "output",
            f: "format",
            p: "pretty"
        }
    },
    async func(flags) {
        if (!flags.input) {
            throw new Error("--input is required");
        }
        if (!flags.output) {
            throw new Error("--output is required");
        }

        console.log(`Converting ${flags.input} to ${flags.format}...`);

        const content = await readFile(flags.input, "utf-8");
        const data = JSON.parse(content);  // Simplified: assumes JSON input

        let output: string;
        switch (flags.format) {
            case "json":
                output = flags.pretty
                    ? JSON.stringify(data, null, 2)
                    : JSON.stringify(data);
                break;
            case "yaml":
                // Use yaml library in real implementation
                output = "# YAML output would go here";
                break;
            case "toml":
                // Use toml library in real implementation
                output = "# TOML output would go here";
                break;
        }

        await writeFile(flags.output, output, "utf-8");
        console.log(`✓ Converted to ${flags.output}`);
    }
});
```

### src/app.ts

```typescript
import { buildApplication } from "@stricli/core";
import { name, version, description } from "../package.json";
import { convert } from "./commands/convert";

export const app = buildApplication({
    name,
    version,
    description,
    command: convert
});
```

### src/index.ts

```typescript
import { run } from "@stricli/core";
import { app } from "./app";

await run(app, process.argv.slice(2));
```

### package.json

```json
{
  "name": "file-converter",
  "version": "1.0.0",
  "description": "Convert files between formats",
  "type": "module",
  "bin": {
    "convert": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@stricli/core": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Usage

```bash
# Install and build
npm install
npm run build

# Convert with defaults
convert -i config.json -o config.yaml -f yaml

# Convert without pretty-printing
convert --input data.json --output data.json --no-pretty
```

## Example 2: Multi-Command CLI (Project Manager)

A CLI with multiple commands for managing projects and tasks.

### Project Structure

```
pm-cli/
├── src/
│   ├── commands/
│   │   ├── project/
│   │   │   ├── create.ts
│   │   │   ├── delete.ts
│   │   │   └── list.ts
│   │   ├── task/
│   │   │   ├── add.ts
│   │   │   ├── complete.ts
│   │   │   └── list.ts
│   │   └── init.ts
│   ├── routes/
│   │   ├── project.ts
│   │   ├── task.ts
│   │   └── index.ts
│   ├── context.ts
│   ├── app.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### src/context.ts

```typescript
export interface Database {
    projects: Map<string, Project>;
    tasks: Map<string, Task>;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    completed: boolean;
    createdAt: Date;
}

export interface AppContext {
    readonly db: Database;
    readonly configPath: string;
}

export function createContext(): AppContext {
    return {
        db: {
            projects: new Map(),
            tasks: new Map()
        },
        configPath: ".pm-cli.json"
    };
}
```

### src/commands/project/create.ts

```typescript
import { buildCommand } from "@stricli/core";
import type { AppContext } from "../../context";

export interface CreateProjectFlags {
    readonly name: string;
    readonly description: string;
}

export const createProject = buildCommand({
    docs: {
        brief: "Create a new project",
        description: "Creates a new project with the given name and description"
    },
    parameters: {
        flags: {
            name: {
                kind: "parsed",
                parse: String,
                brief: "Project name",
                placeholder: "NAME"
            },
            description: {
                kind: "parsed",
                parse: String,
                brief: "Project description",
                default: ""
            }
        },
        aliases: {
            n: "name",
            d: "description"
        }
    },
    func(flags, _positional, context: AppContext) {
        if (!flags.name) {
            throw new Error("Project name is required (--name)");
        }

        const id = crypto.randomUUID();
        const project = {
            id,
            name: flags.name,
            description: flags.description,
            createdAt: new Date()
        };

        context.db.projects.set(id, project);

        console.log(`✓ Created project: ${flags.name}`);
        console.log(`  ID: ${id}`);
    }
});
```

### src/commands/project/list.ts

```typescript
import { buildCommand } from "@stricli/core";
import type { AppContext } from "../../context";

export interface ListProjectsFlags {
    readonly verbose: boolean;
}

export const listProjects = buildCommand({
    docs: {
        brief: "List all projects",
        description: "Displays a list of all projects in the database"
    },
    parameters: {
        flags: {
            verbose: {
                kind: "boolean",
                brief: "Show detailed information",
                default: false
            }
        },
        aliases: {
            v: "verbose"
        }
    },
    func(flags, _positional, context: AppContext) {
        const projects = Array.from(context.db.projects.values());

        if (projects.length === 0) {
            console.log("No projects found. Create one with 'pm project create'");
            return;
        }

        console.log(`Found ${projects.length} project(s):\n`);

        for (const project of projects) {
            console.log(`• ${project.name}`);

            if (flags.verbose) {
                console.log(`  ID: ${project.id}`);
                console.log(`  Description: ${project.description || "(none)"}`);
                console.log(`  Created: ${project.createdAt.toISOString()}`);
                console.log();
            }
        }
    }
});
```

### src/commands/project/delete.ts

```typescript
import { buildCommand } from "@stricli/core";
import type { AppContext } from "../../context";

export const deleteProject = buildCommand({
    docs: {
        brief: "Delete a project",
        description: "Deletes a project and all its associated tasks"
    },
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    brief: "Project ID to delete",
                    parse: String,
                    placeholder: "PROJECT_ID"
                }
            ]
        }
    },
    func(_flags, [projectId], context: AppContext) {
        const project = context.db.projects.get(projectId);

        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        // Delete associated tasks
        const tasksToDelete = Array.from(context.db.tasks.values())
            .filter(task => task.projectId === projectId);

        for (const task of tasksToDelete) {
            context.db.tasks.delete(task.id);
        }

        // Delete project
        context.db.projects.delete(projectId);

        console.log(`✓ Deleted project: ${project.name}`);
        console.log(`  Removed ${tasksToDelete.length} associated task(s)`);
    }
});
```

### src/commands/task/add.ts

```typescript
import { buildCommand } from "@stricli/core";
import type { AppContext } from "../../context";

export interface AddTaskFlags {
    readonly project: string;
    readonly title: string;
}

export const addTask = buildCommand({
    docs: {
        brief: "Add a new task",
        description: "Creates a new task in the specified project"
    },
    parameters: {
        flags: {
            project: {
                kind: "parsed",
                parse: String,
                brief: "Project ID",
                placeholder: "ID"
            },
            title: {
                kind: "parsed",
                parse: String,
                brief: "Task title",
                placeholder: "TITLE"
            }
        },
        aliases: {
            p: "project",
            t: "title"
        }
    },
    func(flags, _positional, context: AppContext) {
        if (!flags.project) {
            throw new Error("Project ID is required (--project)");
        }
        if (!flags.title) {
            throw new Error("Task title is required (--title)");
        }

        const project = context.db.projects.get(flags.project);
        if (!project) {
            throw new Error(`Project not found: ${flags.project}`);
        }

        const id = crypto.randomUUID();
        const task = {
            id,
            projectId: flags.project,
            title: flags.title,
            completed: false,
            createdAt: new Date()
        };

        context.db.tasks.set(id, task);

        console.log(`✓ Added task: ${flags.title}`);
        console.log(`  Project: ${project.name}`);
        console.log(`  ID: ${id}`);
    }
});
```

### src/routes/project.ts

```typescript
import { buildRouteMap } from "@stricli/core";
import { createProject } from "../commands/project/create";
import { deleteProject } from "../commands/project/delete";
import { listProjects } from "../commands/project/list";

export const projectRoutes = buildRouteMap({
    routes: {
        create: createProject,
        delete: deleteProject,
        list: listProjects
    },
    docs: {
        brief: "Manage projects",
        description: "Create, delete, and list projects"
    }
});
```

### src/routes/task.ts

```typescript
import { buildRouteMap } from "@stricli/core";
import { addTask } from "../commands/task/add";

export const taskRoutes = buildRouteMap({
    routes: {
        add: addTask
    },
    docs: {
        brief: "Manage tasks",
        description: "Add and complete tasks"
    }
});
```

### src/routes/index.ts

```typescript
import { buildRouteMap } from "@stricli/core";
import { projectRoutes } from "./project";
import { taskRoutes } from "./task";

export const routes = buildRouteMap({
    routes: {
        project: projectRoutes,
        task: taskRoutes
    }
});
```

### src/app.ts

```typescript
import { buildApplication } from "@stricli/core";
import { name, version, description } from "../package.json";
import { routes } from "./routes";

export const app = buildApplication({
    name,
    version,
    description,
    command: routes
});
```

### src/index.ts

```typescript
import { run } from "@stricli/core";
import { app } from "./app";
import { createContext } from "./context";

const context = createContext();
await run(app, process.argv.slice(2), context);
```

### Usage

```bash
# Project management
pm project create --name "Website Redesign" --description "Redesign company website"
pm project list
pm project list --verbose
pm project delete <project-id>

# Task management
pm task add --project <project-id> --title "Design homepage mockup"
pm task add -p <project-id> -t "Implement responsive layout"

# Help
pm --help
pm project --help
pm task add --help
```

## Example 3: Custom Parsers

Advanced parsing with validation.

### URL Parser with Validation

```typescript
import { buildCommand } from "@stricli/core";

const urlParser = (input: string): URL => {
    try {
        const url = new URL(input);

        // Validate protocol
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("URL must use HTTP or HTTPS protocol");
        }

        return url;
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(`Invalid URL: ${input}`);
        }
        throw error;
    }
};

export const fetch = buildCommand({
    docs: {
        brief: "Fetch data from URL"
    },
    parameters: {
        flags: {
            url: {
                kind: "parsed",
                parse: urlParser,
                brief: "URL to fetch",
                placeholder: "URL"
            }
        }
    },
    async func(flags) {
        if (!flags.url) {
            throw new Error("--url is required");
        }

        console.log(`Fetching ${flags.url.href}...`);
        // Fetch logic here
    }
});
```

### Date Range Parser

```typescript
interface DateRange {
    start: Date;
    end: Date;
}

const dateRangeParser = (input: string): DateRange => {
    const [startStr, endStr] = input.split("..");

    if (!startStr || !endStr) {
        throw new Error(
            `Invalid date range format. Use: YYYY-MM-DD..YYYY-MM-DD`
        );
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (Number.isNaN(start.getTime())) {
        throw new Error(`Invalid start date: ${startStr}`);
    }
    if (Number.isNaN(end.getTime())) {
        throw new Error(`Invalid end date: ${endStr}`);
    }
    if (start > end) {
        throw new Error("Start date must be before end date");
    }

    return { start, end };
};

export const report = buildCommand({
    docs: {
        brief: "Generate report for date range"
    },
    parameters: {
        flags: {
            range: {
                kind: "parsed",
                parse: dateRangeParser,
                brief: "Date range (YYYY-MM-DD..YYYY-MM-DD)",
                placeholder: "RANGE"
            }
        }
    },
    func(flags) {
        if (!flags.range) {
            throw new Error("--range is required");
        }

        console.log(`Generating report from ${flags.range.start} to ${flags.range.end}`);
    }
});
```

### File Path Parser with Existence Check

```typescript
import { resolve } from "node:path";
import { access, constants } from "node:fs/promises";

const readableFileParser = async (input: string): Promise<string> => {
    const path = resolve(input);

    try {
        await access(path, constants.R_OK);
        return path;
    } catch {
        throw new Error(`File not readable: ${input}`);
    }
};

// Note: Stricli doesn't natively support async parsers
// You'll need to validate inside the func instead:

export const process = buildCommand({
    docs: {
        brief: "Process a file"
    },
    parameters: {
        flags: {
            file: {
                kind: "parsed",
                parse: String,
                brief: "File path",
                placeholder: "PATH"
            }
        }
    },
    async func(flags) {
        if (!flags.file) {
            throw new Error("--file is required");
        }

        // Validate file exists and is readable
        const path = resolve(flags.file);
        try {
            await access(path, constants.R_OK);
        } catch {
            throw new Error(`File not readable: ${flags.file}`);
        }

        console.log(`Processing ${path}...`);
        // Process file
    }
});
```

## Example 4: Variadic Flags and Array Positionals

Handling multiple values.

### Variadic Flags

```typescript
import { buildCommand } from "@stricli/core";

export interface BuildFlags {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
    readonly env: readonly string[];
}

export const build = buildCommand({
    docs: {
        brief: "Build the project",
        description: "Builds the project with specified includes, excludes, and environment variables"
    },
    parameters: {
        flags: {
            include: {
                kind: "variadic",
                parse: String,
                brief: "Directories to include in build",
                default: [],
                placeholder: "DIR"
            },
            exclude: {
                kind: "variadic",
                parse: String,
                brief: "Patterns to exclude from build",
                default: [],
                placeholder: "PATTERN"
            },
            env: {
                kind: "variadic",
                parse: String,
                brief: "Environment variables (KEY=VALUE)",
                default: [],
                placeholder: "VAR"
            }
        }
    },
    func(flags) {
        console.log("Building project...\n");

        if (flags.include.length > 0) {
            console.log("Including:");
            for (const dir of flags.include) {
                console.log(`  • ${dir}`);
            }
            console.log();
        }

        if (flags.exclude.length > 0) {
            console.log("Excluding:");
            for (const pattern of flags.exclude) {
                console.log(`  • ${pattern}`);
            }
            console.log();
        }

        if (flags.env.length > 0) {
            console.log("Environment:");
            for (const envVar of flags.env) {
                console.log(`  • ${envVar}`);
            }
            console.log();
        }

        console.log("✓ Build complete");
    }
});
```

**Usage:**

```bash
build --include src --include lib --exclude "**/*.test.ts" --env NODE_ENV=production --env API_KEY=xyz
```

### Array Positionals

```typescript
import { buildCommand } from "@stricli/core";

export const concat = buildCommand({
    docs: {
        brief: "Concatenate multiple files",
        description: "Reads multiple files and concatenates them into one output file"
    },
    parameters: {
        flags: {
            output: {
                kind: "parsed",
                parse: String,
                brief: "Output file path",
                placeholder: "FILE"
            }
        },
        positional: {
            kind: "array",
            parameter: {
                brief: "Input files to concatenate",
                parse: String,
                placeholder: "FILE"
            }
        }
    },
    async func(flags, inputFiles) {
        if (!flags.output) {
            throw new Error("--output is required");
        }

        if (inputFiles.length === 0) {
            throw new Error("At least one input file is required");
        }

        console.log(`Concatenating ${inputFiles.length} file(s)...`);

        for (const file of inputFiles) {
            console.log(`  • ${file}`);
        }

        // Concatenation logic here
        console.log(`\n✓ Written to ${flags.output}`);
    }
});
```

**Usage:**

```bash
concat --output combined.txt file1.txt file2.txt file3.txt
```

## Example 5: Lazy Loading for Large CLIs

Improve startup time by lazy-loading heavy commands.

### src/routes/index.ts

```typescript
import { buildRouteMap } from "@stricli/core";
import { quickCommand } from "../commands/quick";

export const routes = buildRouteMap({
    routes: {
        // Eagerly loaded (fast, small)
        quick: quickCommand,

        // Lazy loaded (slow, large dependencies)
        analyze: {
            lazy: async () => {
                const { analyzeCommand } = await import("../commands/analyze");
                return analyzeCommand;
            },
            brief: "Analyze code complexity"
        },

        bundle: {
            lazy: async () => {
                const { bundleCommand } = await import("../commands/bundle");
                return bundleCommand;
            },
            brief: "Bundle application"
        },

        deploy: {
            lazy: async () => {
                const { deployCommand } = await import("../commands/deploy");
                return deployCommand;
            },
            brief: "Deploy to production"
        }
    }
});
```

This pattern is especially useful when:
- Some commands import heavy dependencies (bundlers, analyzers, etc.)
- You want fast startup for common commands
- The CLI has many commands but users typically use only a few

## Example 6: Testing Commands

Commands are pure functions that are easy to test.

### test/greet.test.ts

```typescript
import { test, expect } from "bun:test";
import { greet } from "../src/commands/greet";

test("greet with default name", () => {
    const output: string[] = [];
    const mockConsole = {
        log: (msg: string) => output.push(msg)
    };

    greet.func.call(
        { console: mockConsole },
        { name: "World", shout: false },
        undefined,
        undefined
    );

    expect(output).toEqual(["Hello, World!"]);
});

test("greet with custom name", () => {
    const output: string[] = [];
    const mockConsole = {
        log: (msg: string) => output.push(msg)
    };

    greet.func.call(
        { console: mockConsole },
        { name: "Alice", shout: false },
        undefined,
        undefined
    );

    expect(output).toEqual(["Hello, Alice!"]);
});

test("greet with shout enabled", () => {
    const output: string[] = [];
    const mockConsole = {
        log: (msg: string) => output.push(msg)
    };

    greet.func.call(
        { console: mockConsole },
        { name: "Bob", shout: true },
        undefined,
        undefined
    );

    expect(output).toEqual(["HELLO, BOB!"]);
});
```

### Testing with Context

```typescript
import { test, expect } from "bun:test";
import { createProject } from "../src/commands/project/create";
import type { AppContext } from "../src/context";

test("create project", () => {
    const context: AppContext = {
        db: {
            projects: new Map(),
            tasks: new Map()
        },
        configPath: ".test-config.json"
    };

    const output: string[] = [];
    const mockConsole = {
        log: (msg: string) => output.push(msg)
    };

    createProject.func.call(
        { console: mockConsole },
        { name: "Test Project", description: "Test description" },
        undefined,
        context
    );

    // Verify project was created
    expect(context.db.projects.size).toBe(1);

    const project = Array.from(context.db.projects.values())[0];
    expect(project.name).toBe("Test Project");
    expect(project.description).toBe("Test description");

    // Verify output
    expect(output[0]).toContain("Created project: Test Project");
});
```

## Example 7: Integration with Existing Tools

Using Stricli as a wrapper for existing tools.

### Git Wrapper

```typescript
import { buildCommand, buildRouteMap } from "@stricli/core";
import { $ } from "bun";

const commitCommand = buildCommand({
    docs: {
        brief: "Create a git commit"
    },
    parameters: {
        flags: {
            message: {
                kind: "parsed",
                parse: String,
                brief: "Commit message",
                placeholder: "MESSAGE"
            },
            all: {
                kind: "boolean",
                brief: "Automatically stage all modified files",
                default: false
            }
        },
        aliases: {
            m: "message",
            a: "all"
        }
    },
    async func(flags) {
        if (!flags.message) {
            throw new Error("Commit message is required (--message)");
        }

        const args = ["git", "commit"];

        if (flags.all) {
            args.push("--all");
        }

        args.push("--message", flags.message);

        await $`${args}`.quiet();
        console.log("✓ Commit created");
    }
});

const pushCommand = buildCommand({
    docs: {
        brief: "Push commits to remote"
    },
    parameters: {
        flags: {
            force: {
                kind: "boolean",
                brief: "Force push",
                default: false
            }
        }
    },
    async func(flags) {
        const args = ["git", "push"];

        if (flags.force) {
            args.push("--force");
        }

        await $`${args}`.quiet();
        console.log("✓ Pushed to remote");
    }
});

export const gitRoutes = buildRouteMap({
    routes: {
        commit: commitCommand,
        push: pushCommand
    },
    docs: {
        brief: "Git operations"
    }
});
```

This pattern works well for:
- Creating type-safe wrappers around CLI tools
- Adding validation before calling external commands
- Providing better error messages and help text
- Composing multiple tool calls into workflows
