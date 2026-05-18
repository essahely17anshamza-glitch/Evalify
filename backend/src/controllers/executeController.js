import { exec } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import fs from 'fs';

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
      
      // Inject JSDOM polyfill for JS so document/window are available!
      if (lang === 'javascript' || lang === 'js') {
        const jsdomUrl = import.meta.resolve('jsdom');
        const domInjection = `import { JSDOM } from '${jsdomUrl}';
const dom = new JSDOM(\`<!DOCTYPE html><html><body></body></html>\`);
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });
global.HTMLElement = dom.window.HTMLElement;

// Smart Mocking: Auto-create elements if they are requested so the code doesn't crash on null!
const origGetId = document.getElementById.bind(document);
document.getElementById = (id) => {
  let el = origGetId(id);
  if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
  return el;
};
const origQuery = document.querySelector.bind(document);
document.querySelector = (selector) => {
  let el = origQuery(selector);
  if (!el) { 
    el = document.createElement('div');
    if(selector.startsWith('#')) el.id = selector.substring(1);
    else if(selector.startsWith('.')) el.className = selector.substring(1);
    document.body.appendChild(el); 
  }
  return el;
};
// End Evalify Polyfill
`;
        content = domInjection + '\n' + content;
      }

      await writeFile(join(runDir, f.name), content);
    }
    
    let command = '';
    if (lang === 'javascript' || lang === 'js') {
      // Need to tell node we are running an ES module by linking a package.json in the temp dir, OR we just run the file directly because the parent backend uses ES modules.
      // Wait, if we use temp dir, Node might not know it's an ES module. We should write a basic package.json.
      await writeFile(join(runDir, 'package.json'), JSON.stringify({ type: 'module' }));
      
      command = `node ${mainFile.name}`;
    } else if (lang === 'python' || lang === 'py') {
      command = `python ${mainFile.name}`;
    } else {
      return res.status(400).json({ success: false, error: `Language '${lang}' execution requires a local runtime or an alternative execution API.` });
    }

    // Execute with a generous 5s timeout
    exec(command, { cwd: runDir, timeout: 5000 }, (error, stdout, stderr) => {
      // Cleanup the temporary execution directory immediately after run
      fs.rm(runDir, { recursive: true, force: true }, () => {});
      
      const code = error ? error.code || 1 : 0;
      let actualStderr = error && !stderr ? error.message : stderr;
      
      // Clean up the polyfill trace
      if (actualStderr) {
        actualStderr = actualStderr.split('\n').filter(line => !line.includes('evalify-run-')).join('\n');
      }
      
      res.json({
        success: true,
        run: {
          stdout: stdout || '',
          stderr: actualStderr || '',
          code: code
        }
      });
    });

  } catch (error) {
    console.error('Execute Controller Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during code execution' });
  }
};
