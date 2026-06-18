#!/usr/bin/env node

const { readConfig, writeConfig, CONFIG_PATH, DEFAULTS } = require('../src/config.js');
const { readState, writeState, STATE_PATH } = require('../src/state.js');

const configPath = process.env.CLAUDE_COMEDY_CONFIG_PATH || CONFIG_PATH;
const statePath = process.env.CLAUDE_COMEDY_STATE_PATH || STATE_PATH;

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'config': {
    const config = readConfig(configPath);
    const cooldownIdx = args.indexOf('--cooldown');
    const hasDisable = args.includes('--disable');
    const hasEnable = args.includes('--enable');

    if (cooldownIdx === -1 && !hasDisable && !hasEnable) {
      console.log('\n  \u{1f3ad} Claude Comedy Config\n');
      console.log(`  cooldown_minutes: ${config.cooldown_minutes}`);
      console.log(`  enabled:          ${config.enabled}`);
      console.log(`  config file:      ${configPath}\n`);
      break;
    }

    if (cooldownIdx !== -1) {
      const value = parseInt(args[cooldownIdx + 1], 10);
      if (isNaN(value) || value < 1) {
        console.error('Error: --cooldown requires a positive integer (minutes)');
        process.exit(1);
      }
      config.cooldown_minutes = value;
    }
    if (hasDisable) config.enabled = false;
    if (hasEnable) config.enabled = true;

    writeConfig(configPath, config);
    console.log('\n  \u{1f3ad} Config updated!\n');
    console.log(`  cooldown_minutes: ${config.cooldown_minutes}`);
    console.log(`  enabled:          ${config.enabled}\n`);
    break;
  }

  case 'stats': {
    const state = readState(statePath);
    const config = readConfig(configPath);
    console.log('\n  \u{1f3ad} Claude Comedy Stats\n');
    console.log(`  Jokes delivered:  ${state.jokeCount}`);
    console.log(`  Cooldown:         ${config.cooldown_minutes} minutes`);
    console.log(`  Status:           ${config.enabled ? 'enabled' : 'disabled'}`);
    if (state.lastJokeAt > 0) {
      const ago = Math.round((Date.now() - state.lastJokeAt) / 60000);
      console.log(`  Last joke:        ${ago} minute${ago === 1 ? '' : 's'} ago`);
    }
    console.log();
    break;
  }

  case 'reset': {
    const freshState = { lastJokeAt: 0, recentCategories: [], jokeCount: 0 };
    writeState(statePath, freshState);
    console.log('\n  \u{1f3ad} State reset! Counter back to zero.\n');
    break;
  }

  default: {
    console.log(`
  \u{1f3ad} Claude Comedy — Developer humor for Claude Code

  Usage:
    claude-comedy config                  Show current config
    claude-comedy config --cooldown <N>   Set cooldown to N minutes
    claude-comedy config --enable         Enable comedy
    claude-comedy config --disable        Disable comedy
    claude-comedy stats                   Show joke stats
    claude-comedy reset                   Reset state and counter
`);
    break;
  }
}
