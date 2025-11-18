// IMPORTANT: Import Sentry instrumentation FIRST, before anything else
import './instrument';

// Load environment variables
import 'dotenv/config';

import { App } from './core/app';

async function bootstrap() {
  try {
    
    const app = new App();
    await app.start();
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await app.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await app.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();