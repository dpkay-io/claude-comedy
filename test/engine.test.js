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
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolBatch');
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
