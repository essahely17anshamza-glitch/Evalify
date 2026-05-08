import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    "structure": 85,
    "readability": 90,
    "bestPractices": 80,
    "completeness": 95,
    "overall": 87
  }
}

Be specific. Reference actual files and line numbers. Write like a senior developer doing a code review for a colleague they respect but want to push further.
RETURN ONLY JSON. No markdown wrappers.
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

const normalizeResponse = (response) => {
  if (!response) return null;
  let text = response.text || response.output?.[0]?.content?.[0]?.text || '';
  if (typeof text !== 'string') {
    text = JSON.stringify(response);
  }

  if (text.startsWith('```json')) {
    text = text.slice(7, text.lastIndexOf('```'));
  }

  return text.trim();
};

export const analyzeProject = async (files, title, description) => {
  try {
    let filesText = '';
    files.forEach(f => {
      filesText += `\n\n--- FILE: ${f.path} ---\n${f.content}\n`;
    });

    const prompt = PROJECT_PROMPT_TEMPLATE
      .replace('{title}', title)
      .replace('{description}', description)
      .replace('{filesText}', filesText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = normalizeResponse(response);
    return text ? JSON.parse(text) : {
      success: false,
      feedback: 'Gemini did not return a valid JSON response.',
      scores: { overall: 0 }
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return {
      success: false,
      feedback: 'Failed to generate AI analysis.',
      scores: { overall: 0 }
    };
  }
};

export const analyzeCode = async (code, language = 'auto') => {
  try {
    const prompt = CODE_PROMPT_TEMPLATE
      .replace('{language}', language)
      .replace('{code}', code);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = normalizeResponse(response);
    return text ? JSON.parse(text) : {
      success: false,
      feedback: 'Gemini did not return a valid JSON response.',
      scores: { overall: 0 }
    };
  } catch (error) {
    console.error('Gemini code analysis error:', error);
    return {
      success: false,
      feedback: 'Failed to analyze code snippet.',
      scores: { overall: 0 }
    };
  }
};

export const compareSubmissions = async (projectA, projectB, challengePrompt) => {
  try {
    const prompt = COMPARE_PROMPT_TEMPLATE
      .replace('{challengePrompt}', challengePrompt)
      .replace('{feedbackA}', projectA.aiFeedback || 'No AI feedback available for submission A.')
      .replace('{feedbackB}', projectB.aiFeedback || 'No AI feedback available for submission B.');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

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
    console.error('Gemini comparison error:', error);
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
