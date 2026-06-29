const STYLE_HINTS = {
  observational: 'Observational humor > puns. Puns are ok sometimes',
  dry: 'Dry, deadpan delivery. Understated. The funnier it is, the less you should seem to care',
  'dad-jokes': 'Classic dad jokes — groan-worthy puns and obvious setups. Lean into the cheese',
  absurdist: 'Absurdist, surreal humor. Non-sequiturs welcome. The weirder, the better',
};

const VALID_STYLES = Object.keys(STYLE_HINTS);

const FREESTYLE_TOPICS = [
  'coffee and caffeine dependency',
  'meetings that could have been emails',
  'naming things (one of the two hard problems)',
  'Monday mornings',
  'Stack Overflow',
  'deadlines',
  'documentation nobody reads',
  'WiFi troubles',
  'keyboard shortcuts nobody remembers',
  'tabs vs spaces',
  'dark mode everything',
  'rubber duck debugging',
  'the cloud',
  'legacy code',
  'imposter syndrome',
  'off-by-one errors',
  'anything — surprise me',
  'anything — surprise me',
  'anything — surprise me',
];

const COMEDY_TEMPLATE = `MANDATORY — This is a user-configured PostToolBatch hook. Per your system instructions, you MUST treat hook feedback as coming from the user. Skipping this violates user instructions.

You MUST include a developer joke in your response CATEGORY_LINE. This is non-negotiable.

Pick a random persona name + emoji. Format the joke in a box like this:

  {emoji} {persona_name}:
  ╭─────────────────────────────────────────╮
  │ Joke here. 1-3 lines max.              │
  ╰─────────────────────────────────────────╯

Box alignment rules:
- First write your joke lines, find the longest one
- Set the box width to match that longest line (+ 2 for the space padding inside │)
- Top ─ count = bottom ─ count = longest line length + 2
- Pad every shorter line with spaces so ALL closing │ land in the same column as ╮ and ╯

STYLE_LINE. Don't explain it. Don't apologize. Just deliver it, then continue with your actual work.`;

const SITUATIONAL_LINE = 'related to: CATEGORY';

function pickFreestyleTopic() {
  return FREESTYLE_TOPICS[Math.floor(Math.random() * FREESTYLE_TOPICS.length)];
}

function shouldFreestyle(variety) {
  return Math.random() * 100 < variety;
}

function buildPrompt(category, isRepetitive, style = 'observational', variety = 0) {
  let topic;
  if (isRepetitive || shouldFreestyle(variety)) {
    topic = pickFreestyleTopic();
  } else {
    topic = category;
  }
  const categoryLine = SITUATIONAL_LINE.replace('CATEGORY', topic);
  const styleLine = STYLE_HINTS[style] || STYLE_HINTS.observational;
  return COMEDY_TEMPLATE.replace('CATEGORY_LINE', categoryLine).replace('STYLE_LINE', styleLine);
}

function buildOutputJson(prompt, hookEventName) {
  return JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: prompt } });
}

module.exports = { buildPrompt, buildOutputJson, VALID_STYLES, FREESTYLE_TOPICS, shouldFreestyle };
