import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { downloadVideo, getStatus, listJobs, stopJob, stopAllJobs } from '../controllers/youtubeController';

const router = Router();

// All YouTube routes require authentication
router.post('/download', authenticate, downloadVideo);
router.get('/list', authenticate, listJobs);
router.get('/status/:jobId', authenticate, getStatus);
router.post('/stop/:jobId', authenticate, stopJob);
router.post('/stop-all', authenticate, stopAllJobs);

export default router;


