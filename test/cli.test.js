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
