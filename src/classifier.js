const BASH_CATEGORIES = [
  { category: 'git', patterns: [/\bgit\s/] },
  { category: 'testing', patterns: [/\btest\b/, /\bjest\b/, /\bpytest\b/, /\bvitest\b/, /\bmocha\b/, /\bcargo\s+test\b/, /\bgo\s+test\b/] },
  { category: 'deployment', patterns: [/\bdeploy\b/, /\bdocker\b/, /\bkubectl\b/, /\bhelm\b/, /\bterraform\b/] },
  { category: 'dependencies', patterns: [/\bnpm\s+install\b/, /\bnpm\s+i\b/, /\byarn\s+add\b/, /\bpip\s+install\b/, /\bcargo\s+add\b/, /\bpnpm\s+add\b/] },
  { category: 'build', patterns: [/\btsc\b/, /\bnpm\s+run\s+build\b/, /\bmake\b/, /\bcargo\s+build\b/, /\bgo\s+build\b/, /\bgradle\b/, /\bmvn\b/] },
];

const DEBUGGING_TOOLS = new Set(['Grep', 'Glob']);

function classify(input) {
  if (input.hook_event_name === 'SubagentStart') return 'delegation';

  const toolCalls = input.tool_calls || [];
  if (toolCalls.length === 0) return 'general';

  const editWriteCount = toolCalls.filter(t => t.tool_name === 'Edit' || t.tool_name === 'Write').length;
  if (editWriteCount >= 2) return 'refactoring';

  for (const call of toolCalls) {
    if (call.tool_name === 'Bash' || call.tool_name === 'PowerShell') {
      const cmd = (call.tool_input && call.tool_input.command) || '';
      for (const { category, patterns } of BASH_CATEGORIES) {
        if (patterns.some(p => p.test(cmd))) return category;
      }
    }

    if (DEBUGGING_TOOLS.has(call.tool_name)) return 'debugging';
  }

  return 'general';
}

module.exports = { classify };
