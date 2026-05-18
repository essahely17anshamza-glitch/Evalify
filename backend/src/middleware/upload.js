import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateS3Key } from '../services/s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure uploads directory exists for temp processing
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    
    // Generate S3 key and attach to request for later use
    const s3Key = generateS3Key('projects', file.originalname);
    req.s3Key = s3Key;
    req.localFilePath = path.join(UPLOADS_DIR, filename);
    
    cb(null, filename);
  }
});

const ALLOWED_EXTENSIONS = ['.zip', '.html', '.htm', '.css', '.py', '.sql'];
const ASSIGNMENT_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.md',
  '.csv',
  '.zip',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const assignmentAttachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ASSIGNMENT_ATTACHMENT_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported assignment attachment. Allowed: ${ASSIGNMENT_ATTACHMENT_EXTENSIONS.join(', ')}`), false);
  }
};

export const assignmentUpload = multer({
  storage,
  fileFilter: assignmentAttachmentFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB assignment handout limit
});

/**
 * Detect submission type from file extension or ZIP contents.
 * @param {string} filePath - path to the file on disk
 * @param {boolean} isZip - whether it's a zip file
 * @returns {Promise<string>} - one of: 'html_css', 'python', 'sql', 'zip'
 */
export const detectFileType = async (filePath, isZip = false) => {
  if (!isZip) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html' || ext === '.htm' || ext === '.css') return 'html_css';
    if (ext === '.py') return 'python';
    if (ext === '.sql') return 'sql';
    return 'zip';
  }
  // For ZIPs: scan the contents and vote by extension frequency
  try {
    const { extractZip, cleanupTempFiles } = await import('../services/zipService.js');
    const tmpDir = `type-detect-${Date.now()}`;
    const extractedPath = await extractZip(filePath, tmpDir);
    const fsP = await import('fs/promises');
    const votes = { html_css: 0, python: 0, sql: 0, other: 0 };
    const walk = async (dir) => {
      const entries = await fsP.default.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !['node_modules','.git'].includes(e.name)) await walk(path.join(dir, e.name));
        else if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (['.html','.htm','.css'].includes(ext)) votes.html_css++;
          else if (ext === '.py') votes.python++;
          else if (ext === '.sql') votes.sql++;
          else votes.other++;
        }
      }
    };
    await walk(extractedPath);
    await cleanupTempFiles(null, extractedPath);
    const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
    if (votes.html_css / total > 0.5) return 'html_css';
    if (votes.python / total > 0.5) return 'python';
    if (votes.sql / total > 0.5) return 'sql';
    return 'zip';
  } catch {
    return 'zip';
  }
};
