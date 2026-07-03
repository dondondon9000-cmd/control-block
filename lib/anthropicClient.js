import Anthropic from '@anthropic-ai/sdk';

let client;

export function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const MODEL = 'claude-haiku-4-5';

// Forces the model to respond via a single tool call and returns the parsed input.
export async function callWithTool({ system, messages, tool, maxTokens = 1024 }) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Model did not return a tool_use block');
  }
  return toolUse.input;
}
