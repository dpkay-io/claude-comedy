# Claude Comedy — Design Spec

A global Claude Code plugin that injects situational developer humor during idle execution gaps. Claude generates every joke on the fly — no predefined banks, infinite variety, fully contextual.

## Architecture Overview

```
PostToolBatch / SubagentStart hook
        │
        ▼
   engine.js (Node.js)
        │
        ├─ Read stdin JSON (tool context)
        ├─ Read config (~/.config/claude-comedy/config.json)
        ├─ Read state ({tmpdir}/claude-comedy-state.json)
        │
        ├─ Cooldown elapsed? ──NO──► exit(0) silently
        │       │
        │      YES
        │       │
        ├─ Classify situation from tool context
        ├─ Check repetition (last 3 categories)
        ├─ Build additionalContext prompt
        ├─ Write stdout JSON with additionalContext
        └─ Update state file (timestamp + category + counter)
```

Claude receives the `additionalContext` as a system reminder and generates a fresh, contextual joke in its next response. The plugin only handles timing, classification, and injection — Claude handles creativity and formatting.

## Display Format: Mood Bubble

Claude renders jokes in this format (Unicode box-drawing + emoji persona):

```
  💀 The Debug Reaper:
  ╭───────────────────────────────────────╮
  │ You just grepped for "TODO" in a     │
  │ 10-year-old codebase. Brave.         │
  ╰───────────────────────────────────────╯
```

- Persona name and emoji are generated fresh each time by Claude
- Box-drawing characters render in any modern terminal
- 1-3 lines inside the box, tight and punchy

## Hook Integration

Both hooks run the same `engine.js`. The engine reads `hook_event_name` from stdin to distinguish which event triggered it.

**PostToolBatch** — fires after a full batch of parallel tool calls resolves, before the next model call. This is the primary trigger — it catches the natural gaps between Claude's work cycles.

**SubagentStart** — fires when a subagent is spawned. Maps to the `delegation` humor category.

### Hook Output

On the fast path (cooldown not elapsed), the engine exits with code 0 and no stdout — zero impact.

On the slow path (joke delivery), the engine outputs:

```json
{
  "hookSpecificOutput": {
    "additionalContext": "🎭 Comedy Break! ... [prompt template with situation category and format instructions]"
  }
}
```

## Situation Classifier

The classifier reads tool names and tool inputs from the stdin JSON and maps to a humor category:

| Category | Trigger signals |
|---|---|
| `git` | Bash tool with `git` commands |
| `testing` | Bash with `test`, `jest`, `pytest`, `vitest`, `cargo test`, etc. |
| `debugging` | Grep/search patterns, error-related commands |
| `deployment` | Bash with `deploy`, `docker`, `kubectl`, `push`, CI commands |
| `refactoring` | Multiple Edit/Write calls in the same batch |
| `dependencies` | Bash with `npm install`, `pip install`, `cargo add`, etc. |
| `delegation` | SubagentStart hook event |
| `build` | Bash with `build`, `compile`, `make`, `tsc`, etc. |
| `general` | Fallback when nothing specific matches |

Classification: first keyword match wins (ordered by specificity). No match falls through to `general`.

## Comedy Prompt Template

The `additionalContext` string injected into Claude's context:

```
🎭 Comedy Break! You've been working hard — take a quick breather.

Tell a short, witty developer joke related to: {category}

Format it EXACTLY like this (use box-drawing characters):

  {emoji} {persona_name}:
  ╭─────────────────────────────────────────╮
  │ Your joke text here.                    │
  │ Can be 1-3 lines, keep it tight.        │
  ╰─────────────────────────────────────────╯

Rules:
- Pick a random fun persona name and matching emoji each time
- The joke should feel human — like a coworker cracking wise
- Observational humor > puns. Puns are ok sometimes.
- Never repeat the same joke structure twice in a row
- Keep it under 3 lines inside the box
- Don't explain the joke. Don't apologize. Just deliver it.
- After the joke, continue with your actual work as normal.
```

When repetition is detected (same category 2+ of last 3), the category line changes to:
```
Tell a short, witty developer joke about anything — surprise me.
```

## State Management

**State file:** `{os.tmpdir()}/claude-comedy-state.json`

```json
{
  "lastJokeAt": 1718700000000,
  "recentCategories": ["git", "git", "testing"],
  "jokeCount": 42
}
```

- `lastJokeAt` — Unix ms timestamp. Compared against `cooldown_minutes` from config.
- `recentCategories` — Rolling window of last 3 categories. If current matches 2+ of last 3, override to `general`.
- `jokeCount` — Lifetime counter for the stats command.

**Fast path performance:** Read state file, compare timestamp, exit. ~5-10ms on Node.js.

**Slow path performance:** Full classify + output + state update. ~15-25ms.

## Configuration

**Config file:** `~/.config/claude-comedy/config.json`

```json
{
  "cooldown_minutes": 5,
  "enabled": true
}
```

Defaults applied when file doesn't exist: `cooldown_minutes: 5`, `enabled: true`.

Read via `readFileSync` on every invocation (~1ms). No caching, no watchers.

## User Commands

### CLI: `claude-comedy`

```
claude-comedy config                     # Show current config
claude-comedy config --cooldown 10       # Set cooldown to 10 minutes
claude-comedy config --enable            # Enable
claude-comedy config --disable           # Disable
claude-comedy stats                      # Show joke count and config
claude-comedy reset                      # Clear state, reset counter
```

Registered via `bin` field in `package.json`.

### Skill: `/claude-comedy:config`

A slash command for in-conversation configuration. Handles natural language requests like "set comedy cooldown to 10 minutes" or "disable comedy". Reads/writes the same config file as the CLI.

## Project Structure

```
claude-comedy/
├── .claude-plugin/
│   └── plugin.json              ← Plugin manifest
├── hooks/
│   └── hooks.json               ← PostToolBatch + SubagentStart bindings
├── skills/
│   └── config/
│       └── SKILL.md             ← /claude-comedy:config slash command
├── src/
│   ├── engine.js                ← Hook entry: cooldown + classify + inject
│   ├── state.js                 ← State file read/write
│   └── config.js                ← Config file read with defaults
├── bin/
│   └── cli.js                   ← CLI entry point
├── package.json
├── LICENSE
└── README.md
```

## Plugin Manifest

`.claude-plugin/plugin.json`:

```json
{
  "name": "claude-comedy",
  "displayName": "Claude Comedy",
  "version": "1.0.0",
  "description": "Injects situational developer humor during idle execution gaps",
  "author": {
    "name": "dpk",
    "email": "hi.dpkay@gmail.com"
  },
  "repository": "https://github.com/dpkay-io/claude-comedy",
  "license": "MIT",
  "keywords": ["humor", "comedy", "developer", "fun"],
  "hooks": "./hooks/hooks.json",
  "skills": "./skills/"
}
```

## Hook Bindings

`hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolBatch": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/src/engine.js\"",
            "timeout": 5
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/src/engine.js\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## Installation

```bash
npm install -g claude-comedy
```

The `postinstall` script registers the plugin by creating a symlink from `~/.claude/plugins/claude-comedy` to the npm global install path (where `.claude-plugin/plugin.json` lives). Claude Code auto-discovers plugins in `~/.claude/plugins/`. The `preuninstall` script removes the symlink.

If symlink creation fails (permissions, platform issues), the script prints manual instructions instead of failing silently.

After installation, jokes start appearing automatically during Claude Code sessions — no manual setup required.

## Assumptions to Verify During Implementation

- `additionalContext` in hook output is confirmed to work as a system reminder for `PreToolUse` hooks. The design assumes the same behavior for `PostToolBatch` and `SubagentStart`. If it doesn't, the fallback is to use `systemMessage` (shown to user directly) with the joke prompt, or explore the `type: "prompt"` hook as a secondary injection mechanism.

## Error Handling

- Missing config file → use defaults, no error
- Missing state file → treat as "no previous joke", create on first write
- Malformed stdin JSON → exit(0) silently (don't block Claude)
- State file write failure → skip update, deliver joke anyway
- Any unexpected error → exit(0) silently, never exit(2) which would block Claude
