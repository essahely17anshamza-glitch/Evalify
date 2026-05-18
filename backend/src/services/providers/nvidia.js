import OpenAI from 'openai';

let client = null;

export const callAI = async (prompt) => {
  try {
    if (!process.env.AI_API_KEY) {
      throw new Error('AI_API_KEY environment variable is not set');
    }
    
    if (!client) {
      // NVIDIA NIM API uses the OpenAI SDK
      client = new OpenAI({ 
        apiKey: process.env.AI_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      });
    }

    console.log('[NVIDIA] Calling API...');
    
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
    });

    console.log('[NVIDIA] Response received');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[NVIDIA] API error:', error);
    throw error;
  }
};
