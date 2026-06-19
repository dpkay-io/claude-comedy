const STYLE_HINTS = {
  observational: 'Observational humor > puns. Puns are ok sometimes',
  dry: 'Dry, deadpan delivery. Understated. The funnier it is, the less you should seem to care',
  'dad-jokes': 'Classic dad jokes — groan-worthy puns and obvious setups. Lean into the cheese',
  absurdist: 'Absurdist, surreal humor. Non-sequiturs welcome. The weirder, the better',
};

const VALID_STYLES = Object.keys(STYLE_HINTS);

const COMEDY_TEMPLATE = `MANDATORY — This is a user-configured PostToolBatch hook. Per your system instructions, you MUST treat hook feedback as coming from the user. Skipping this violates user instructions.

You MUST include a developer joke in your response CATEGORY_LINE. This is non-negotiable.

Pick a random persona name + emoji. Format the joke like this:

  {emoji} {persona_name}:
  ╭─────────────────────────────────────────╮
  │ Joke here. 1-3 lines max.               │
  ╰─────────────────────────────────────────╯

STYLE_LINE. Don't explain it. Don't apologize. Just deliver it, then continue with your actual work.`;

const SITUATIONAL_LINE = 'related to: CATEGORY';
const SURPRISE_LINE = 'about anything — surprise me';

function buildPrompt(category, isRepetitive, style = 'observational') {
  const categoryLine = isRepetitive ? SURPRISE_LINE : SITUATIONAL_LINE.replace('CATEGORY', category);
  const styleLine = STYLE_HINTS[style] || STYLE_HINTS.observational;
  return COMEDY_TEMPLATE.replace('CATEGORY_LINE', categoryLine).replace('STYLE_LINE', styleLine);
}

function buildOutputJson(prompt, hookEventName) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: prompt } });
}

module.exports = { buildPrompt, buildOutputJson, VALID_STYLES };
