import extract from 'extract-zip';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const extractZip = async (zipFilePath, targetDirName) => {
  try {
    // Determine the absolute path for extraction
    const targetPath = path.resolve(__dirname, '../../uploads', targetDirName);
    
    // Create the target directory
    await fs.mkdir(targetPath, { recursive: true });
    
    // Extract the zip file
    await extract(zipFilePath, { dir: targetPath });
    
    return targetPath;
  } catch (err) {
    console.error('Error extracting zip:', err);
    throw new Error('Failed to extract ZIP file');
  }
};

export const readExtractedFiles = async (dirPath) => {
  const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', '.html', '.css', '.json', '.md'];
  const excludeFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

  // Max total size of all code combined (400KB) to stay within ~100k tokens (Llama context limit is 128k)
  const MAX_TOTAL_SIZE = 400 * 1024;
  let fileDataList = [];
  let totalSize = 0;

  const readDirRecursive = async (currentPath) => {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (let entry of entries) {
      if (totalSize > MAX_TOTAL_SIZE) break;

      const fullPath = path.join(currentPath, entry.name);
      
      // Skip node_modules, .git, etc.
      if (entry.isDirectory() && !['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', '.next', '.cache'].includes(entry.name)) {
        await readDirRecursive(fullPath);
      } else if (entry.isFile() && !excludeFiles.includes(entry.name) && !entry.name.endsWith('.min.js') && !entry.name.endsWith('.min.css')) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          try {
            const stat = await fs.stat(fullPath);
            if (stat.size < 500 * 1024) { // Only read files smaller than 500KB
              const content = await fs.readFile(fullPath, 'utf8');
              totalSize += content.length;
              // Store relative path to original extracted dir
              const relativePath = path.relative(dirPath, fullPath);
              fileDataList.push({ path: relativePath, content });
            }
          } catch(e) {
            console.error('Skipped file', fullPath, e);
          }
        }
      }
    }
  };

  await readDirRecursive(dirPath);
  return fileDataList;
};

export const cleanupTempFiles = async (zipFilePath, extractedDirPath) => {
  try {
    if (zipFilePath) await fs.unlink(zipFilePath);
    if (extractedDirPath) await fs.rm(extractedDirPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};
