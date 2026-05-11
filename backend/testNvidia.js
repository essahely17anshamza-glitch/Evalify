import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: "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",
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function test() {
  try {
    console.log('Testing NVIDIA API with deepseek model...');
    const response = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-r1",
      messages: [{"role":"user","content":"Hi"}],
      max_tokens: 50
    });
    console.log('Success:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error with deepseek-r1:', error.message);
    try {
      console.log('Testing with meta/llama-3.3-70b-instruct...');
      const response = await client.chat.completions.create({
        model: "meta/llama-3.3-70b-instruct",
        messages: [{"role":"user","content":"Hi"}],
        max_tokens: 50
      });
      console.log('Success:', response.choices[0].message.content);
    } catch (e2) {
      console.error('Error with llama3.3:', e2.message);
    }
  }
}

test();
