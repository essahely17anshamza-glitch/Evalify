import { exec, execSync } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import fs from 'fs';

// Detect available Python command on the system by actually running it
const getPythonCommand = () => {
  // On Windows, prefer `py` (the Python launcher) since `python` may be
  // hijacked by the Microsoft Store stub
  const isWin = process.platform === 'win32';
  const candidates = isWin ? ['py', 'python3', 'python'] : ['python3', 'python', 'py'];

  for (const cmd of candidates) {
    try {
      const result = execSync(`"${cmd}" --version 2>&1`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
        windowsHide: true
      });
      // Verify output looks like a real Python version (e.g. "Python 3.12.0")
      if (result.trim().toLowerCase().includes('python')) {
        return cmd;
      }
    } catch (e) {
      // Command failed or isn't real Python, try next
    }
  }
  return 'python'; // fallback (will likely fail with a clear error)
};

export const executeCode = async (req, res) => {
  try {
    const { language, files, stdin = '' } = req.body;

    if (!language || !files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Language and files are required' });
    }

    const lang = language.toLowerCase();
    
    // Fallback to local execution since public Piston API is now restricted.
    const mainFile = files.find(f => f.name.includes('main')) || files[0];
    
    const runId = randomUUID();
    const runDir = join(tmpdir(), `evalify-run-${runId}`);
    
    if (!fs.existsSync(runDir)) {
      await mkdir(runDir, { recursive: true });
    }

    // Write all files securely to temp dir
    for (const f of files) {
      let content = f.content;
      
      // Inject minimal DOM shim for JS so browser APIs don't crash Node.js
      if (lang === 'javascript' || lang === 'js') {
        const domShim = `// Minimal DOM shim for server-side execution
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  getElementsByClassName: () => [],
  getElementsByTagName: () => [],
  createElement: () => ({}),
  createTextNode: () => ({}),
  body: {},
  head: {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.window = { document: global.document, location: { href: '' } };
Object.defineProperty(global, 'navigator', { value: { userAgent: 'Node.js' }, writable: true, configurable: true });
// End DOM shim

`;
        content = domShim + content;
      }

      await writeFile(join(runDir, f.name), content);
    }
    
    let command = '';
    if (lang === 'javascript' || lang === 'js') {
      await writeFile(join(runDir, 'package.json'), JSON.stringify({ type: 'module' }));
      command = `node "${mainFile.name}"`;
    } else if (lang === 'python' || lang === 'py') {
      const pythonCmd = getPythonCommand();
      command = `${pythonCmd} "${mainFile.name}"`;
    } else {
      return res.status(400).json({
        success: false,
        error: `Language '${lang}' is not supported for local execution. Supported: JavaScript, Python.`
      });
    }

    // Execute with a 10s timeout (increased from 5s for more complex code)
    exec(command, { cwd: runDir, timeout: 10000 }, (error, stdout, stderr) => {
      // Cleanup the temporary execution directory immediately after run
      fs.rm(runDir, { recursive: true, force: true }, () => {});
      
      const exitCode = error ? (error.code || 1) : 0;
      let actualStderr = stderr || '';
      
      // If there was an error and no stderr output, use the error message
      if (error && !actualStderr) {
        actualStderr = error.message || '';
      }
      
      // Filter out temp directory paths from error output
      if (actualStderr) {
        actualStderr = actualStderr
          .split('\n')
          .filter(line => !line.includes('evalify-run-'))
          .join('\n');
      }
      
      res.json({
        success: true,
        run: {
          stdout: stdout || '',
          stderr: actualStderr || '',
          code: exitCode
        }
      });
    });

  } catch (error) {
    console.error('Execute Controller Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during code execution'
    });
  }
};
