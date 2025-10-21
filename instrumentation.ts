/**
 * Next.js Instrumentation Hook
 * 
 * NOTE: In dev mode, WebSocket and OBS services run in a separate backend process
 * This avoids Next.js multi-process issues. See: server/backend.ts
 * 
 * In production, services can run here since Next.js uses a single process.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // Suppress noisy polling logs from Next.js dev server
      const filterStream = (original: any) => (chunk: any, ...args: any[]): boolean => {
        const message = chunk.toString();
        return message.includes('GET /api/obs/status') ? true : original(chunk, ...args);
      };
      
      process.stdout.write = filterStream(process.stdout.write.bind(process.stdout));
      process.stderr.write = filterStream(process.stderr.write.bind(process.stderr));
      
      console.log('✓ Next.js server started (dev mode)');
      console.log('  Run "pnpm run backend" in a separate terminal for WebSocket/OBS services');
    } else {
      // In production, initialize services here
      const { ServerInit } = await import('./lib/init/ServerInit');
      const serverInit = ServerInit.getInstance();
      
      if (!ServerInit.isInitialized()) {
        try {
          await serverInit.initialize();
          console.log('✓ Server initialized successfully (production)');
        } catch (error) {
          console.error('✗ Server initialization failed:', error);
        }
      }
    }
  }
}

