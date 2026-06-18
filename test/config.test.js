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
