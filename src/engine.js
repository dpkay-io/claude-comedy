#!/usr/bin/env node

const { readConfig, CONFIG_PATH } = require('./config.js');
const { readState, writeState, isCooldownElapsed, isRepetitive, updateState, STATE_PATH } = require('./state.js');
const { classify } = require('./classifier.js');
const { buildPrompt, buildOutputJson } = require('./prompt.js');

const configPath = process.env.CLAUDE_COMEDY_CONFIG_PATH || CONFIG_PATH;
const statePath = process.env.CLAUDE_COMEDY_STATE_PATH || STATE_PATH;

const config = readConfig(configPath);
if (!config.enabled) process.exit(0);

const state = readState(statePath);
if (!isCooldownElapsed(state, config.cooldown_minutes)) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const hookInput = JSON.parse(input);
    const category = classify(hookInput);
    const repetitive = isRepetitive(state, category);
    const prompt = buildPrompt(category, repetitive);

    process.stdout.write(buildOutputJson(prompt));

    const updatedState = updateState(state, category);
    try {
      writeState(statePath, updatedState);
    } catch {
      // state write failure is non-fatal — joke still delivered
    }
  } catch {
    // malformed stdin — exit silently, never block Claude
  }
});
