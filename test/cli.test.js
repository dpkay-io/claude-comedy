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
      input: '',
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
  let pluginsDir;
  let settingsPath;

  function registrationEnv() {
    return { CLAUDE_COMEDY_PLUGINS_DIR: pluginsDir, CLAUDE_COMEDY_SETTINGS_PATH: settingsPath };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comedy-cli-test-'));
    statePath = path.join(tmpDir, 'state.json');
    configPath = path.join(tmpDir, 'config.json');
    pluginsDir = path.join(tmpDir, 'plugins');
    settingsPath = path.join(tmpDir, 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('setup registers the plugin', () => {
    const { stdout } = runCli(['setup'], registrationEnv());
    assert.ok(stdout.includes('registered'));
  });

  it('setup creates entry in installed_plugins.json', () => {
    runCli(['setup'], registrationEnv());
    const installed = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'installed_plugins.json'), 'utf8'));
    assert.ok(installed.plugins['claude-comedy@claude-comedy-local']);
    assert.strictEqual(installed.plugins['claude-comedy@claude-comedy-local'][0].scope, 'user');
  });

  it('setup registers marketplace in known_marketplaces.json', () => {
    runCli(['setup'], registrationEnv());
    const known = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'known_marketplaces.json'), 'utf8'));
    assert.ok(known['claude-comedy-local']);
    assert.strictEqual(known['claude-comedy-local'].source.source, 'directory');
  });

  it('setup enables in settings.json with marketplace', () => {
    runCli(['setup'], registrationEnv());
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(settings.enabledPlugins['claude-comedy@claude-comedy-local'], true);
    assert.ok(settings.extraKnownMarketplaces['claude-comedy-local']);
  });

  it('setup is idempotent', () => {
    runCli(['setup'], registrationEnv());
    const { stdout } = runCli(['setup'], registrationEnv());
    assert.ok(stdout.includes('already registered'));
  });

  it('unsetup removes registration', () => {
    runCli(['setup'], registrationEnv());
    const { stdout } = runCli(['unsetup'], registrationEnv());
    assert.ok(stdout.includes('unregistered'));
  });

  it('unsetup removes from installed_plugins.json', () => {
    runCli(['setup'], registrationEnv());
    runCli(['unsetup'], registrationEnv());
    const installed = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'installed_plugins.json'), 'utf8'));
    assert.strictEqual(installed.plugins['claude-comedy@claude-comedy-local'], undefined);
  });

  it('unsetup removes marketplace from known_marketplaces.json', () => {
    runCli(['setup'], registrationEnv());
    runCli(['unsetup'], registrationEnv());
    const known = JSON.parse(fs.readFileSync(path.join(pluginsDir, 'known_marketplaces.json'), 'utf8'));
    assert.strictEqual(known['claude-comedy-local'], undefined);
  });

  it('unsetup removes from settings.json', () => {
    runCli(['setup'], registrationEnv());
    runCli(['unsetup'], registrationEnv());
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(settings.enabledPlugins['claude-comedy@claude-comedy-local'], undefined);
    assert.strictEqual(settings.extraKnownMarketplaces['claude-comedy-local'], undefined);
  });

  it('unsetup when not registered shows not registered', () => {
    const { stdout } = runCli(['unsetup'], registrationEnv());
    assert.ok(stdout.includes('not currently registered'));
  });

  it('default help shows registration status', () => {
    const { stdout } = runCli([], registrationEnv());
    assert.ok(stdout.includes('Status:'));
    assert.ok(stdout.includes('claude-comedy setup'));
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

  it('config --style sets humor style', () => {
    runCli(['config', '--style', 'dry'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.strictEqual(config.style, 'dry');
  });

  it('config --style rejects invalid values', () => {
    const { exitCode, stderr } = runCli(['config', '--style', 'slapstick'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    assert.strictEqual(exitCode, 1);
    assert.ok(stderr.includes('--style must be one of'));
  });

  it('config shows style in output', () => {
    const { stdout } = runCli(['config'], {
      CLAUDE_COMEDY_CONFIG_PATH: configPath,
      CLAUDE_COMEDY_STATE_PATH: statePath,
    });
    assert.ok(stdout.includes('style:'));
    assert.ok(stdout.includes('observational'));
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
