const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CONFIG_PATH = path.join(os.homedir(), '.config', 'claude-comedy', 'config.json');

const DEFAULTS = Object.freeze({ cooldown_minutes: 5, enabled: true, style: 'observational', variety: 40 });
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
