import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export const getRepoMeta = async (githubUrl) => {
  try {
    const urlParts = new URL(githubUrl).pathname.split('/').filter(Boolean);
    if (urlParts.length < 2) throw new Error('Invalid GitHub URL');
    const owner = urlParts[0];
    let repo = urlParts[1];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error('Failed to fetch repo metadata');
    const data = await res.json();

    return {
      stars: data.stargazers_count,
      language: data.language,
      description: data.description,
      defaultBranch: data.default_branch,
      topics: data.topics || [],
      owner,
      repo
    };
  } catch (error) {
    console.error('GitHub API error:', error);
    throw new Error('Could not fetch GitHub repository metadata');
  }
};

export const fetchRepoZip = async (githubUrl, defaultBranch = 'main') => {
  try {
    const urlParts = new URL(githubUrl).pathname.split('/').filter(Boolean);
    const owner = urlParts[0];
    let repo = urlParts[1];
    if (repo.endsWith('.git')) repo = repo.slice(0, -4);

    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${defaultBranch}`;
    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error('Failed to download repository zip');
    
    const buffer = await res.arrayBuffer();
    
    const fileName = `github-${owner}-${repo}-${Date.now()}.zip`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(buffer));
    
    return filePath;
  } catch (error) {
    console.error('GitHub API zip error:', error);
    throw new Error('Could not download GitHub repository ZIP');
  }
};
