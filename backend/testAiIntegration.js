import dotenv from 'dotenv';
dotenv.config();

import { analyzeProject } from './src/services/aiService.js';

async function test() {
  const files = [
    { path: 'index.js', content: 'console.log("Hello World");' }
  ];
  
  console.log('Testing integration...');
  const result = await analyzeProject(files, 'Test Project', 'A simple test project');
  console.log('Result:', result);
}

test();