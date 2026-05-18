import extract from 'extract-zip';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { uploadFileToS3, deleteFileFromS3, generateS3Key, getPresignedUrl } from './s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const extractZip = async (zipFilePath, targetDirName, s3Key = null) => {
  try {
    // Determine the absolute path for extraction (still use temp local for extraction)
    const targetPath = path.resolve(__dirname, '../../uploads', targetDirName);
    
    // Create the target directory
    await fs.mkdir(targetPath, { recursive: true });
    
    // Extract the zip file
    await extract(zipFilePath, { dir: targetPath });
    
    // If S3 key provided, upload the original zip to S3
    if (s3Key) {
      await uploadFileToS3(zipFilePath, s3Key, 'application/zip');
    }
    
    return targetPath;
  } catch (err) {
    console.error('Error extracting zip:', err);
    throw new Error('Failed to extract ZIP file');
  }
};

export const readExtractedFiles = async (dirPath) => {
  const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', '.html', '.css', '.json', '.md'];
  const excludeFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

  // Max total size of all code combined (25KB) to stay within ~6k tokens (Strict Groq free tier limit)
  const MAX_TOTAL_SIZE = 25 * 1024;
  let fileDataList = [];
  let totalSize = 0;

  let allFiles = [];

  const gatherFiles = async (currentPath) => {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (let entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory() && !['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', '.next', '.cache'].includes(entry.name)) {
        await gatherFiles(fullPath);
      } else if (entry.isFile() && !excludeFiles.includes(entry.name) && !entry.name.endsWith('.min.js') && !entry.name.endsWith('.min.css')) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/');
          allFiles.push({ fullPath, relativePath, ext });
        }
      }
    }
  };

  await gatherFiles(dirPath);

  // Score files to prioritize reading core logic files first
  const getScore = (f) => {
    let score = 0;
    // Core logic languages
    if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp'].includes(f.ext)) score += 10;
    // UI/markup
    if (['.html', '.css', '.php', '.rb'].includes(f.ext)) score += 5;
    // Config/docs
    if (['.json', '.md'].includes(f.ext)) score += 1;
    
    // Core directories
    if (f.relativePath.includes('src/') || f.relativePath.includes('app/') || f.relativePath.includes('lib/')) score += 20;
    if (f.relativePath.includes('components/') || f.relativePath.includes('controllers/')) score += 10;
    
    // De-prioritize tests and configs
    if (f.relativePath.includes('test') || f.relativePath.includes('spec')) score -= 5;
    if (f.relativePath.includes('config') || f.relativePath.endsWith('package.json')) score -= 2;
    
    return score;
  };

  allFiles.sort((a, b) => getScore(b) - getScore(a));

  for (let f of allFiles) {
    if (totalSize > MAX_TOTAL_SIZE) break;
    try {
      const stat = await fs.stat(f.fullPath);
      if (stat.size < 500 * 1024) { // Only read files smaller than 500KB
        const content = await fs.readFile(f.fullPath, 'utf8');
        if (totalSize + content.length <= MAX_TOTAL_SIZE + 5000) { // allow slight overflow for the last file
          totalSize += content.length;
          fileDataList.push({ path: f.relativePath, content });
        }
      }
    } catch(e) {
      console.error('Skipped file', f.fullPath, e);
    }
  }

  return fileDataList;
};

export const cleanupTempFiles = async (zipFilePath, extractedDirPath, s3Key = null) => {
  try {
    // Clean up local files
    if (zipFilePath) await fs.unlink(zipFilePath);
    if (extractedDirPath) await fs.rm(extractedDirPath, { recursive: true, force: true });
    
    // Optionally clean up S3 file (usually we want to keep it)
    if (s3Key && process.env.CLEANUP_S3_AFTER_PROCESSING === 'true') {
      await deleteFileFromS3(s3Key);
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

export const getProjectZipUrl = async (s3Key) => {
  try {
    return await getPresignedUrl(s3Key, 24 * 60 * 60); // 24 hours expiry
  } catch (error) {
    console.error('Error getting project zip URL:', error);
    throw new Error('Failed to generate download URL');
  }
};
