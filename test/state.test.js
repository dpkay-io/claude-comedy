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
