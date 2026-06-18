#!/usr/bin/env node

const { register } = require('../src/registration.js');

try {
  const { alreadyRegistered } = register();
  if (alreadyRegistered) {
    console.log('\n  \u{1f3ad} Claude Comedy is already registered.\n');
  } else {
    console.log('\n  \u{1f3ad} Claude Comedy installed! Jokes will appear in your next Claude Code session.\n');
  }
} catch (err) {
  console.log(`
  \u{1f3ad} Claude Comedy — manual setup needed:

  Could not create symlink automatically (${err.code || err.message}).

  Run this to register the plugin manually:

    claude-comedy setup

  Then restart Claude Code.
`);
}
