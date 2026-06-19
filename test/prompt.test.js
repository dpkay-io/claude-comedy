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

  it('includes mandatory hook framing', () => {
    const prompt = buildPrompt('deployment', false);
    assert.ok(prompt.includes('MANDATORY'));
    assert.ok(prompt.includes('user-configured'));
  });

  it('uses observational style by default', () => {
    const prompt = buildPrompt('git', false);
    assert.ok(prompt.includes('Observational humor'));
  });

  it('uses dry style when specified', () => {
    const prompt = buildPrompt('git', false, 'dry');
    assert.ok(prompt.includes('deadpan'));
    assert.ok(!prompt.includes('Observational'));
  });

  it('uses dad-jokes style when specified', () => {
    const prompt = buildPrompt('git', false, 'dad-jokes');
    assert.ok(prompt.includes('dad jokes'));
  });

  it('uses absurdist style when specified', () => {
    const prompt = buildPrompt('git', false, 'absurdist');
    assert.ok(prompt.includes('surreal'));
  });

  it('falls back to observational for unknown style', () => {
    const prompt = buildPrompt('git', false, 'unknown');
    assert.ok(prompt.includes('Observational humor'));
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

describe('VALID_STYLES', () => {
  const { VALID_STYLES } = require('../src/prompt.js');

  it('exports the list of valid style names', () => {
    assert.ok(VALID_STYLES.includes('observational'));
    assert.ok(VALID_STYLES.includes('dry'));
    assert.ok(VALID_STYLES.includes('dad-jokes'));
    assert.ok(VALID_STYLES.includes('absurdist'));
    assert.strictEqual(VALID_STYLES.length, 4);
  });
});
