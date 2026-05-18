// Generic AI Service - supports multiple providers
// Configure which provider to use via AI_PROVIDER env var

import * as groqProvider from './providers/groq.js';
import * as geminiProvider from './providers/gemini.js';
import * as openaiProvider from './providers/openai.js';
import * as deepseekProvider from './providers/deepseek.js';
import * as nvidiaProvider from './providers/nvidia.js';

const getProvider = () => {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();

  switch (provider) {
    case 'groq':
      return groqProvider;
    case 'gemini':
      return geminiProvider;
    case 'openai':
      return openaiProvider;
    case 'deepseek':
      return deepseekProvider;
    case 'nvidia':
      return nvidiaProvider;
    default:
      console.warn(`Unknown AI provider: ${provider}, defaulting to groq`);
      return groqProvider;
  }
};

const normalizeResponse = (text) => {
  if (!text) return null;
  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }

  // Find the first { and the last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }

  return text.trim();
};

const getMockResponse = (type = 'project') => {
  if (type === 'project') {
    return {
      success: false,
      feedback: '⚠️ AI service is currently unavailable. Please check your API key configuration. In the meantime, this is a placeholder response.',
      architecture: 'Unable to analyze architecture',
      highlights: 'Unable to highlight code quality',
      crossFileIssues: [],
      improvements: [],
      strengths: [],
      scores: {
        codeQuality: 0,
        security: 0,
        performance: 0,
        scalability: 0,
        overall: 0
      }
    };
  }
  return {
    success: false,
    feedback: '⚠️ AI service is currently unavailable.',
    strengths: [],
    weaknesses: [],
    scores: {
      readability: 0,
      bestPractices: 0,
      correctness: 0,
      overall: 0
    }
  };
};

const PROJECT_PROMPT_TEMPLATE = `
You are a senior code reviewer with high standards but genuine desire to help developers improve. Analyze this complete project and provide structured feedback.

Project Title: {title}
Description: {description}

Here are the extracted code files:
{filesText}

Please evaluate the code and provide a JSON response EXACTLY matching this structure:
{
  "success": true,
  "feedback": "OVERALL ASSESSMENT (2-3 sentences — honest, direct, encouraging)",
  "architecture": "ARCHITECTURE & STRUCTURE (file organization, separation of concerns)",
  "highlights": "CODE QUALITY HIGHLIGHTS (best file, file needing most improvement, why)",
  "crossFileIssues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "scores": {
    "codeQuality": 0,
    "security": 0,
    "performance": 0,
    "scalability": 0,
    "overall": 0
  }
}

IMPORTANT: You MUST replace the 0s in the scores object with your own highly critical and accurate scores between 0 and 100. Do NOT use generic scores like 80 or 85. Critically evaluate the code!

Be specific. Reference actual files and line numbers. Write like a senior developer doing a code review for a colleague they respect but want to push further.
RETURN ONLY JSON. No markdown wrappers. Do NOT use any emojis in your response.
`;

const HTML_CSS_PROMPT_TEMPLATE = `
You are a senior front-end web developer reviewing an HTML/CSS exercise submitted by a trainee student.

Project: {title}
Description: {description}

Code files:
{filesText}

Focus your review on:
- Semantic HTML5 (header, nav, main, section, article, footer, etc.)
- CSS best practices (Box model, specificity, Flexbox/Grid, responsive design)
- Accessibility (alt attributes, ARIA labels, contrast, keyboard nav)
- Code organization and readability
- Common beginner mistakes

Return EXACTLY this JSON:
{
  "success": true,
  "feedback": "OVERALL ASSESSMENT (2-3 sentences — honest and encouraging)",
  "architecture": "How HTML structure and CSS are organized",
  "highlights": "What works well and what needs the most attention",
  "crossFileIssues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "scores": {
    "codeQuality": 0,
    "security": 0,
    "performance": 0,
    "scalability": 0,
    "overall": 0
  }
}

For security: inline scripts or unsafe practices. For performance: image optimization, CSS bloat. For scalability: how maintainable the styles are.
RETURN ONLY JSON. No markdown wrappers. Do NOT use any emojis in your response.
`;

const PYTHON_PROMPT_TEMPLATE = `
You are a senior Python developer reviewing a Python algorithm or script submitted by a trainee student at a vocational training center (OFPPT).

Project: {title}
Description: {description}

Code files:
{filesText}

Focus your review on:
- Algorithm correctness and logic
- Time and space complexity (Big-O if applicable)
- PEP-8 style compliance (naming, spacing, docstrings)
- Pythonic idioms (list comprehensions, built-in functions, etc.)
- Error handling and edge cases

Return EXACTLY this JSON:
{
  "success": true,
  "feedback": "OVERALL ASSESSMENT (2-3 sentences — honest and encouraging)",
  "architecture": "Code structure and module/function organization",
  "highlights": "The most impressive part and the most critical fix needed",
  "crossFileIssues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "scores": {
    "codeQuality": 0,
    "security": 0,
    "performance": 0,
    "scalability": 0,
    "overall": 0
  }
}

For security: eval usage, file handling, input validation. For performance: algorithmic efficiency. For scalability: modularity and reusability.
RETURN ONLY JSON. No markdown wrappers. Do NOT use any emojis in your response.
`;

const SQL_PROMPT_TEMPLATE = `
You are a senior database engineer reviewing SQL queries submitted by a trainee student at a vocational training center (OFPPT).

Project: {title}
Description: {description}

SQL content:
{filesText}

Focus your review on:
- Query correctness (JOINs, WHERE clauses, GROUP BY, subqueries)
- Query optimization (index usage, avoiding SELECT *, N+1 patterns)
- Schema design if DDL is present (normalization, constraints, naming)
- SQL style and readability (formatting, aliasing, consistent casing)
- Security (SQL injection risks in patterns, dynamic SQL)

Return EXACTLY this JSON:
{
  "success": true,
  "feedback": "OVERALL ASSESSMENT (2-3 sentences — direct and encouraging)",
  "architecture": "Schema design quality or overall query organization",
  "highlights": "Best query and most problematic query, with reasoning",
  "crossFileIssues": ["issue 1", "issue 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4", "improvement 5"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "scores": {
    "codeQuality": 0,
    "security": 0,
    "performance": 0,
    "scalability": 0,
    "overall": 0
  }
}
RETURN ONLY JSON. No markdown wrappers. Do NOT use any emojis in your response.
`;

const CODE_PROMPT_TEMPLATE = `
You are a senior code reviewer. Analyze the following code snippet and provide a concise, honest evaluation.

Language: {language}

Code:
{code}

Return EXACT JSON with this structure:
{
  "success": true,
  "feedback": "OVERALL ASSESSMENT (2-3 sentences)",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "scores": {
    "readability": 0,
    "bestPractices": 0,
    "correctness": 0,
    "overall": 0
  }
}
RETURN ONLY JSON.
`;

const COMPARE_PROMPT_TEMPLATE = `
You are a senior developer tasked with comparing two code submissions for the same challenge.

Challenge Prompt:
{challengePrompt}

Submission A Feedback:
{feedbackA}

Submission B Feedback:
{feedbackB}

Provide EXACT JSON with this structure:
{
  "success": true,
  "winner": "A" | "B" | "Tie",
  "reason": "One sentence summary explaining the verdict.",
  "comparisonText": "A short comparative review explaining why the winner was chosen.",
  "scoreA": 0,
  "scoreB": 0
}
RETURN ONLY JSON.
`;

export const analyzeProject = async (files, title, description, type = 'zip') => {
  try {
    const provider = getProvider();
    console.log(`[AI Service] Using provider: ${process.env.AI_PROVIDER || 'groq'} | type: ${type}`);
    
    let filesText = '';
    files.forEach(f => {
      filesText += `\n\n--- FILE: ${f.path} ---\n${f.content}\n`;
    });

    // Pick the right prompt based on submission type
    let templateSource = PROJECT_PROMPT_TEMPLATE;
    if (type === 'html_css' || type === 'web') templateSource = HTML_CSS_PROMPT_TEMPLATE;
    else if (type === 'python') templateSource = PYTHON_PROMPT_TEMPLATE;
    else if (type === 'sql') templateSource = SQL_PROMPT_TEMPLATE;

    const prompt = templateSource
      .replace('{title}', title || 'Untitled')
      .replace('{description}', description || 'No description provided')
      .replace('{filesText}', filesText);

    console.log('[AI Service] Calling AI provider with prompt...');
    const response = await provider.callAI(prompt);
    
    const text = normalizeResponse(response);
    return text ? JSON.parse(text) : getMockResponse('project');
  } catch (error) {
    console.error('[AI Service] Analysis error:', error);
    return getMockResponse('project');
  }
};


export const analyzeCode = async (code, language = 'auto') => {
  try {
    const provider = getProvider();
    const prompt = CODE_PROMPT_TEMPLATE
      .replace('{language}', language)
      .replace('{code}', code);

    const response = await provider.callAI(prompt);
    const text = normalizeResponse(response);
    
    return text ? JSON.parse(text) : getMockResponse('code');
  } catch (error) {
    console.error('AI code analysis error:', error.message);
    return getMockResponse('code');
  }
};

export const compareSubmissions = async (projectA, projectB, challengePrompt) => {
  try {
    const provider = getProvider();
    const prompt = COMPARE_PROMPT_TEMPLATE
      .replace('{challengePrompt}', challengePrompt)
      .replace('{feedbackA}', projectA.aiFeedback || 'No AI feedback available for submission A.')
      .replace('{feedbackB}', projectB.aiFeedback || 'No AI feedback available for submission B.');

    const response = await provider.callAI(prompt);
    const text = normalizeResponse(response);
    
    return text ? JSON.parse(text) : {
      success: false,
      winner: 'Tie',
      reason: 'The comparison failed to return a valid result.',
      comparisonText: '',
      scoreA: projectA.aiScore || 0,
      scoreB: projectB.aiScore || 0
    };
  } catch (error) {
    console.error('AI comparison error:', error.message);
    return {
      success: false,
      winner: 'Tie',
      reason: 'Failed to compare submissions.',
      comparisonText: '',
      scoreA: projectA.aiScore || 0,
      scoreB: projectB.aiScore || 0
    };
  }
};
