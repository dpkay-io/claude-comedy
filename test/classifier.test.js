const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('classify', () => {
  const { classify } = require('../src/classifier.js');

  it('returns "delegation" for SubagentStart events', () => {
    const input = { hook_event_name: 'SubagentStart' };
    assert.strictEqual(classify(input), 'delegation');
  });

  it('returns "git" for Bash tool with git commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'git status' } }],
    };
    assert.strictEqual(classify(input), 'git');
  });

  it('returns "testing" for test runner commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npm test' } }],
    };
    assert.strictEqual(classify(input), 'testing');
  });

  it('returns "testing" for jest', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npx jest --coverage' } }],
    };
    assert.strictEqual(classify(input), 'testing');
  });

  it('returns "deployment" for docker commands', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'docker build -t myapp .' } }],
    };
    assert.strictEqual(classify(input), 'deployment');
  });

  it('returns "dependencies" for npm install', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'npm install lodash' } }],
    };
    assert.strictEqual(classify(input), 'dependencies');
  });

  it('returns "build" for tsc', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Bash', tool_input: { command: 'tsc --build' } }],
    };
    assert.strictEqual(classify(input), 'build');
  });

  it('returns "debugging" for Grep tool', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Grep', tool_input: { pattern: 'error' } }],
    };
    assert.strictEqual(classify(input), 'debugging');
  });

  it('returns "refactoring" for multiple Edit calls', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [
        { tool_name: 'Edit', tool_input: { file_path: 'a.js' } },
        { tool_name: 'Edit', tool_input: { file_path: 'b.js' } },
      ],
    };
    assert.strictEqual(classify(input), 'refactoring');
  });

  it('returns "general" when nothing matches', () => {
    const input = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Read', tool_input: { file_path: 'foo.txt' } }],
    };
    assert.strictEqual(classify(input), 'general');
  });

  it('returns "general" for empty tool_calls', () => {
    const input = { hook_event_name: 'PostToolBatch', tool_calls: [] };
    assert.strictEqual(classify(input), 'general');
  });

  it('returns "general" for missing tool_calls', () => {
    const input = { hook_event_name: 'PostToolBatch' };
    assert.strictEqual(classify(input), 'general');
  });
});
