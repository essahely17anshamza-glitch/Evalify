import OpenAI from 'openai';

let client = null;

export const callAI = async (prompt) => {
  try {
    if (!process.env.AI_API_KEY) {
      throw new Error('AI_API_KEY environment variable is not set');
    }
    
    if (!client) {
      // DeepSeek is compatible with the OpenAI SDK
      client = new OpenAI({ 
        apiKey: process.env.AI_API_KEY,
        baseURL: 'https://api.deepseek.com' // or https://api.deepseek.com/v1 if needed
      });
    }

    console.log('[DeepSeek] Calling API...');
    
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
    });

    console.log('[DeepSeek] Response received');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[DeepSeek] API error:', error);
    throw error;
  }
};
