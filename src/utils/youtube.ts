/**
 * YouTube download utilities using yt-dlp
 */

import { exec, ChildProcess } from 'child_process';
import * as path from 'path';

// Note: This module requires Docker socket access (/var/run/docker.sock)
// to execute docker exec commands. The socket must be mounted in the API container.

// Job tracking (in-memory for simplicity)
interface YouTubeJob {
  jobId: string;
  url: string;
  format: 'mp3' | 'mp4';
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress?: number;
  filename?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  process?: ChildProcess; // Track the process so we can kill it
}

const jobs = new Map<string, YouTubeJob>();

// Generate unique job ID
function generateJobId(): string {
  return `yt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Execute yt-dlp command in container with process tracking
 */
async function execYtDlp(
  url: string,
  format: 'mp3' | 'mp4',
  outputDir: string = '/data/movies',
  job: YouTubeJob
): Promise<{ filename: string; output: string }> {
  const containerName = 'drive-ytdlp';

  // Build yt-dlp command based on format
  let command: string;
  
  if (format === 'mp3') {
    // Extract audio and convert to MP3
    command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputDir}/%(title)s.%(ext)s" "${url}"`;
  } else {
    // Download best video format (prefer MP4)
    command = `yt-dlp -f "best[ext=mp4]/best" -o "${outputDir}/%(title)s.%(ext)s" "${url}"`;
  }

  // Execute in container using docker exec
  // Note: This requires Docker socket access. If running in Docker, mount /var/run/docker.sock
  const dockerCommand = `docker exec ${containerName} ${command}`;
  
  return new Promise<{ filename: string; output: string }>((resolve, reject) => {
    const childProcess = exec(dockerCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    }, (error, stdout, stderr) => {
      // Process completed (or was killed)
      if (error) {
        // If process was killed (SIGTERM/SIGKILL), don't treat as error
        if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
          reject(new Error('Download cancelled'));
          return;
        }
        reject(error);
        return;
      }

      // Extract filename from output (yt-dlp prints the final filename)
      // yt-dlp output format examples:
      // "[download] Destination: filename.ext"
      // "[ExtractAudio] Destination: filename.mp3"
      let filename = '';
      const downloadMatch = stdout.match(/\[download\] Destination: (.+)/);
      const extractMatch = stdout.match(/\[ExtractAudio\] Destination: (.+)/);
      
      if (extractMatch) {
        filename = extractMatch[1].trim();
      } else if (downloadMatch) {
        filename = downloadMatch[1].trim();
      } else {
        // Try to find filename in output (last line might contain it)
        const lines = stdout.split('\n').filter(l => l.trim());
        const lastLine = lines[lines.length - 1];
        if (lastLine && (lastLine.includes('.mp4') || lastLine.includes('.mp3'))) {
          filename = lastLine.trim();
        }
      }

      // Clean up path - remove directory if present, keep just filename
      if (filename) {
        filename = path.basename(filename);
      }

      if (stderr && !stdout.includes('[download]') && !stdout.includes('[ExtractAudio]')) {
        reject(new Error(stderr || 'Download failed'));
        return;
      }

      if (!filename) {
        reject(new Error('Could not determine downloaded filename'));
        return;
      }

      resolve({ filename, output: stdout + stderr });
    });

    // Store process reference on the job so it can be killed
    job.process = childProcess;
    jobs.set(job.jobId, job);
  });
}

/**
 * Start YouTube download job
 */
export async function startDownload(
  url: string,
  format: 'mp3' | 'mp4'
): Promise<string> {
  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required');
  }

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    throw new Error('Invalid YouTube URL');
  }

  if (format !== 'mp3' && format !== 'mp4') {
    throw new Error('Format must be mp3 or mp4');
  }

  const jobId = generateJobId();
  const job: YouTubeJob = {
    jobId,
    url,
    format,
    status: 'queued',
    createdAt: new Date(),
  };

  jobs.set(jobId, job);

  // Start download asynchronously
  (async () => {
    try {
      // Check if job was cancelled before starting
      const currentJob = jobs.get(jobId);
      if (!currentJob || currentJob.status === 'cancelled') {
        return; // Job was cancelled or doesn't exist, don't start
      }

      // Use the latest job from the map
      const latestJob = jobs.get(jobId)!;
      latestJob.status = 'downloading';
      jobs.set(jobId, latestJob);

      const result = await execYtDlp(url, format, '/data/movies', latestJob);
      
      // Get latest job state (may have been cancelled)
      const finalJob = jobs.get(jobId);
      if (finalJob && finalJob.status === 'downloading') {
        finalJob.status = 'completed';
        finalJob.progress = 100;
        finalJob.filename = path.basename(result.filename);
        finalJob.completedAt = new Date();
        jobs.set(jobId, finalJob);
      }
    } catch (error: any) {
      // Get latest job state
      const errorJob = jobs.get(jobId);
      if (!errorJob) return;
      
      // Check if it was cancelled
      if (error.message === 'Download cancelled') {
        errorJob.status = 'cancelled';
        errorJob.error = 'Download was cancelled';
      } else {
        // Only set error if not already cancelled
        if (errorJob.status !== 'cancelled') {
          errorJob.status = 'error';
          errorJob.error = error.message || 'Download failed';
        }
      }
      errorJob.completedAt = new Date();
      jobs.set(jobId, errorJob);
    }
  })();

  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): YouTubeJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get all jobs
 */
export function getAllJobs(): YouTubeJob[] {
  return Array.from(jobs.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Stop/cancel a download job
 */
export function stopDownload(jobId: string): boolean {
  const job = jobs.get(jobId);
  
  if (!job) {
    return false;
  }

  // If job is already completed, error, or cancelled, can't stop it
  if (job.status === 'completed' || job.status === 'error' || job.status === 'cancelled') {
    return false;
  }

  // If job is still queued, just mark it as cancelled
  if (job.status === 'queued') {
    job.status = 'cancelled';
    job.error = 'Download was cancelled before it started';
    job.completedAt = new Date();
    jobs.set(jobId, job);
    return true;
  }

  // If downloading, kill the process
  if (job.status === 'downloading' && job.process) {
    try {
      // Kill the process (SIGTERM first, then SIGKILL if needed)
      job.process.kill('SIGTERM');
      
      // If process doesn't die within 5 seconds, force kill
      setTimeout(() => {
        if (job.process && !job.process.killed) {
          job.process.kill('SIGKILL');
        }
      }, 5000);

      job.status = 'cancelled';
      job.error = 'Download was cancelled';
      job.completedAt = new Date();
      jobs.set(jobId, job);
      return true;
    } catch (error: any) {
      job.status = 'error';
      job.error = `Failed to cancel download: ${error.message}`;
      job.completedAt = new Date();
      jobs.set(jobId, job);
      return false;
    }
  }

  return false;
}

/**
 * Stop all active downloads (queued or downloading)
 */
export function stopAllDownloads(): { stopped: number; jobs: string[] } {
  const stoppedJobs: string[] = [];
  
  for (const [jobId, job] of jobs.entries()) {
    // Only stop jobs that are queued or downloading
    if (job.status === 'queued' || job.status === 'downloading') {
      if (stopDownload(jobId)) {
        stoppedJobs.push(jobId);
      }
    }
  }
  
  return {
    stopped: stoppedJobs.length,
    jobs: stoppedJobs,
  };
}

/**
 * Clean up old completed/error jobs (older than 24 hours)
 */
export function cleanupOldJobs(): void {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const [jobId, job] of jobs.entries()) {
    if (
      (job.status === 'completed' || job.status === 'error') &&
      job.completedAt &&
      job.completedAt < twentyFourHoursAgo
    ) {
      jobs.delete(jobId);
    }
  }
}

// Clean up old jobs every hour
setInterval(cleanupOldJobs, 60 * 60 * 1000);

