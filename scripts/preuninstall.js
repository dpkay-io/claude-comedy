#!/usr/bin/env node

const { unregister } = require('../src/registration.js');

try {
  const { removed } = unregister();
  if (removed) {
    console.log('\n  \u{1f3ad} Claude Comedy unregistered. No more jokes — for now.\n');
  }
} catch {
  // best-effort — don't block npm uninstall
}
