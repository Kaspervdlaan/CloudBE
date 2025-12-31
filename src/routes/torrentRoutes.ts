import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  addTorrent,
  getDownloads,
  getDownload,
  pauseTorrent,
  resumeTorrent,
  removeTorrent,
  getStats,
} from '../controllers/torrentController';

const router = Router();

// All torrent routes require authentication
router.post('/add', authenticate, addTorrent);
router.get('/list', authenticate, getDownloads);
router.get('/stats', authenticate, getStats);
router.get('/:gid', authenticate, getDownload);
router.post('/:gid/pause', authenticate, pauseTorrent);
router.post('/:gid/resume', authenticate, resumeTorrent);
router.delete('/:gid', authenticate, removeTorrent);

export default router;

