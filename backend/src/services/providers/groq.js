import Groq from 'groq-sdk';

let client = null;

export const callAI = async (prompt) => {
  try {
    if (!process.env.AI_API_KEY) {
      throw new Error('AI_API_KEY environment variable is not set');
    }
    
    if (!client) {
      client = new Groq({ apiKey: process.env.AI_API_KEY });
    }

    console.log('[Groq] Calling API...');
    
    // Using an active Groq model
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('[Groq] Response received');
    
    const text = response.choices?.[0]?.message?.content || '';
    console.log('[Groq] Text extracted, length:', text.length);
    return text;
  } catch (error) {
    console.error('[Groq] API error:', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw error;
  }
};
