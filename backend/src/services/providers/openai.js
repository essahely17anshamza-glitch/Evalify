import OpenAI from 'openai';

let client = null;

export const callAI = async (prompt) => {
  try {
    if (!client) {
      client = new OpenAI({ apiKey: process.env.AI_API_KEY });
    }
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};
