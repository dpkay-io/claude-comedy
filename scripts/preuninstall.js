#!/usr/bin/env node

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
