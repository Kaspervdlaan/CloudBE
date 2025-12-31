import { Request, Response, NextFunction } from 'express';
import { startDownload, getJobStatus, getAllJobs, stopDownload, stopAllDownloads } from '../utils/youtube';

/**
 * Start YouTube download
 */
export async function downloadVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url, format } = req.body as {
      url: string;
      format: 'mp3' | 'mp4';
    };

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: { message: 'url is required', statusCode: 400 },
      });
      return;
    }

    if (!format || (format !== 'mp3' && format !== 'mp4')) {
      res.status(400).json({
        error: { message: 'format must be mp3 or mp4', statusCode: 400 },
      });
      return;
    }

    const jobId = await startDownload(url, format);

    res.json({
      data: {
        jobId,
        status: 'queued',
        url,
        format,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: {
        message: error.message || 'Failed to start download',
        statusCode: 400,
      },
    });
  }
}

/**
 * Get download job status
 */
export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: { message: 'jobId is required', statusCode: 400 },
      });
      return;
    }

    const job = getJobStatus(jobId);

    if (!job) {
      res.status(404).json({
        error: { message: 'Job not found', statusCode: 404 },
      });
      return;
    }

    res.json({ data: job });
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error.message || 'Failed to get job status',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get all download jobs
 */
export async function listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobs = getAllJobs();
    res.json({ data: jobs });
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error.message || 'Failed to list jobs',
        statusCode: 500,
      },
    });
  }
}

/**
 * Stop/cancel a download job
 */
export async function stopJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({
        error: { message: 'jobId is required', statusCode: 400 },
      });
      return;
    }

    const success = stopDownload(jobId);

    if (!success) {
      res.status(404).json({
        error: { message: 'Job not found or cannot be stopped', statusCode: 404 },
      });
      return;
    }

    const job = getJobStatus(jobId);
    res.json({
      data: {
        jobId,
        status: job?.status || 'cancelled',
        message: 'Download stopped successfully',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error.message || 'Failed to stop download',
        statusCode: 500,
      },
    });
  }
}

/**
 * Stop all active downloads
 */
export async function stopAllJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = stopAllDownloads();
    res.json({
      data: {
        stopped: result.stopped,
        jobs: result.jobs,
        message: `Stopped ${result.stopped} download(s)`,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        message: error.message || 'Failed to stop downloads',
        statusCode: 500,
      },
    });
  }
}


