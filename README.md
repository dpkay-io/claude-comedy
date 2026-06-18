# Claude Comedy

Developer humor that lives inside your Claude Code sessions. No setup, no manual invocation — just laughs between tool calls.

Claude Comedy is a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code) that hooks into the execution lifecycle and nudges Claude to crack a joke during natural idle gaps. Every joke is generated fresh by Claude itself — no predefined joke banks, infinite variety, fully contextual to what you're working on.

## Install

```bash
npm install -g claude-comedy
```

That's it. Jokes start appearing in your next Claude Code session.

## How It Works

The plugin hooks into two Claude Code lifecycle events:

- **PostToolBatch** — after a batch of tool calls completes
- **SubagentStart** — when a subagent is spawned

When triggered, it checks a cooldown timer (default: 5 minutes). If enough time has passed, it classifies the situation (git, testing, deployment, etc.) and injects a prompt that nudges Claude to tell a contextual joke in a fun "mood bubble" format:

```
  🦆 The Rubber Duck:
  ╭───────────────────────────────────────╮
  │ You just mass-renamed a variable.     │
  │ Bold move. Let's see if it compiles.  │
  ╰───────────────────────────────────────╯
```

The jokes are situational — git operations get git humor, test runs get testing humor, and when the same category repeats too often, it switches to random topics to keep things fresh.

## Configure

### CLI

```bash
claude-comedy config                  # Show current config
claude-comedy config --cooldown 10    # Set cooldown to 10 minutes
claude-comedy config --enable         # Enable
claude-comedy config --disable        # Disable (jokes stop immediately)
claude-comedy stats                   # Show joke count and stats
claude-comedy reset                   # Reset counter
```

### In Claude Code

Use the slash command:

```
/claude-comedy:config
```

Then tell Claude what you want: "set cooldown to 10 minutes", "disable comedy", "show stats".

## Uninstall

```bash
npm uninstall -g claude-comedy
```

## How It's Built

- **Zero runtime dependencies** — only Node.js built-ins
- **Ultra-lightweight** — the engine checks cooldown and exits in ~10ms on the fast path
- **Never blocks Claude** — 5-second timeout ceiling, silent exit on any error
- **State file** in your OS temp directory — no permanent disk footprint
- **Config file** at `~/.config/claude-comedy/config.json`

## Situation Categories

| Category | Detected from |
|---|---|
| git | `git` commands |
| testing | `test`, `jest`, `pytest`, `vitest`, etc. |
| debugging | Grep/Glob tool usage |
| deployment | `docker`, `kubectl`, `deploy`, etc. |
| refactoring | Multiple Edit/Write calls in one batch |
| dependencies | `npm install`, `pip install`, etc. |
| delegation | Subagent spawned |
| build | `tsc`, `make`, `cargo build`, etc. |
| general | Fallback — anything goes |

## Contributing

PRs welcome! The codebase is small and focused:

- `src/classifier.js` — add new situation categories
- `src/prompt.js` — tweak the comedy prompt template
- `src/engine.js` — the orchestrator (cooldown → classify → inject)

Run tests: `npm test`

## License

MIT
