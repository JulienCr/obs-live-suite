/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (before any requests)
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ServerInit } = await import('./lib/init/ServerInit');
    
    // Initialize server services on startup
    const serverInit = ServerInit.getInstance();
    
    if (!ServerInit.isInitialized()) {
      try {
        await serverInit.initialize();
        console.log('✓ Server initialized successfully');
      } catch (error) {
        console.error('✗ Server initialization failed:', error);
        // Don't throw - allow server to start even if OBS connection fails
      }
    }
  }
}

