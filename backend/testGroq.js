import { config } from 'dotenv';
config();

import { callAI } from './src/services/providers/groq.js';

async function test() {
  try {
    console.log('Testing Groq API...');
    const result = await callAI('Hello, can you hear me?');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
