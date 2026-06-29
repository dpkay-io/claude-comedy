const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('buildPrompt', () => {
  const { buildPrompt } = require('../src/prompt.js');

  it('includes the category when variety is 0 and not repetitive', () => {
    const prompt = buildPrompt('git', false, 'observational', 0);
    assert.ok(prompt.includes('related to: git'));
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

  it('uses a freestyle topic when repetitive', () => {
    const prompt = buildPrompt('git', true, 'observational', 0);
    assert.ok(!prompt.includes('related to: git'));
    assert.ok(prompt.includes('related to:'));
  });

  it('always goes freestyle when variety is 100', () => {
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      const prompt = buildPrompt('git', false, 'observational', 100);
      if (prompt.includes('related to: git')) results.add('category');
      else results.add('freestyle');
    }
    assert.ok(!results.has('category'));
  });

  it('never goes freestyle when variety is 0 and not repetitive', () => {
    for (let i = 0; i < 20; i++) {
      const prompt = buildPrompt('git', false, 'observational', 0);
      assert.ok(prompt.includes('related to: git'));
    }
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

describe('FREESTYLE_TOPICS', () => {
  const { FREESTYLE_TOPICS } = require('../src/prompt.js');

  it('has a non-empty array of topics', () => {
    assert.ok(Array.isArray(FREESTYLE_TOPICS));
    assert.ok(FREESTYLE_TOPICS.length > 5);
  });
});

describe('shouldFreestyle', () => {
  const { shouldFreestyle } = require('../src/prompt.js');

  it('always returns false when variety is 0', () => {
    for (let i = 0; i < 50; i++) {
      assert.strictEqual(shouldFreestyle(0), false);
    }
  });

  it('always returns true when variety is 100', () => {
    for (let i = 0; i < 50; i++) {
      assert.strictEqual(shouldFreestyle(100), true);
    }
  });
});
