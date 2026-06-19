const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATE_PATH = path.join(os.homedir(), '.config', 'claude-comedy', 'state.json');

const STATE_DEFAULTS = Object.freeze({ lastJokeAt: 0, recentCategories: [], jokeCount: 0 });

function readState(filePath = STATE_PATH) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      lastJokeAt: raw.lastJokeAt ?? STATE_DEFAULTS.lastJokeAt,
      recentCategories: raw.recentCategories ?? [],
      jokeCount: raw.jokeCount ?? STATE_DEFAULTS.jokeCount,
    };
  } catch {
    return { ...STATE_DEFAULTS, recentCategories: [] };
  }
}

function writeState(filePath = STATE_PATH, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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
