#!/usr/bin/env node

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
