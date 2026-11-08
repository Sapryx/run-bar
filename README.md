# run-bar

A Claude Code plugin that draws buttons above the prompt to build, run and stop the project of the current session. The targets come from `.claude/run.json` in the session's working directory; without that file the bar is hidden.

A press runs the target's `build` command with a spinner, then its `run` command. While either runs, the buttons turn into Stop, which kills that process. A failure shows the exit code and the last line of output.

The plugin also ships the `run-config` skill, which lets the agent inspect a project and write its `.claude/run.json`.

## Configuration

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

Each key is a button. `build` is optional, `run` is required. Commands run without a shell in the session's working directory; a relative path in the first argument is resolved against it. Start the program directly rather than through a wrapper such as `cargo run`, so Stop kills the program itself.

## Install

At the prompt of a terminal session:

```
/plugin install run-bar --marketplace Sapryx/run-bar
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `Sapryx/run-bar`, then Add plugin.

## Install from a local folder

```bash
claude plugin marketplace add <path to this folder>
```

```bash
claude plugin install run-bar@run-bar
```

The plugin is then read from this folder; after an edit, run `/reload-plugins`.
