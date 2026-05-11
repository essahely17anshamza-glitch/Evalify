import { GoogleGenAI } from '@google/genai';

let client = null;

export const callAI = async (prompt) => {
  try {
    if (!client) {
      client = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
    }
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || response.output?.[0]?.content?.[0]?.text || '';
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};
