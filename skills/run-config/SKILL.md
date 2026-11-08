---
name: run-config
description: Create or update .claude/run.json, the file the run-bar buttons above the prompt read to build, run and stop the project. Use when asked to set up, add or change run buttons, run targets or the run configuration of a project.
---

# Configure run-bar for a project

run-bar draws one button per target in `.claude/run.json` at the root of the session's working directory. A press runs the target's `build` command with a spinner, then its `run` command; Stop kills whichever of the two is running. Without the file the bar is hidden.

## File format

```json
{
  "debug": {
    "build": ["cargo", "build", "-p", "app"],
    "run": ["target/debug/app.exe"]
  },
  "release": {
    "build": ["cargo", "build", "-p", "app", "--release"],
    "run": ["target/release/app.exe"]
  }
}
```

- Each key is a target; its button reads `▶ <Key>` with the first letter capitalized. Keys appear in file order.
- `build` is optional: an argument vector run before `run`. Leave it out when the project has nothing to build.
- `run` is required: the argument vector of the program itself.
- Commands run without a shell, in the session's working directory. No pipes, `&&`, globs or environment variable expansion; `argv[0]` is an executable on `PATH` or a path.
- A relative path in `argv[0]` (one containing `/` or `\`) is resolved against the working directory.

## Steps

1. Read the project's build files (`Cargo.toml`, `package.json`, `*.csproj`, `CMakeLists.txt`, `project.godot`, a `Makefile`, the README) to find how it is built and started.
2. Split each target into a build step and a run step that starts the program directly, not through a wrapper that spawns it (`cargo run`, `npm start`, `dotnet run`): Stop kills only the process run-bar started, so a wrapper's child would survive. For Rust that is `cargo build` plus the binary in `target/<profile>/`; add `.exe` on Windows.
3. Offer the usual targets for the stack, `debug` and `release` where the build has both. If the build or run command is unclear, ask the user one short question instead of guessing.
4. Write `.claude/run.json` with the Write tool; run-bar reloads it as soon as the write lands. Keep an existing file's other targets unless the user asked to remove them.
5. Tell the user which buttons appear and what each runs. Do not press them or run the commands yourself unless asked.
