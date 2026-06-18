# Claude Comedy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code global plugin that injects situational developer humor via `additionalContext` hook injection — Claude generates every joke dynamically.

**Architecture:** A Node.js hook script (`engine.js`) fires on `PostToolBatch` and `SubagentStart` events. It checks cooldown from a temp state file, classifies the situation from stdin tool context, checks for repetition, and outputs a `additionalContext` prompt that nudges Claude to tell a joke. Zero runtime dependencies — only Node.js built-ins.

**Tech Stack:** Node.js (built-ins only: `fs`, `path`, `os`, `process`). Testing via `node:test`. No runtime deps.

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Project metadata, bin entry, scripts |
| `.gitignore` | Standard Node.js ignores |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `hooks/hooks.json` | PostToolBatch + SubagentStart hook bindings |
| `src/config.js` | Read `~/.config/claude-comedy/config.json`, merge with defaults |
| `src/state.js` | Read/write temp state file, cooldown + repetition logic |
| `src/classifier.js` | Map stdin tool context → humor category |
| `src/prompt.js` | Build `additionalContext` comedy prompt string |
| `src/engine.js` | Main hook entry point — orchestrates all modules |
| `bin/cli.js` | CLI: `claude-comedy config/stats/reset` |
| `skills/config/SKILL.md` | Slash command skill for in-conversation config |
| `scripts/postinstall.js` | Register plugin symlink into `~/.claude/plugins/` |
| `scripts/preuninstall.js` | Remove plugin symlink |
| `test/config.test.js` | Config module tests |
| `test/state.test.js` | State module tests |
| `test/classifier.test.js` | Classifier tests |
| `test/prompt.test.js` | Prompt builder tests |
| `test/engine.test.js` | Engine integration tests |
| `test/cli.test.js` | CLI tests |
| `LICENSE` | MIT license |
| `README.md` | Installation, usage, contributing |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.claude-plugin/plugin.json`
- Create: `hooks/hooks.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "claude-comedy",
  "version": "1.0.0",
  "description": "Injects situational developer humor into Claude Code sessions",
  "main": "src/engine.js",
  "bin": {
    "claude-comedy": "bin/cli.js"
  },
  "scripts": {
    "test": "node --test test/*.test.js",
    "postinstall": "node scripts/postinstall.js",
    "preuninstall": "node scripts/preuninstall.js"
  },
  "keywords": ["claude-code", "plugin", "humor", "comedy", "developer"],
  "author": "dpk <hi.dpkay@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/dpk/claude-comedy"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "src/",
    "bin/",
    "hooks/",
    "skills/",
    "scripts/",
    ".claude-plugin/"
  ]
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.superpowers/
*.log
```

- [ ] **Step 3: Create `.claude-plugin/plugin.json`**

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
  "repository": "https://github.com/dpk/claude-comedy",
  "license": "MIT",
  "keywords": ["humor", "comedy", "developer", "fun"],
  "hooks": "./hooks/hooks.json",
  "skills": "./skills/"
}
```

- [ ] **Step 4: Create `hooks/hooks.json`**

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

- [ ] **Step 5: Commit scaffolding**

```bash
git add package.json .gitignore .claude-plugin/plugin.json hooks/hooks.json
git commit -m "Scaffold project structure with plugin manifest and hook bindings"
```

---

### Task 2: Config Module (TDD)

**Files:**
- Create: `test/config.test.js`
- Create: `src/config.js`

- [ ] **Step 1: Write failing tests for config module**

```js
// test/config.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DEFAULTS = { cooldown_minutes: 5, enabled: true };

describe('readConfig', () => {
  let tmpDir;
  let configPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-test-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when config file does not exist', () => {
    const { readConfig } = require('../src/config.js');
    const config = readConfig(path.join(tmpDir, 'nonexistent.json'));
    assert.deepStrictEqual(config, DEFAULTS);
  });

  it('reads valid config and merges with defaults', () => {
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 10 }));
    const { readConfig } = require('../src/config.js');
    const config = readConfig(configPath);
    assert.strictEqual(config.cooldown_minutes, 10);
    assert.strictEqual(config.enabled, true);
  });

  it('returns defaults for malformed JSON', () => {
    fs.writeFileSync(configPath, 'not json!!!');
    const { readConfig } = require('../src/config.js');
    const config = readConfig(configPath);
    assert.deepStrictEqual(config, DEFAULTS);
  });

  it('ignores unknown keys', () => {
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 3, foo: 'bar' }));
    const { readConfig } = require('../src/config.js');
    const config = readConfig(configPath);
    assert.strictEqual(config.cooldown_minutes, 3);
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.foo, undefined);
  });
});

describe('writeConfig', () => {
  let tmpDir;
  let configPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-test-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes config to file', () => {
    const { writeConfig } = require('../src/config.js');
    writeConfig(configPath, { cooldown_minutes: 10, enabled: false });
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.strictEqual(raw.cooldown_minutes, 10);
    assert.strictEqual(raw.enabled, false);
  });

  it('creates parent directories if missing', () => {
    const { writeConfig } = require('../src/config.js');
    const deepPath = path.join(tmpDir, 'a', 'b', 'config.json');
    writeConfig(deepPath, { cooldown_minutes: 7, enabled: true });
    const raw = JSON.parse(fs.readFileSync(deepPath, 'utf8'));
    assert.strictEqual(raw.cooldown_minutes, 7);
  });
});

describe('CONFIG_PATH', () => {
  it('resolves to ~/.config/claude-comedy/config.json', () => {
    const { CONFIG_PATH } = require('../src/config.js');
    const expected = path.join(os.homedir(), '.config', 'claude-comedy', 'config.json');
    assert.strictEqual(CONFIG_PATH, expected);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/config.test.js`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: Implement config module**

```js
// src/config.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CONFIG_PATH = path.join(os.homedir(), '.config', 'claude-comedy', 'config.json');

const DEFAULTS = Object.freeze({ cooldown_minutes: 5, enabled: true });
const VALID_KEYS = new Set(Object.keys(DEFAULTS));

function readConfig(filePath = CONFIG_PATH) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const merged = { ...DEFAULTS };
    for (const key of VALID_KEYS) {
      if (key in raw) merged[key] = raw[key];
    }
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

function writeConfig(filePath = CONFIG_PATH, config) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
}

module.exports = { readConfig, writeConfig, CONFIG_PATH, DEFAULTS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/config.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "Add config module with defaults and file I/O"
```

---

### Task 3: State Module (TDD)

**Files:**
- Create: `test/state.test.js`
- Create: `src/state.js`

- [ ] **Step 1: Write failing tests for state module**

```js
// test/state.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

describe('readState', () => {
  let tmpDir;
  let statePath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-state-test-'));
    statePath = path.join(tmpDir, 'state.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when state file does not exist', () => {
    const { readState } = require('../src/state.js');
    const state = readState(path.join(tmpDir, 'nonexistent.json'));
    assert.strictEqual(state.lastJokeAt, 0);
    assert.deepStrictEqual(state.recentCategories, []);
    assert.strictEqual(state.jokeCount, 0);
  });

  it('reads existing state', () => {
    const data = { lastJokeAt: 1000, recentCategories: ['git'], jokeCount: 5 };
    fs.writeFileSync(statePath, JSON.stringify(data));
    const { readState } = require('../src/state.js');
    const state = readState(statePath);
    assert.deepStrictEqual(state, data);
  });

  it('returns defaults for malformed JSON', () => {
    fs.writeFileSync(statePath, 'broken');
    const { readState } = require('../src/state.js');
    const state = readState(statePath);
    assert.strictEqual(state.lastJokeAt, 0);
  });
});

describe('writeState', () => {
  let tmpDir;
  let statePath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-state-test-'));
    statePath = path.join(tmpDir, 'state.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes state to file', () => {
    const { writeState } = require('../src/state.js');
    const state = { lastJokeAt: 999, recentCategories: ['git'], jokeCount: 1 };
    writeState(statePath, state);
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.deepStrictEqual(raw, state);
  });
});

describe('isCooldownElapsed', () => {
  it('returns true when no previous joke', () => {
    const { isCooldownElapsed } = require('../src/state.js');
    assert.strictEqual(isCooldownElapsed({ lastJokeAt: 0 }, 5), true);
  });

  it('returns false when within cooldown window', () => {
    const { isCooldownElapsed } = require('../src/state.js');
    const recentTimestamp = Date.now() - (2 * 60 * 1000);
    assert.strictEqual(isCooldownElapsed({ lastJokeAt: recentTimestamp }, 5), false);
  });

  it('returns true when cooldown has elapsed', () => {
    const { isCooldownElapsed } = require('../src/state.js');
    const oldTimestamp = Date.now() - (10 * 60 * 1000);
    assert.strictEqual(isCooldownElapsed({ lastJokeAt: oldTimestamp }, 5), true);
  });
});

describe('isRepetitive', () => {
  it('returns false with empty history', () => {
    const { isRepetitive } = require('../src/state.js');
    assert.strictEqual(isRepetitive({ recentCategories: [] }, 'git'), false);
  });

  it('returns false when category appears once in history', () => {
    const { isRepetitive } = require('../src/state.js');
    assert.strictEqual(isRepetitive({ recentCategories: ['git', 'testing', 'build'] }, 'git'), false);
  });

  it('returns true when category appears 2+ times in last 3', () => {
    const { isRepetitive } = require('../src/state.js');
    assert.strictEqual(isRepetitive({ recentCategories: ['git', 'git', 'testing'] }, 'git'), true);
  });

  it('returns true when all 3 are the same category', () => {
    const { isRepetitive } = require('../src/state.js');
    assert.strictEqual(isRepetitive({ recentCategories: ['git', 'git', 'git'] }, 'git'), true);
  });
});

describe('updateState', () => {
  it('sets timestamp, pushes category, increments counter', () => {
    const { updateState } = require('../src/state.js');
    const before = Date.now();
    const state = { lastJokeAt: 0, recentCategories: [], jokeCount: 0 };
    const updated = updateState(state, 'git');
    assert.ok(updated.lastJokeAt >= before);
    assert.deepStrictEqual(updated.recentCategories, ['git']);
    assert.strictEqual(updated.jokeCount, 1);
  });

  it('trims recentCategories to last 3', () => {
    const { updateState } = require('../src/state.js');
    const state = { lastJokeAt: 0, recentCategories: ['a', 'b', 'c'], jokeCount: 5 };
    const updated = updateState(state, 'd');
    assert.deepStrictEqual(updated.recentCategories, ['b', 'c', 'd']);
    assert.strictEqual(updated.jokeCount, 6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/state.test.js`
Expected: FAIL — `Cannot find module '../src/state.js'`

- [ ] **Step 3: Implement state module**

```js
// src/state.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATE_PATH = path.join(os.tmpdir(), 'claude-comedy-state.json');

const STATE_DEFAULTS = Object.freeze({ lastJokeAt: 0, recentCategories: [], jokeCount: 0 });

function readState(filePath = STATE_PATH) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { ...STATE_DEFAULTS, recentCategories: [] };
  }
}

function writeState(filePath = STATE_PATH, state) {
  fs.writeFileSync(filePath, JSON.stringify(state));
}

function isCooldownElapsed(state, cooldownMinutes) {
  if (state.lastJokeAt === 0) return true;
  const elapsed = Date.now() - state.lastJokeAt;
  return elapsed >= cooldownMinutes * 60 * 1000;
}

function isRepetitive(state, category) {
  const recent = state.recentCategories;
  const count = recent.filter(c => c === category).length;
  return count >= 2;
}

function updateState(state, category) {
  const recentCategories = [...state.recentCategories, category].slice(-3);
  return {
    lastJokeAt: Date.now(),
    recentCategories,
    jokeCount: state.jokeCount + 1,
  };
}

module.exports = { readState, writeState, isCooldownElapsed, isRepetitive, updateState, STATE_PATH };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/state.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/state.test.js
git commit -m "Add state module with cooldown and repetition logic"
```

---

### Task 4: Classifier Module (TDD)

**Files:**
- Create: `test/classifier.test.js`
- Create: `src/classifier.js`

- [ ] **Step 1: Write failing tests for classifier**

```js
// test/classifier.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('classify', () => {
  const { classify } = require('../src/classifier.js');

  it('returns "delegation" for SubagentStart events', () => {
    const input = { hook_event_name: 'SubagentStart' };
    assert.strictEqual(classify(input), 'delegation');
  });

  it('returns "git" for Bash tool with git commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'git status' } }],
    };
    assert.strictEqual(classify(input), 'git');
  });

  it('returns "testing" for test runner commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npm test' } }],
    };
    assert.strictEqual(classify(input), 'testing');
  });

  it('returns "testing" for jest', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npx jest --coverage' } }],
    };
    assert.strictEqual(classify(input), 'testing');
  });

  it('returns "deployment" for docker commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'docker build -t myapp .' } }],
    };
    assert.strictEqual(classify(input), 'deployment');
  });

  it('returns "dependencies" for npm install', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npm install lodash' } }],
    };
    assert.strictEqual(classify(input), 'dependencies');
  });

  it('returns "build" for tsc', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'tsc --build' } }],
    };
    assert.strictEqual(classify(input), 'build');
  });

  it('returns "debugging" for Grep tool', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Grep', tool_input: { pattern: 'error' } }],
    };
    assert.strictEqual(classify(input), 'debugging');
  });

  it('returns "refactoring" for multiple Edit calls', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [
        { tool_name: 'Edit', tool_input: { file_path: 'a.js' } },
        { tool_name: 'Edit', tool_input: { file_path: 'b.js' } },
      ],
    };
    assert.strictEqual(classify(input), 'refactoring');
  });

  it('returns "general" when nothing matches', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Read', tool_input: { file_path: 'foo.txt' } }],
    };
    assert.strictEqual(classify(input), 'general');
  });

  it('returns "general" for empty tool_calls', () => {
    const input = { hook_event_name: 'PostToolBatch', tool_calls: [] };
    assert.strictEqual(classify(input), 'general');
  });

  it('returns "general" for missing tool_calls', () => {
    const input = { hook_event_name: 'PostToolBatch' };
    assert.strictEqual(classify(input), 'general');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/classifier.test.js`
Expected: FAIL — `Cannot find module '../src/classifier.js'`

- [ ] **Step 3: Implement classifier module**

```js
// src/classifier.js

const BASH_CATEGORIES = [
  { category: 'git', patterns: [/\bgit\s/] },
  { category: 'testing', patterns: [/\btest\b/, /\bjest\b/, /\bpytest\b/, /\bvitest\b/, /\bmocha\b/, /\bcargo\s+test\b/, /\bgo\s+test\b/] },
  { category: 'deployment', patterns: [/\bdeploy\b/, /\bdocker\b/, /\bkubectl\b/, /\bhelm\b/, /\bterraform\b/] },
  { category: 'dependencies', patterns: [/\bnpm\s+install\b/, /\bnpm\s+i\b/, /\byarn\s+add\b/, /\bpip\s+install\b/, /\bcargo\s+add\b/, /\bpnpm\s+add\b/] },
  { category: 'build', patterns: [/\btsc\b/, /\bnpm\s+run\s+build\b/, /\bmake\b/, /\bcargo\s+build\b/, /\bgo\s+build\b/, /\bgradle\b/, /\bmvn\b/] },
];

const DEBUGGING_TOOLS = new Set(['Grep', 'Glob']);

function classify(input) {
  if (input.hook_event_name === 'SubagentStart') return 'delegation';

  const toolCalls = input.tool_calls || [];
  if (toolCalls.length === 0) return 'general';

  const editWriteCount = toolCalls.filter(t => t.tool_name === 'Edit' || t.tool_name === 'Write').length;
  if (editWriteCount >= 2) return 'refactoring';

  for (const call of toolCalls) {
    if (call.tool_name === 'Bash' || call.tool_name === 'PowerShell') {
      const cmd = (call.tool_input && call.tool_input.command) || '';
      for (const { category, patterns } of BASH_CATEGORIES) {
        if (patterns.some(p => p.test(cmd))) return category;
      }
    }

    if (DEBUGGING_TOOLS.has(call.tool_name)) return 'debugging';
  }

  return 'general';
}

module.exports = { classify };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/classifier.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/classifier.js test/classifier.test.js
git commit -m "Add situation classifier for tool context mapping"
```

---

### Task 5: Prompt Builder Module (TDD)

**Files:**
- Create: `test/prompt.test.js`
- Create: `src/prompt.js`

- [ ] **Step 1: Write failing tests for prompt builder**

```js
// test/prompt.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('buildPrompt', () => {
  const { buildPrompt } = require('../src/prompt.js');

  it('includes the category in the prompt', () => {
    const prompt = buildPrompt('git', false);
    assert.ok(prompt.includes('git'));
  });

  it('includes mood bubble format instructions', () => {
    const prompt = buildPrompt('testing', false);
    assert.ok(prompt.includes('╭'));
    assert.ok(prompt.includes('╮'));
    assert.ok(prompt.includes('╰'));
    assert.ok(prompt.includes('╯'));
  });

  it('includes persona instructions', () => {
    const prompt = buildPrompt('general', false);
    assert.ok(prompt.includes('persona'));
    assert.ok(prompt.includes('emoji'));
  });

  it('switches to surprise mode when repetitive', () => {
    const prompt = buildPrompt('git', true);
    assert.ok(!prompt.includes('related to: git'));
    assert.ok(prompt.includes('surprise'));
  });

  it('includes the comedy break header', () => {
    const prompt = buildPrompt('deployment', false);
    assert.ok(prompt.includes('Comedy Break'));
  });
});

describe('buildOutputJson', () => {
  const { buildOutputJson } = require('../src/prompt.js');

  it('wraps prompt in hookSpecificOutput.additionalContext', () => {
    const json = buildOutputJson('test prompt');
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.hookSpecificOutput.additionalContext, 'test prompt');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/prompt.test.js`
Expected: FAIL — `Cannot find module '../src/prompt.js'`

- [ ] **Step 3: Implement prompt builder**

```js
// src/prompt.js

const COMEDY_TEMPLATE = `\u{1f3ad} Comedy Break! You've been working hard — take a quick breather.

Tell a short, witty developer joke CATEGORY_LINE

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
- After the joke, continue with your actual work as normal.`;

const SITUATIONAL_LINE = 'related to: CATEGORY';
const SURPRISE_LINE = 'about anything — surprise me.';

function buildPrompt(category, isRepetitive) {
  const categoryLine = isRepetitive ? SURPRISE_LINE : SITUATIONAL_LINE.replace('CATEGORY', category);
  return COMEDY_TEMPLATE.replace('CATEGORY_LINE', categoryLine);
}

function buildOutputJson(prompt) {
  return JSON.stringify({ hookSpecificOutput: { additionalContext: prompt } });
}

module.exports = { buildPrompt, buildOutputJson };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/prompt.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/prompt.js test/prompt.test.js
git commit -m "Add comedy prompt builder with mood bubble template"
```

---

### Task 6: Engine Entry Point (Integration)

**Files:**
- Create: `test/engine.test.js`
- Create: `src/engine.js`

- [ ] **Step 1: Write failing integration tests**

The engine reads stdin, so tests spawn it as a child process and pipe input.

```js
// test/engine.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ENGINE_PATH = path.join(__dirname, '..', 'src', 'engine.js');

function runEngine(stdinData, env = {}) {
  try {
    const result = execFileSync('node', [ENGINE_PATH], {
      input: JSON.stringify(stdinData),
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 5000,
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', exitCode: err.status };
  }
}

describe('engine', () => {
  let tmpDir;
  let statePath;
  let configPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-engine-test-'));
    statePath = path.join(tmpDir, 'state.json');
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits silently when cooldown has not elapsed', () => {
    const recentState = { lastJokeAt: Date.now(), recentCategories: [], jokeCount: 1 };
    fs.writeFileSync(statePath, JSON.stringify(recentState));
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: true }));

    const { stdout, exitCode } = runEngine(
      { hook_event_name: 'PostToolBatch', tool_calls: [] },
      { CLAUDE_COMEDY_STATE_PATH: statePath, CLAUDE_COMEDY_CONFIG_PATH: configPath },
    );
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(stdout, '');
  });

  it('outputs additionalContext JSON when cooldown has elapsed', () => {
    const oldState = { lastJokeAt: 0, recentCategories: [], jokeCount: 0 };
    fs.writeFileSync(statePath, JSON.stringify(oldState));
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: true }));

    const { stdout, exitCode } = runEngine(
      { hook_event_name: 'PostToolBatch', tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'git log' } }] },
      { CLAUDE_COMEDY_STATE_PATH: statePath, CLAUDE_COMEDY_CONFIG_PATH: configPath },
    );
    assert.strictEqual(exitCode, 0);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.hookSpecificOutput.additionalContext.includes('Comedy Break'));
    assert.ok(parsed.hookSpecificOutput.additionalContext.includes('git'));
  });

  it('exits silently when disabled', () => {
    fs.writeFileSync(statePath, JSON.stringify({ lastJokeAt: 0, recentCategories: [], jokeCount: 0 }));
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: false }));

    const { stdout, exitCode } = runEngine(
      { hook_event_name: 'PostToolBatch', tool_calls: [] },
      { CLAUDE_COMEDY_STATE_PATH: statePath, CLAUDE_COMEDY_CONFIG_PATH: configPath },
    );
    assert.strictEqual(exitCode, 0);
    assert.strictEqual(stdout, '');
  });

  it('updates state file after delivering a joke', () => {
    fs.writeFileSync(statePath, JSON.stringify({ lastJokeAt: 0, recentCategories: [], jokeCount: 0 }));
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: true }));

    runEngine(
      { hook_event_name: 'SubagentStart' },
      { CLAUDE_COMEDY_STATE_PATH: statePath, CLAUDE_COMEDY_CONFIG_PATH: configPath },
    );

    const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(updatedState.jokeCount, 1);
    assert.deepStrictEqual(updatedState.recentCategories, ['delegation']);
    assert.ok(updatedState.lastJokeAt > 0);
  });

  it('uses surprise mode when category is repetitive', () => {
    const state = { lastJokeAt: 0, recentCategories: ['git', 'git', 'testing'], jokeCount: 5 };
    fs.writeFileSync(statePath, JSON.stringify(state));
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: true }));

    const { stdout } = runEngine(
      { hook_event_name: 'PostToolBatch', tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'git diff' } }] },
      { CLAUDE_COMEDY_STATE_PATH: statePath, CLAUDE_COMEDY_CONFIG_PATH: configPath },
    );
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.hookSpecificOutput.additionalContext.includes('surprise'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/engine.test.js`
Expected: FAIL — engine.js doesn't exist or crashes

- [ ] **Step 3: Implement engine entry point**

```js
#!/usr/bin/env node
// src/engine.js

const { readConfig, CONFIG_PATH } = require('./config.js');
const { readState, writeState, isCooldownElapsed, isRepetitive, updateState, STATE_PATH } = require('./state.js');
const { classify } = require('./classifier.js');
const { buildPrompt, buildOutputJson } = require('./prompt.js');

const configPath = process.env.CLAUDE_COMEDY_CONFIG_PATH || CONFIG_PATH;
const statePath = process.env.CLAUDE_COMEDY_STATE_PATH || STATE_PATH;

const config = readConfig(configPath);
if (!config.enabled) process.exit(0);

const state = readState(statePath);
if (!isCooldownElapsed(state, config.cooldown_minutes)) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const hookInput = JSON.parse(input);
    const category = classify(hookInput);
    const repetitive = isRepetitive(state, category);
    const prompt = buildPrompt(category, repetitive);

    process.stdout.write(buildOutputJson(prompt));

    const updatedState = updateState(state, category);
    try {
      writeState(statePath, updatedState);
    } catch {
      // state write failure is non-fatal — joke still delivered
    }
  } catch {
    // malformed stdin — exit silently, never block Claude
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/engine.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "Add engine entry point orchestrating cooldown, classification, and injection"
```

---

### Task 7: CLI

**Files:**
- Create: `test/cli.test.js`
- Create: `bin/cli.js`

- [ ] **Step 1: Write failing tests for CLI**

```js
// test/cli.test.js
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');

function runCli(args, env = {}) {
  try {
    const result = execFileSync('node', [CLI_PATH, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 5000,
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

describe('cli', () => {
  let tmpDir;
  let statePath;
  let configPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-cli-test-'));
    statePath = path.join(tmpDir, 'state.json');
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('config shows defaults when no config file exists', () => {
    const { stdout } = runCli(['config'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    assert.ok(stdout.includes('cooldown_minutes'));
    assert.ok(stdout.includes('5'));
    assert.ok(stdout.includes('enabled'));
  });

  it('config --cooldown sets cooldown', () => {
    runCli(['config', '--cooldown', '10'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.strictEqual(config.cooldown_minutes, 10);
  });

  it('config --disable disables', () => {
    runCli(['config', '--disable'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.strictEqual(config.enabled, false);
  });

  it('config --enable enables', () => {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ cooldown_minutes: 5, enabled: false }));
    runCli(['config', '--enable'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.strictEqual(config.enabled, true);
  });

  it('stats shows joke count', () => {
    fs.writeFileSync(statePath, JSON.stringify({ lastJokeAt: 1000, recentCategories: ['git'], jokeCount: 42 }));
    const { stdout } = runCli(['stats'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    assert.ok(stdout.includes('42'));
  });

  it('reset clears state', () => {
    fs.writeFileSync(statePath, JSON.stringify({ lastJokeAt: 1000, recentCategories: ['git'], jokeCount: 42 }));
    runCli(['reset'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.strictEqual(state.jokeCount, 0);
    assert.deepStrictEqual(state.recentCategories, []);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/cli.test.js`
Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement CLI**

```js
#!/usr/bin/env node
// bin/cli.js

const { readConfig, writeConfig, CONFIG_PATH, DEFAULTS } = require('../src/config.js');
const { readState, writeState, STATE_PATH } = require('../src/state.js');

const configPath = process.env.CLAUDE_COMEDY_CONFIG_PATH || CONFIG_PATH;
const statePath = process.env.CLAUDE_COMEDY_STATE_PATH || STATE_PATH;

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'config': {
    const config = readConfig(configPath);
    const cooldownIdx = args.indexOf('--cooldown');
    const hasDisable = args.includes('--disable');
    const hasEnable = args.includes('--enable');

    if (cooldownIdx === -1 && !hasDisable && !hasEnable) {
      console.log('\n  \u{1f3ad} Claude Comedy Config\n');
      console.log(`  cooldown_minutes: ${config.cooldown_minutes}`);
      console.log(`  enabled:          ${config.enabled}`);
      console.log(`  config file:      ${configPath}\n`);
      break;
    }

    if (cooldownIdx !== -1) {
      const value = parseInt(args[cooldownIdx + 1], 10);
      if (isNaN(value) || value < 1) {
        console.error('Error: --cooldown requires a positive integer (minutes)');
        process.exit(1);
      }
      config.cooldown_minutes = value;
    }
    if (hasDisable) config.enabled = false;
    if (hasEnable) config.enabled = true;

    writeConfig(configPath, config);
    console.log('\n  \u{1f3ad} Config updated!\n');
    console.log(`  cooldown_minutes: ${config.cooldown_minutes}`);
    console.log(`  enabled:          ${config.enabled}\n`);
    break;
  }

  case 'stats': {
    const state = readState(statePath);
    const config = readConfig(configPath);
    console.log('\n  \u{1f3ad} Claude Comedy Stats\n');
    console.log(`  Jokes delivered:  ${state.jokeCount}`);
    console.log(`  Cooldown:         ${config.cooldown_minutes} minutes`);
    console.log(`  Status:           ${config.enabled ? 'enabled' : 'disabled'}`);
    if (state.lastJokeAt > 0) {
      const ago = Math.round((Date.now() - state.lastJokeAt) / 60000);
      console.log(`  Last joke:        ${ago} minute${ago === 1 ? '' : 's'} ago`);
    }
    console.log();
    break;
  }

  case 'reset': {
    const freshState = { lastJokeAt: 0, recentCategories: [], jokeCount: 0 };
    writeState(statePath, freshState);
    console.log('\n  \u{1f3ad} State reset! Counter back to zero.\n');
    break;
  }

  default: {
    console.log(`
  \u{1f3ad} Claude Comedy — Developer humor for Claude Code

  Usage:
    claude-comedy config                  Show current config
    claude-comedy config --cooldown <N>   Set cooldown to N minutes
    claude-comedy config --enable         Enable comedy
    claude-comedy config --disable        Disable comedy
    claude-comedy stats                   Show joke stats
    claude-comedy reset                   Reset state and counter
`);
    break;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/cli.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add bin/cli.js test/cli.test.js
git commit -m "Add CLI for config, stats, and reset commands"
```

---

### Task 8: Skill Definition

**Files:**
- Create: `skills/config/SKILL.md`

- [ ] **Step 1: Create the skill markdown**

```markdown
---
name: config
description: Configure Claude Comedy plugin settings — cooldown, enable/disable, stats, reset
---

The user wants to configure Claude Comedy. Use the `claude-comedy` CLI to handle their request.

**Available commands:**

| Request | Command |
|---|---|
| Show config | `claude-comedy config` |
| Set cooldown to N minutes | `claude-comedy config --cooldown N` |
| Enable comedy | `claude-comedy config --enable` |
| Disable comedy | `claude-comedy config --disable` |
| Show stats | `claude-comedy stats` |
| Reset counter | `claude-comedy reset` |

Run the appropriate command via Bash based on what the user asked for. Show them the output.
```

- [ ] **Step 2: Commit**

```bash
git add skills/config/SKILL.md
git commit -m "Add config skill for in-conversation configuration"
```

---

### Task 9: Install/Uninstall Scripts

**Files:**
- Create: `scripts/postinstall.js`
- Create: `scripts/preuninstall.js`

- [ ] **Step 1: Create postinstall script**

```js
#!/usr/bin/env node
// scripts/postinstall.js

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const pluginsDir = path.join(os.homedir(), '.claude', 'plugins');
const linkPath = path.join(pluginsDir, 'claude-comedy');
const targetPath = path.resolve(__dirname, '..');

try {
  fs.mkdirSync(pluginsDir, { recursive: true });

  try {
    const existing = fs.readlinkSync(linkPath);
    if (existing === targetPath) {
      console.log('\n  \u{1f3ad} Claude Comedy is already registered.\n');
      process.exit(0);
    }
    fs.unlinkSync(linkPath);
  } catch {
    // link doesn't exist — that's fine
  }

  fs.symlinkSync(targetPath, linkPath, 'junction');
  console.log('\n  \u{1f3ad} Claude Comedy installed! Jokes will appear in your next Claude Code session.\n');
} catch (err) {
  console.log(`
  \u{1f3ad} Claude Comedy — manual setup needed:

  Could not create symlink automatically (${err.code || err.message}).

  To register the plugin manually, run:

    ${process.platform === 'win32'
      ? `mklink /J "${linkPath}" "${targetPath}"`
      : `ln -s "${targetPath}" "${linkPath}"`
    }

  Then restart Claude Code.
`);
}
```

- [ ] **Step 2: Create preuninstall script**

```js
#!/usr/bin/env node
// scripts/preuninstall.js

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const linkPath = path.join(os.homedir(), '.claude', 'plugins', 'claude-comedy');

try {
  const stat = fs.lstatSync(linkPath);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    fs.unlinkSync(linkPath);
    console.log('\n  \u{1f3ad} Claude Comedy unregistered. No more jokes — for now.\n');
  }
} catch {
  // link doesn't exist — nothing to clean up
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/postinstall.js scripts/preuninstall.js
git commit -m "Add postinstall/preuninstall scripts for plugin registration"
```

---

### Task 10: LICENSE and README

**Files:**
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Create MIT LICENSE**

```
MIT License

Copyright (c) 2026 dpk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create README.md**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE README.md
git commit -m "Add MIT license and README"
```

---

### Task 11: Run Full Test Suite and Verify

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All test files pass — config, state, classifier, prompt, engine, cli

- [ ] **Step 2: Verify CLI works end-to-end**

Run: `node bin/cli.js` (no args — should print help)
Expected: Prints usage help with all commands listed

Run: `node bin/cli.js config`
Expected: Prints default config (cooldown: 5, enabled: true)

Run: `node bin/cli.js stats`
Expected: Prints stats (jokes: 0)

- [ ] **Step 3: Verify engine works with piped input**

Run: `echo '{"hook_event_name":"PostToolBatch","tool_calls":[{"tool_name":"Bash","tool_input":{"command":"git status"}}]}' | node src/engine.js`
Expected: Outputs JSON with `hookSpecificOutput.additionalContext` containing "Comedy Break" and "git"

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "Fix issues found during integration verification"
```

Only commit if changes were needed. Skip if everything passed clean.
