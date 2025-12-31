// Script to stop all YouTube downloads
// Run with: docker compose exec api node /app/scripts/stop-all-youtube.js

const { stopAllDownloads } = require('../dist/utils/youtube');

try {
  const result = stopAllDownloads();
  console.log(`✅ Stopped ${result.stopped} download(s)`);
  if (result.jobs.length > 0) {
    console.log('Stopped job IDs:', result.jobs.join(', '));
  }
  process.exit(0);
} catch (error) {
  console.error('❌ Error stopping downloads:', error.message);
  process.exit(1);
}

