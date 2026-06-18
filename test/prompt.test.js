const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('buildPrompt', () => {
  const { buildPrompt } = require('../src/prompt.js');

  it('includes the category in the prompt', () => {
    const prompt = buildPrompt('git', false);
    assert.ok(prompt.includes('git'));
  });

  it('includes mood bubble format instructions', () => {
    const prompt = buildPrompt('testing', false);
    assert.ok(prompt.includes('╭'));
    assert.ok(prompt.includes('╮'));
    assert.ok(prompt.includes('╰'));
    assert.ok(prompt.includes('╯'));
  });

  it('includes persona instructions', () => {
    const prompt = buildPrompt('general', false);
    assert.ok(prompt.includes('persona'));
    assert.ok(prompt.includes('emoji'));
  });

  it('switches to surprise mode when repetitive', () => {
    const prompt = buildPrompt('git', true);
    assert.ok(!prompt.includes('related to: git'));
    assert.ok(prompt.includes('surprise'));
  });

  it('includes the comedy break header', () => {
    const prompt = buildPrompt('deployment', false);
    assert.ok(prompt.includes('Comedy Break'));
  });
});

describe('buildOutputJson', () => {
  const { buildOutputJson } = require('../src/prompt.js');

  it('wraps prompt in hookSpecificOutput with hookEventName and additionalContext', () => {
    const json = buildOutputJson('test prompt', 'PostToolBatch');
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'PostToolBatch');
    assert.strictEqual(parsed.hookSpecificOutput.additionalContext, 'test prompt');
  });
});
