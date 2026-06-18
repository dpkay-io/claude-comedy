const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SKILLS_DIR = process.env.CLAUDE_COMEDY_SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
const LINK_PATH = path.join(SKILLS_DIR, 'claude-comedy');
const PACKAGE_ROOT = path.resolve(__dirname, '..');

function isRegistered() {
  try {
    const stat = fs.lstatSync(LINK_PATH);
    if (!stat.isSymbolicLink() && !stat.isDirectory()) return false;
    return fs.realpathSync(LINK_PATH) === fs.realpathSync(PACKAGE_ROOT);
  } catch {
    return false;
  }
}

function register() {
  if (isRegistered()) return { alreadyRegistered: true };

  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  try {
    fs.lstatSync(LINK_PATH);
    fs.unlinkSync(LINK_PATH);
  } catch {
    // doesn't exist — fine
  }

  fs.symlinkSync(PACKAGE_ROOT, LINK_PATH, 'junction');
  return { alreadyRegistered: false };
}

function unregister() {
  try {
    const stat = fs.lstatSync(LINK_PATH);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      fs.unlinkSync(LINK_PATH);
      return { removed: true };
    }
  } catch {
    // doesn't exist — nothing to do
  }
  return { removed: false };
}

module.exports = { isRegistered, register, unregister, LINK_PATH, PACKAGE_ROOT };
