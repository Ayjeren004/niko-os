import ollama from 'ollama';

interface ExtractionResult {
  shouldSave: boolean;
  fact: string;
}

const EXTRACTOR_MODEL = 'llama3.2';

export async function extractMemory(userMessage: string, existingMemories: string[]): Promise<ExtractionResult | null> {
  const memoryContext = existingMemories.length > 0
    ? `\nHere are the existing facts you already know about the user. DO NOT extract these again:\n` + existingMemories.map(m => `- ${m}`).join('\n')
    : '\nYou currently have no existing facts about the user.';

  const prompt = `You are a memory extraction pipeline. Your job is to extract useful, long-term facts about the user from their message.
Examples of useful facts: their preferences, projects, goals, routines, long-term plans, or important personal details.
DO NOT save: random one-time messages, temporary feelings, or duplicate information.

${memoryContext}

User Message: "${userMessage}"

Analyze the User Message. If it contains a NEW useful long-term fact about the user, set "shouldSave" to true and write the fact concisely in the "fact" field (e.g. "User's favorite color is blue"). If it does not contain a new useful fact, set "shouldSave" to false and leave "fact" empty.

Respond ONLY with a valid JSON object matching this schema:
{
  "shouldSave": boolean,
  "fact": string
}
`;

  try {
    const response = await ollama.generate({
      model: EXTRACTOR_MODEL,
      prompt: prompt,
      format: 'json',
      stream: false,
    });

    const parsed = JSON.parse(response.response) as ExtractionResult;
    
    // Basic validation
    if (typeof parsed.shouldSave === 'boolean' && typeof parsed.fact === 'string') {
      let cleanedFact = parsed.fact.trim();
      if (cleanedFact.startsWith('{') && cleanedFact.endsWith('}')) {
        try {
          const innerJson = JSON.parse(cleanedFact);
          if (innerJson.content && typeof innerJson.content === 'string') {
            cleanedFact = innerJson.content;
          } else if (innerJson.fact && typeof innerJson.fact === 'string') {
            cleanedFact = innerJson.fact;
          }
        } catch (e) {
          // Ignore parse errors, fallback to raw string
        }
      }
      parsed.fact = cleanedFact;
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error("Memory extraction failed:", error);
    return null;
  }
}
