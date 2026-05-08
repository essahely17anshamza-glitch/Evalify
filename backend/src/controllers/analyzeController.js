import { analyzeCode } from '../services/geminiService.js';

const analysisJobs = new Map();

export const quickAnalyze = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, error: 'Code is required for quick analysis' });
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    analysisJobs.set(jobId, { status: 'processing', createdAt: new Date().toISOString() });

    const result = await analyzeCode(code, language || 'auto');
    analysisJobs.set(jobId, { status: 'complete', createdAt: new Date().toISOString(), result });

    res.json({ success: true, data: { jobId, result } });
  } catch (error) {
    analysisJobs.set(`job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, { status: 'failed', error: error.message });
    next(error);
  }
};

export const getAnalysisStatus = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const job = analysisJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Analysis job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};
