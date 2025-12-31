import { Request, Response, NextFunction } from 'express';
import {
  addMagnetLink,
  getActiveDownloads,
  getWaitingDownloads,
  getStoppedDownloads,
  getDownloadStatus,
  pauseDownload,
  forcePauseDownload,
  resumeDownload,
  removeDownload,
  forceRemoveDownload,
  getGlobalStats,
} from '../utils/aria2';

/**
 * Add a torrent via magnet link
 */
export async function addTorrent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { magnetLink, savePath } = req.body as {
      magnetLink: string;
      savePath?: string;
    };

    if (!magnetLink || typeof magnetLink !== 'string') {
      res.status(400).json({
        error: { message: 'magnetLink is required', statusCode: 400 },
      });
      return;
    }

    if (!magnetLink.startsWith('magnet:')) {
      res.status(400).json({
        error: { message: 'Invalid magnet link. Must start with "magnet:"', statusCode: 400 },
      });
      return;
    }

    const result = await addMagnetLink(magnetLink, {
      savePath: savePath || '/data/movies',
    });

    res.json({
      data: {
        gid: result.gid,
        message: 'Torrent added successfully',
        magnetLink,
      },
    });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to add torrent',
        statusCode: 502,
      },
    });
  }
}

/**
 * Get all downloads (active, waiting, stopped)
 */
export async function getDownloads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.query as { status?: string };

    let downloads;

    switch (status) {
      case 'active':
        downloads = await getActiveDownloads();
        break;
      case 'waiting':
        downloads = await getWaitingDownloads();
        break;
      case 'stopped':
        downloads = await getStoppedDownloads();
        break;
      default:
        // Get all
        const [active, waiting, stopped] = await Promise.all([
          getActiveDownloads(),
          getWaitingDownloads(),
          getStoppedDownloads(),
        ]);
        downloads = {
          active,
          waiting,
          stopped,
        };
        break;
    }

    res.json({ data: downloads });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to get downloads',
        statusCode: 502,
      },
    });
  }
}

/**
 * Get download status by GID
 */
export async function getDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gid } = req.params;

    if (!gid) {
      res.status(400).json({
        error: { message: 'GID is required', statusCode: 400 },
      });
      return;
    }

    const download = await getDownloadStatus(gid);

    if (!download) {
      res.status(404).json({
        error: { message: 'Download not found', statusCode: 404 },
      });
      return;
    }

    res.json({ data: download });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to get download status',
        statusCode: 502,
      },
    });
  }
}

/**
 * Pause a download
 */
export async function pauseTorrent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gid } = req.params;
    const { force } = req.query as { force?: string };

    if (!gid) {
      res.status(400).json({
        error: { message: 'GID is required', statusCode: 400 },
      });
      return;
    }

    const result = force === 'true'
      ? await forcePauseDownload(gid)
      : await pauseDownload(gid);

    res.json({
      data: {
        gid: result,
        message: 'Download paused successfully',
      },
    });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to pause download',
        statusCode: 502,
      },
    });
  }
}

/**
 * Resume a download
 */
export async function resumeTorrent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gid } = req.params;

    if (!gid) {
      res.status(400).json({
        error: { message: 'GID is required', statusCode: 400 },
      });
      return;
    }

    const result = await resumeDownload(gid);

    res.json({
      data: {
        gid: result,
        message: 'Download resumed successfully',
      },
    });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to resume download',
        statusCode: 502,
      },
    });
  }
}

/**
 * Remove a download
 */
export async function removeTorrent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gid } = req.params;
    const { force } = req.query as { force?: string };

    if (!gid) {
      res.status(400).json({
        error: { message: 'GID is required', statusCode: 400 },
      });
      return;
    }

    const result = force === 'true'
      ? await forceRemoveDownload(gid)
      : await removeDownload(gid);

    res.json({
      data: {
        gid: result,
        message: 'Download removed successfully',
      },
    });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to remove download',
        statusCode: 502,
      },
    });
  }
}

/**
 * Get global statistics
 */
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getGlobalStats();
    res.json({ data: stats });
  } catch (error: any) {
    res.status(502).json({
      error: {
        message: error.message || 'Failed to get statistics',
        statusCode: 502,
      },
    });
  }
}

