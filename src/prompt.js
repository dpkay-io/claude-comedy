const COMEDY_TEMPLATE = `\u{1F3AD} Comedy Break! You've been working hard — take a quick breather.

Tell a short, witty developer joke CATEGORY_LINE

Format it EXACTLY like this (use box-drawing characters):

  {emoji} {persona_name}:
  ╭─────────────────────────────────────────╮
  │ Your joke text here.                    │
  │ Can be 1-3 lines, keep it tight.        │
  ╰─────────────────────────────────────────╯

Rules:
- Pick a random fun persona name and matching emoji each time
- The joke should feel human — like a coworker cracking wise
- Observational humor > puns. Puns are ok sometimes.
- Never repeat the same joke structure twice in a row
- Keep it under 3 lines inside the box
- Don't explain the joke. Don't apologize. Just deliver it.
- After the joke, continue with your actual work as normal.`;

const SITUATIONAL_LINE = 'related to: CATEGORY';
const SURPRISE_LINE = 'about anything — surprise me.';

function buildPrompt(category, isRepetitive) {
  const categoryLine = isRepetitive ? SURPRISE_LINE : SITUATIONAL_LINE.replace('CATEGORY', category);
  return COMEDY_TEMPLATE.replace('CATEGORY_LINE', categoryLine);
}

function buildOutputJson(prompt, hookEventName) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: prompt } });
}

module.exports = { buildPrompt, buildOutputJson };
