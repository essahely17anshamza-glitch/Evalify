import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import errorHandler, { notFoundHandler } from './middleware/errorHandler.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-ancestors": ["'self'", "http://localhost:5173", "http://127.0.0.1:5173"],
    },
  }
}));
app.use(cors());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use('/preview', express.static(path.join(__dirname, '../../uploads/previews')));

// Fallback for missing previews to show a nice error in the iframe
app.use('/preview', (req, res) => {
  res.status(404).send(`
    <html>
      <body style="font-family: system-ui; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #111116; color: #a1a1aa; margin: 0; text-align: center; padding: 2rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; color: #6b7280;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <h2 style="color: #fff; margin-bottom: 0.5rem; font-weight: 500;">Live Preview Unavailable</h2>
        <p style="max-width: 400px; line-height: 1.5; font-size: 0.9rem;">This project's structure is not compatible with Evalify's static live preview. It likely requires a build step (e.g., React, Vue, Vite) or does not contain an <code>index.html</code> in the root folder.</p>
      </body>
    </html>
  `);
});

app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use(express.json({ limit: '1mb' })); // Add limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour per IP
  message: { success: false, error: 'AI rate limit exceeded.' }
});

app.use('/api', apiLimiter);
app.use('/api/analyze', analyzeLimiter);
app.use('/api/projects/analyze', analyzeLimiter);

app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
