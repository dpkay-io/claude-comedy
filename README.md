[![Claude Code Plugin](https://img.shields.io/badge/Claude_Code_Plugin-cc785c)](https://github.com/dpkay-io/claude-comedy) [![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-blue)](https://github.com/dpkay-io/claude-comedy) [![License](https://img.shields.io/npm/l/claude-comedy)](https://github.com/dpkay-io/claude-comedy) [![fun](https://img.shields.io/badge/fun-ff69b4)](https://github.com/dpkay-io/claude-comedy) [![ai-tools](https://img.shields.io/badge/ai--tools-blueviolet)](https://github.com/dpkay-io/claude-comedy) [![npm downloads](https://img.shields.io/npm/dt/claude-comedy)](https://github.com/dpkay-io/claude-comedy) [![npm version](https://img.shields.io/npm/v/claude-comedy)](https://github.com/dpkay-io/claude-comedy) [![node version](https://img.shields.io/node/v/claude-comedy)](https://github.com/dpkay-io/claude-comedy)

# Claude Comedy

Developer humor that lives inside your Claude Code sessions. No setup, no manual invocation — just laughs between tool calls.

Claude Comedy is a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code) that hooks into the execution lifecycle and nudges Claude to crack a joke during natural idle gaps. Every joke is generated fresh by Claude itself — no predefined joke banks, infinite variety, fully contextual to what you're working on.

## Install

```bash
npm install -g claude-comedy
```

That's it. The plugin registers itself automatically. If auto-registration fails (permissions, non-standard setup), run manually:

```bash
claude-comedy setup
```

## How It Works

The plugin hooks into two Claude Code lifecycle events:

- **PostToolBatch** — after a batch of tool calls completes
- **SubagentStart** — when a subagent is spawned

When triggered, it checks a cooldown timer (default: 5 minutes). If enough time has passed, it classifies the situation (git, testing, deployment, etc.) and injects a prompt that nudges Claude to tell a contextual joke in a fun "mood bubble" format:

```
  👻 The Ghost of Deploys Past:
  ╭──────────────────────────────────────────────╮
  │ 47 files changed. On a Friday. At 4:59 PM.  │
  │ I too like to live dangerously.              │
  ╰──────────────────────────────────────────────╯
```

The jokes are situational — git operations get git humor, test runs get testing humor, and when the same category repeats too often, it switches to random topics to keep things fresh.

## Configure

### CLI

```bash
claude-comedy setup                       # Register plugin with Claude Code
claude-comedy unsetup                     # Unregister plugin
claude-comedy config                      # Show current config
claude-comedy config --cooldown 10        # Set cooldown to 10 minutes
claude-comedy config --style dry          # Set humor style
claude-comedy config --enable             # Enable
claude-comedy config --disable            # Disable (jokes stop immediately)
claude-comedy stats                       # Show joke count and stats
claude-comedy reset                       # Reset counter
```

### Humor Styles

Control the tone of jokes with `--style`:

| Style | Vibe |
|---|---|
| `observational` | Default. Relatable dev observations, occasional puns. |
| `dry` | Deadpan delivery. The funnier it is, the less it cares. |
| `dad-jokes` | Groan-worthy puns and obvious setups. |
| `absurdist` | Surreal, non-sequitur humor. |

### In Claude Code

Use the slash command:

```
/claude-comedy:config
```

Then tell Claude what you want: "set cooldown to 10 minutes", "switch to dad jokes", "show stats".

## Uninstall

```bash
npm uninstall -g claude-comedy
```

To unregister without uninstalling: `claude-comedy unsetup`

## How It's Built

- **Zero runtime dependencies** — only Node.js built-ins
- **Ultra-lightweight** — the engine checks cooldown and exits in ~10ms on the fast path
- **Never blocks Claude** — 5-second timeout ceiling, silent exit on any error
- **State file** at `~/.config/claude-comedy/state.json` — persists across reboots
- **Config file** at `~/.config/claude-comedy/config.json`

## Situation Categories

| Category | Detected from |
|---|---|
| git | `git` commands |
| testing | `test`, `jest`, `pytest`, `vitest`, etc. |
| searching | Grep/Glob tool usage |
| researching | WebFetch/WebSearch tool usage |
| exploring | Read tool usage |
| deployment | `docker`, `kubectl`, `deploy`, etc. |
| refactoring | Multiple Edit calls (no new files) in one batch |
| dependencies | `npm install`, `pip install`, etc. |
| delegation | Subagent spawned |
| build | `tsc`, `make`, `cargo build`, etc. |
| general | Fallback — anything goes |

## Contributing

PRs welcome! The codebase is small and focused:

- `src/classifier.js` — add new situation categories
- `src/prompt.js` — tweak the comedy prompt template and humor styles
- `src/engine.js` — the orchestrator (cooldown → classify → inject)

Run tests: `npm test`

## License

MIT
