import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkOllamaHealth, chat, chatStream } from '../controllers/aiController';

const router = Router();

// Health check endpoint (no authentication required)
router.get('/health', checkOllamaHealth);

// Chat endpoint (authentication required)
router.post('/chat', authenticate, chat);

// Streaming chat endpoint (authentication required)
router.post('/chat/stream', authenticate, chatStream);

export default router;
